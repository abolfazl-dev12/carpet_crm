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
      include: { order: true },
    });
    if (!installment) return NextResponse.json({ error: "قسط یافت نشد." }, { status: 404 });

    // Server-side RBAC: Sales reps can only manage installments of their own sales
    if (session.role === "SALES_REP" && installment.order.sellerId !== session.userId) {
      return NextResponse.json({ error: "عدم دسترسی برای ویرایش این قسط" }, { status: 403 });
    }

    // Atomic transaction for updating installment, order balances, and payment records
    const updated = await prisma.$transaction(async (tx) => {
      const updatedInst = await tx.installment.update({
        where: { id },
        data: {
          status,
          paidDate: status === "PAID" ? new Date() : null,
          paymentTracking: paymentTracking || null,
          chequeNumber: chequeNumber || null,
          notes: notes || null,
        },
      });

      // If status changed to PAID from another status, update order paid amount and create payment
      if (status === "PAID" && installment.status !== "PAID") {
        const newPaid = Math.min(
          installment.order.finalAmount,
          Math.round(installment.order.paidAmount + installment.amount)
        );
        const newRemaining = Math.max(0, Math.round(installment.order.finalAmount - newPaid));

        await tx.order.update({
          where: { id: installment.orderId },
          data: {
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newRemaining === 0 ? "PAID" : "CONFIRMED",
          },
        });

        await tx.payment.create({
          data: {
            orderId: installment.orderId,
            amount: Math.round(installment.amount),
            method: "CHEQUE",
            trackingNumber: paymentTracking || chequeNumber || `INST-${installment.installmentNumber}`,
            status: "CONFIRMED",
            notes: `وصول قسط شماره ${installment.installmentNumber}`,
          },
        });
      }

      return updatedInst;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "UPDATE",
      entity: "Installment",
      entityId: id,
      details: { status, installmentNumber: installment.installmentNumber },
    });

    return NextResponse.json({ success: true, installment: updated });
  } catch (error: any) {
    console.error("Error updating installment:", error);
    return NextResponse.json({ error: "خطا در ثبت وضعیت قسط" }, { status: 500 });
  }
}
