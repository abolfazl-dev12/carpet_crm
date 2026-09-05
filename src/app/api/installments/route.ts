import { NextRequest, NextResponse } from "next/server";
import { InstallmentStatus, type Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import {
  canAccessOwners,
  canMutateCrm,
  getOrderScope,
  isEnumValue,
} from "@/lib/authorization";
import { logAuditEvent } from "@/lib/audit";
import { installmentUpdateSchema } from "@/lib/validations/schemas";
import { lockOrderForMutation } from "@/lib/transaction-locks";

class InstallmentUpdateError extends Error {
  constructor(
    message: string,
    readonly status: 403 | 404
  ) {
    super(message);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause: Prisma.InstallmentWhereInput = {};
    if (status) {
      if (!isEnumValue(Object.values(InstallmentStatus), status)) {
        return NextResponse.json({ error: "وضعیت قسط نامعتبر است." }, { status: 400 });
      }
      whereClause.status = status;
    }

    // Server-side RBAC: Sales reps only see installments of their own orders
    if (session.role === "SALES_REP") {
      whereClause.order = getOrderScope(session);
    }

    const installments = await prisma.installment.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            customer: true,
            seller: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json({ installments });
  } catch (error: any) {
    console.error("Error fetching installments:", error);
    return NextResponse.json({ error: "خطا در دریافت دفترچه اقساط" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!canMutateCrm(session)) {
      return NextResponse.json({ error: "نقش فقط‌خواندنی مجاز به ویرایش قسط نیست." }, { status: 403 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = installmentUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات قسط نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, status, paymentTracking, chequeNumber, notes } = parsed.data;

    const installment = await prisma.installment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            payments: true,
            customer: { select: { assignedToId: true } },
          },
        },
      },
    });
    if (!installment) return NextResponse.json({ error: "قسط یافت نشد." }, { status: 404 });

    // Server-side RBAC: Sales reps can only manage installments of their own sales
    if (
      !canAccessOwners(session, [
        installment.order.sellerId,
        installment.order.customer.assignedToId,
      ])
    ) {
      return NextResponse.json({ error: "عدم دسترسی برای ویرایش این قسط" }, { status: 403 });
    }

    // Atomic transaction for updating installment, order balances, and ledger payments
    const updated = await prisma.$transaction(async (tx) => {
      // Every installment of this order shares the same lock, including reversals
      // and order deletion. Acquire it before reading installment/ledger state.
      if (!(await lockOrderForMutation(tx, installment.orderId))) {
        throw new InstallmentUpdateError("سفارش یافت نشد.", 404);
      }
      const txInst = await tx.installment.findFirst({
        where: {
          id,
          ...(session.role === "SALES_REP" ? { order: getOrderScope(session) } : {}),
        },
        include: { order: true },
      });

      if (!txInst) {
        throw new InstallmentUpdateError(
          session.role === "SALES_REP"
            ? "عدم دسترسی برای ویرایش این قسط"
            : "قسط یافت نشد.",
          session.role === "SALES_REP" ? 403 : 404
        );
      }

      const idempotencyTag = `INST-${txInst.orderId}-${txInst.installmentNumber}`;

      // 1. Transition: Non-PAID -> PAID
      if (status === "PAID" && txInst.status !== "PAID") {
        // Prevent duplicate payment record via database idempotencyKey constraint
        const existingPayment = await tx.payment.findUnique({
          where: { idempotencyKey: idempotencyTag },
        });

        if (!existingPayment) {
          await tx.payment.create({
            data: {
              idempotencyKey: idempotencyTag,
              orderId: txInst.orderId,
              amount: Math.round(txInst.amount),
              method: "CHEQUE",
              trackingNumber: paymentTracking || chequeNumber || idempotencyTag,
              status: "CONFIRMED",
              notes: `وصول قسط شماره ${txInst.installmentNumber} (چک: ${chequeNumber || "-"})`,
            },
          });
        }
      }

      // 2. Transition: PAID -> Non-PAID (Reversal / Correction)
      if (status !== "PAID" && txInst.status === "PAID") {
        await tx.payment.deleteMany({
          where: { idempotencyKey: idempotencyTag },
        });
      }

      // 3. Update the Installment record
      const updatedInst = await tx.installment.update({
        where: {
          id,
          ...(session.role === "SALES_REP" ? { order: getOrderScope(session) } : {}),
        },
        data: {
          status,
          paidDate: status === "PAID" ? (txInst.paidDate || new Date()) : null,
          paymentTracking: paymentTracking || null,
          chequeNumber: chequeNumber || null,
          notes: notes || null,
        },
      });

      // 4. Recalculate true Ledger-based Paid & Remaining Amount on Order
      const allConfirmedPayments = await tx.payment.findMany({
        where: { orderId: txInst.orderId, status: "CONFIRMED" },
      });

      const totalPaidSum = allConfirmedPayments.reduce((sum, p) => sum + Math.round(p.amount), 0);
      const cappedPaid = Math.min(txInst.order.finalAmount, Math.max(0, totalPaidSum));
      const newRemaining = Math.max(0, Math.round(txInst.order.finalAmount - cappedPaid));

      await tx.order.update({
        where: { id: txInst.orderId },
        data: {
          paidAmount: cappedPaid,
          remainingAmount: newRemaining,
          status: newRemaining === 0 ? "PAID" : "CONFIRMED",
        },
      });

      return updatedInst;
    }, { maxWait: 30_000, timeout: 60_000 });

    await logAuditEvent({
      userId: session.userId,
      action: "UPDATE",
      entity: "Installment",
      entityId: id,
      details: {
        status,
        installmentNumber: installment.installmentNumber,
        orderId: installment.orderId,
      },
    });

    return NextResponse.json({ success: true, installment: updated });
  } catch (error: unknown) {
    if (error instanceof InstallmentUpdateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating installment:", error);
    return NextResponse.json({ error: "خطا در ثبت وضعیت قسط" }, { status: 500 });
  }
}
