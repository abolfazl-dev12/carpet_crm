import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { installmentUpdateSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause: any = {};
    if (status) whereClause.status = status;

    // Server-side RBAC: Sales reps only see installments of their own orders
    if (session.role === "SALES_REP") {
      whereClause.order = { sellerId: session.userId };
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
      include: { order: { include: { payments: true } } },
    });
    if (!installment) return NextResponse.json({ error: "قسط یافت نشد." }, { status: 404 });

    // Server-side RBAC: Sales reps can only manage installments of their own sales
    if (session.role === "SALES_REP" && installment.order.sellerId !== session.userId) {
      return NextResponse.json({ error: "عدم دسترسی برای ویرایش این قسط" }, { status: 403 });
    }

    const trackingTag = `INST-${installment.orderId}-${installment.installmentNumber}`;

    // Atomic transaction for updating installment, order balances, and ledger payments
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Transition: Non-PAID -> PAID
      if (status === "PAID" && installment.status !== "PAID") {
        // Prevent duplicate payment record if already recorded
        const existingPayment = await tx.payment.findFirst({
          where: { orderId: installment.orderId, trackingNumber: trackingTag },
        });

        if (!existingPayment) {
          await tx.payment.create({
            data: {
              orderId: installment.orderId,
              amount: Math.round(installment.amount),
              method: "CHEQUE",
              trackingNumber: trackingTag,
              status: "CONFIRMED",
              notes: `وصول قسط شماره ${installment.installmentNumber} (چک: ${chequeNumber || "-"})`,
            },
          });
        }
      }

      // 2. Transition: PAID -> Non-PAID (Reversal / Correction)
      if (status !== "PAID" && installment.status === "PAID") {
        await tx.payment.deleteMany({
          where: { orderId: installment.orderId, trackingNumber: trackingTag },
        });
      }

      // 3. Update the Installment record
      const updatedInst = await tx.installment.update({
        where: { id },
        data: {
          status,
          paidDate: status === "PAID" ? (installment.paidDate || new Date()) : null,
          paymentTracking: paymentTracking || null,
          chequeNumber: chequeNumber || null,
          notes: notes || null,
        },
      });

      // 4. Recalculate true Ledger-based Paid & Remaining Amount on Order
      const allConfirmedPayments = await tx.payment.findMany({
        where: { orderId: installment.orderId, status: "CONFIRMED" },
      });

      const totalPaidSum = allConfirmedPayments.reduce((sum, p) => sum + Math.round(p.amount), 0);
      const cappedPaid = Math.min(installment.order.finalAmount, Math.max(0, totalPaidSum));
      const newRemaining = Math.max(0, Math.round(installment.order.finalAmount - cappedPaid));

      await tx.order.update({
        where: { id: installment.orderId },
        data: {
          paidAmount: cappedPaid,
          remainingAmount: newRemaining,
          status: newRemaining === 0 ? "PAID" : "CONFIRMED",
        },
      });

      return updatedInst;
    });

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
  } catch (error: any) {
    console.error("Error updating installment:", error);
    return NextResponse.json({ error: "خطا در ثبت وضعیت قسط" }, { status: 500 });
  }
}
