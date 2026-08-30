import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { orderCreateSchema } from "@/lib/validations/schemas";
import { generateOrderNumber } from "@/lib/generators";
import { addJalaliMonths } from "@/lib/persian";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repId = searchParams.get("repId");

    const whereClause: any = {};
    // Server-side RBAC: Sales reps only see their own sales
    if (session.role === "SALES_REP") {
      whereClause.sellerId = session.userId;
    } else if (repId) {
      whereClause.sellerId = repId;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        seller: { select: { id: true, name: true } },
        items: {
          include: {
            variant: { include: { product: true } },
          },
        },
        payments: true,
        installments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "خطا در دریافت لیست سفارشات" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const rawBody = await req.json().catch(() => null);
    const parsed = orderCreateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات سفارش نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      customerId,
      items,
      discountAmount,
      paymentMethod,
      initialPaidAmount,
      installmentCount,
      shippingAddress,
      notes,
    } = parsed.data;

    // Verify customer exists and check sales rep ownership
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: "مشتری مورد نظر یافت نشد." }, { status: 404 });
    }

    if (session.role === "SALES_REP" && customer.assignedToId !== session.userId) {
      return NextResponse.json(
        { error: "عدم دسترسی برای ثبت سفارش برای این مشتری." },
        { status: 403 }
      );
    }

    // Precise financial calculations (integer Tomans)
    const cleanDiscount = Math.max(0, Math.round(discountAmount || 0));
    const totalAmount = items.reduce(
      (sum, it) => sum + Math.round(Number(it.unitPrice)) * Math.max(1, Math.round(Number(it.quantity))),
      0
    );
    const finalAmount = Math.max(0, totalAmount - cleanDiscount);
    const paidAmount = Math.min(finalAmount, Math.max(0, Math.round(initialPaidAmount || 0)));
    const remainingAmount = Math.max(0, finalAmount - paidAmount);

    // Atomically execute: stock validation, order creation, inventory deduction, movement logging, payment, installments
    const order = await prisma.$transaction(async (tx) => {
      // 1. Stock Validation & Race-condition check inside transaction
      const variantStockSnapshots: Record<string, { currentStock: number; requestedQty: number; name: string; size: string }> = {};

      for (const item of items) {
        const qty = Math.max(1, Math.round(Number(item.quantity)));
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });

        if (!variant) {
          throw new Error("یکی از کالاهای انتخاب‌شده در انبار یافت نشد.");
        }

        const availableStock = variant.stock - (variant.reservedStock || 0);
        if (qty > availableStock) {
          throw new Error(
            `موجودی کافی برای ثبت این سفارش وجود ندارد. کالا: "${variant.product.name} (${variant.size})"، موجودی آزاد: ${availableStock} تخته، تعداد درخواستی: ${qty} تخته`
          );
        }

        variantStockSnapshots[item.variantId] = {
          currentStock: variant.stock,
          requestedQty: qty,
          name: variant.product.name,
          size: variant.size,
        };
      }

      // 2. Generate unique order number
      const orderNumber = await generateOrderNumber(tx);

      // 3. Create Order and OrderItems
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          sellerId: session.userId,
          totalAmount,
          discountAmount: cleanDiscount,
          finalAmount,
          paymentMethod,
          paidAmount,
          remainingAmount,
          status: remainingAmount === 0 ? "PAID" : "CONFIRMED",
          shippingAddress: shippingAddress || null,
          notes: notes || null,
          items: {
            create: items.map((it) => ({
              variantId: it.variantId,
              quantity: Math.max(1, Math.round(Number(it.quantity))),
              unitPrice: Math.round(Number(it.unitPrice)),
              totalPrice: Math.round(Number(it.unitPrice)) * Math.max(1, Math.round(Number(it.quantity))),
            })),
          },
        },
        include: { items: true, customer: true },
      });

      // 4. Atomically Deduct Stock and Record Inventory Movements (Auditability)
      for (const item of items) {
        const qty = Math.max(1, Math.round(Number(item.quantity)));
        const snapshot = variantStockSnapshots[item.variantId];

        const updatedVariant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: { decrement: qty },
            soldStock: { increment: qty },
          },
        });

        if (updatedVariant.stock < 0) {
          throw new Error("خطای همزمانی در انبار: موجودی منفی شد.");
        }

        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            type: "SALE",
            quantity: qty,
            previousStock: snapshot.currentStock,
            newStock: updatedVariant.stock,
            reason: `فروش قطعی در فاکتور شماره ${orderNumber}`,
            userId: session.userId,
          },
        });
      }

      // 5. Record initial payment if provided
      if (paidAmount > 0) {
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            amount: paidAmount,
            method: paymentMethod === "INSTALLMENT" ? "POS" : paymentMethod,
            trackingNumber: `PAY-${Date.now().toString().slice(-6)}`,
            status: "CONFIRMED",
            notes: paymentMethod === "INSTALLMENT" ? "پیش‌پرداخت سفارش اقساطی" : "تسویه فاکتور",
          },
        });
      }

      // 6. Generate precise installments schedule with Jalali calendar months
      if (paymentMethod === "INSTALLMENT" && installmentCount > 0 && remainingAmount > 0) {
        const count = Math.max(1, Math.round(installmentCount));
        const basePerInstallment = Math.floor(remainingAmount / count);
        const remainder = remainingAmount - basePerInstallment * count;
        const now = new Date();

        for (let i = 1; i <= count; i++) {
          const amount = i === count ? basePerInstallment + remainder : basePerInstallment;
          const dueDate = addJalaliMonths(now, i);

          await tx.installment.create({
            data: {
              orderId: createdOrder.id,
              installmentNumber: i,
              amount,
              dueDate,
              status: "PENDING",
              notes: `قسط شماره ${i} فاکتور ${createdOrder.orderNumber}`,
            },
          });
        }
      }

      return createdOrder;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "CREATE",
      entity: "Order",
      entityId: order.id,
      details: { orderNumber: order.orderNumber, finalAmount: order.finalAmount },
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Error creating order:", error);
    const errorMessage = error?.message || "خطا در ثبت سفارش فرش";
    return NextResponse.json(
      { error: errorMessage.includes("موجودی") || errorMessage.includes("همزمانی") ? errorMessage : "خطا در ثبت سفارش فرش" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SALES_MANAGER")) {
      return NextResponse.json({ error: "عدم دسترسی کافی برای حذف سفارش" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });
    }

    await prisma.order.delete({
      where: { id },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "DELETE",
      entity: "Order",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting order:", error);
    return NextResponse.json({ error: "خطا در حذف سفارش" }, { status: 500 });
  }
}
