import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import {
  canAccessOwners,
  canMutateCrm,
  getCustomerScope,
  getOrderScope,
} from "@/lib/authorization";
import { logAuditEvent } from "@/lib/audit";
import { orderCreateSchema } from "@/lib/validations/schemas";
import { generateOrderNumber } from "@/lib/generators";
import { addJalaliMonths } from "@/lib/persian";
import { lockOrderForMutation, lockVariantForMutation } from "@/lib/transaction-locks";

class OrderCreationError extends Error {}
class OrderCreationAuthorizationError extends Error {}

const PRISMA_INT_MAX = 2_147_483_647;
const WRITE_TRANSACTION_OPTIONS = { maxWait: 30_000, timeout: 60_000 } as const;

interface PricedOrderItem {
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reservedStock: number;
}

function calculateServerDiscount(): number {
  // No trusted promotion or discount policy exists yet. Client-provided discounts are forbidden.
  return 0;
}

function calculateLineTotal(unitPrice: number, quantity: number): number {
  if (!Number.isSafeInteger(unitPrice) || unitPrice <= 0) {
    throw new OrderCreationError("قیمت ثبت‌شده برای یکی از کالاها معتبر نیست.");
  }

  const lineTotal = unitPrice * quantity;
  if (!Number.isSafeInteger(lineTotal) || lineTotal > PRISMA_INT_MAX) {
    throw new OrderCreationError("مبلغ یکی از اقلام سفارش از محدوده مجاز خارج است.");
  }

  return lineTotal;
}

function addMoney(currentTotal: number, amount: number): number {
  const newTotal = currentTotal + amount;
  if (!Number.isSafeInteger(newTotal) || newTotal > PRISMA_INT_MAX) {
    throw new OrderCreationError("مبلغ کل سفارش از محدوده مجاز خارج است.");
  }
  return newTotal;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repId = searchParams.get("repId");

    const whereClause: Prisma.OrderWhereInput = getOrderScope(session);
    // Server-side RBAC: Sales reps only see their own sales
    if (session.role !== "SALES_REP" && repId) {
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
    if (!canMutateCrm(session)) {
      return NextResponse.json({ error: "نقش فقط‌خواندنی مجاز به ثبت سفارش نیست." }, { status: 403 });
    }

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
      paymentMethod,
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

    if (!canAccessOwners(session, [customer.assignedToId])) {
      return NextResponse.json(
        { error: "عدم دسترسی برای ثبت سفارش برای این مشتری." },
        { status: 403 }
      );
    }

    // Atomically execute: authoritative pricing, stock validation, order creation,
    // inventory deduction, movement logging, and installment generation.
    const order = await prisma.$transaction(async (tx) => {
      // Re-check customer ownership inside the same transaction as the write so a
      // concurrent reassignment cannot bypass the sales-rep ownership boundary.
      const authorizedCustomer = await tx.customer.findFirst({
        where: { id: customerId, ...getCustomerScope(session) },
        select: { id: true },
      });
      if (!authorizedCustomer) {
        if (session.role === "SALES_REP") {
          throw new OrderCreationAuthorizationError(
            "عدم دسترسی برای ثبت سفارش برای این مشتری."
          );
        }
        throw new OrderCreationError("مشتری مورد نظر دیگر در دسترس نیست.");
      }

      // 1. Load authoritative variant prices and availability inside the transaction.
      const variants = await tx.productVariant.findMany({
        where: { id: { in: items.map((item) => item.variantId) } },
        include: { product: true },
      });
      const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
      const pricedItems: PricedOrderItem[] = [];

      for (const item of items) {
        const variant = variantsById.get(item.variantId);

        if (!variant) {
          throw new OrderCreationError("یکی از تنوع‌های انتخاب‌شده معتبر نیست.");
        }

        if (!variant.isActive || !variant.product.isActive) {
          throw new OrderCreationError("یکی از تنوع‌های انتخاب‌شده غیرفعال است.");
        }

        if (
          !Number.isSafeInteger(variant.stock) ||
          !Number.isSafeInteger(variant.reservedStock) ||
          variant.stock < 0 ||
          variant.reservedStock < 0 ||
          variant.reservedStock > variant.stock
        ) {
          throw new OrderCreationError("وضعیت موجودی یکی از کالاها معتبر نیست.");
        }

        const availableStock = variant.stock - (variant.reservedStock || 0);
        if (item.quantity > availableStock) {
          throw new OrderCreationError(
            `موجودی کافی برای ثبت این سفارش وجود ندارد. کالا: "${variant.product.name} (${variant.size})"، موجودی آزاد: ${availableStock} تخته، تعداد درخواستی: ${item.quantity} تخته`
          );
        }

        const unitPrice =
          paymentMethod === "INSTALLMENT" ? variant.installmentPrice : variant.cashPrice;

        pricedItems.push({
          variantId: variant.id,
          quantity: item.quantity,
          unitPrice,
          totalPrice: calculateLineTotal(unitPrice, item.quantity),
          reservedStock: variant.reservedStock,
        });
      }

      // 2. Calculate every persisted financial value from server-owned data.
      const totalAmount = pricedItems.reduce(
        (sum, item) => addMoney(sum, item.totalPrice),
        0
      );
      const discountAmount = calculateServerDiscount();
      const finalAmount = totalAmount - discountAmount;
      const paidAmount = 0;
      const remainingAmount = finalAmount;

      // 3. Generate unique order number.
      const orderNumber = await generateOrderNumber(tx);

      // 4. Persist the authoritative price snapshot on the order and its items.
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          sellerId: session.userId,
          totalAmount,
          discountAmount,
          finalAmount,
          paymentMethod,
          paidAmount,
          remainingAmount,
          status: remainingAmount === 0 ? "PAID" : "CONFIRMED",
          shippingAddress: shippingAddress || null,
          notes: notes || null,
          items: {
            create: pricedItems.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: { items: true, customer: true },
      });

      // 5. Atomically deduct stock and record inventory movements.
      for (const item of pricedItems) {
        const updatedCount = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            isActive: true,
            reservedStock: item.reservedStock,
            stock: { gte: item.reservedStock + item.quantity },
            product: { is: { isActive: true } },
          },
          data: {
            stock: { decrement: item.quantity },
            soldStock: { increment: item.quantity },
          },
        });

        if (updatedCount.count !== 1) {
          throw new OrderCreationError("موجودی کالا هم‌زمان تغییر کرده است؛ سفارش را دوباره بررسی کنید.");
        }

        const updatedVariant = await tx.productVariant.findUniqueOrThrow({
          where: { id: item.variantId },
        });

        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            type: "SALE",
            quantity: item.quantity,
            previousStock: updatedVariant.stock + item.quantity,
            newStock: updatedVariant.stock,
            reason: `فروش قطعی در فاکتور شماره ${orderNumber}`,
            userId: session.userId,
          },
        });
      }

      // 6. Generate the installment schedule from the server-calculated balance.
      if (paymentMethod === "INSTALLMENT" && installmentCount > 0 && remainingAmount > 0) {
        const count = installmentCount;
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
    }, WRITE_TRANSACTION_OPTIONS);

    await logAuditEvent({
      userId: session.userId,
      action: "CREATE",
      entity: "Order",
      entityId: order.id,
      details: { orderNumber: order.orderNumber, finalAmount: order.finalAmount },
    });

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    if (error instanceof OrderCreationAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof OrderCreationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "خطا در ثبت سفارش فرش" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    }

    if (session.role !== "ADMIN" && session.role !== "SALES_MANAGER") {
      return NextResponse.json({ error: "عدم دسترسی کافی برای حذف سفارش" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "شناسه سفارش الزامی است." }, { status: 400 });
    }

    // 1. Initial lookup to check existence and financial invariants
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { variant: true } },
        payments: true,
        installments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "سفارش مورد نظر یافت نشد." }, { status: 404 });
    }

    // Guard: Prevent deletion of paid, completed, or orders with confirmed payments / paid installments
    const hasConfirmedPayments = order.payments.length > 0;
    const hasPaidInstallments = order.installments.some((inst) => inst.status === "PAID");
    const isSettledStatus = order.status === "PAID" || order.status === "COMPLETED" || order.paidAmount > 0;

    if (hasConfirmedPayments || hasPaidInstallments || isSettledStatus) {
      return NextResponse.json(
        {
          error:
            "این سفارش دارای سوابق مالی است و امکان حذف مستقیم آن وجود ندارد. ابتدا سفارش را لغو یا اصلاح کنید.",
        },
        { status: 400 }
      );
    }

    // 2. Atomic transaction: Restore inventory stock, log RETURN movement, and delete order
    await prisma.$transaction(async (tx) => {
      // Serialize duplicate deletion and payments before reading financial state.
      if (!(await lockOrderForMutation(tx, id))) throw new Error("ORDER_NOT_FOUND");
      // Re-verify order inside transaction boundary
      const txOrder = await tx.order.findUnique({
        where: { id },
        include: {
          items: true,
          payments: true,
          installments: true,
        },
      });

      if (!txOrder) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (
        txOrder.status === "PAID" ||
        txOrder.status === "COMPLETED" ||
        txOrder.paidAmount > 0 ||
        txOrder.payments.length > 0 ||
        txOrder.installments.some((inst) => inst.status === "PAID")
      ) {
        throw new Error("PAID_ORDER_CANNOT_BE_DELETED");
      }

      // Restore inventory for each item
      for (const item of [...txOrder.items].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
        // Lock before reading: another order may restore this same variant.
        if (!(await lockVariantForMutation(tx, item.variantId))) {
          throw new Error("VARIANT_NOT_FOUND");
        }
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant) {
          throw new Error(`کالای انبار با شناسه ${item.variantId} یافت نشد.`);
        }

        const restoredQty = item.quantity;
        const previousStock = variant.stock;
        const newStock = previousStock + restoredQty;
        const newSoldStock = Math.max(0, variant.soldStock - restoredQty);

        const updatedVariant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: newStock,
            soldStock: newSoldStock,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            type: "RETURN",
            quantity: restoredQty,
            previousStock: previousStock,
            newStock: updatedVariant.stock,
            reason: `برگشت موجودی به دلیل ابطال/حذف سفارش شماره ${txOrder.orderNumber}`,
            userId: session.userId,
          },
        });
      }

      // Log comprehensive audit event atomically inside the transaction boundary
      await logAuditEvent(
        {
          userId: session.userId,
          action: "DELETE",
          entity: "Order",
          entityId: id,
          details: {
            orderNumber: txOrder.orderNumber,
            finalAmount: txOrder.finalAmount,
            restoredItemsCount: txOrder.items.length,
            totalRestoredQuantity: txOrder.items.reduce((sum, it) => sum + it.quantity, 0),
          },
        },
        tx
      );

      // Delete order (cascades unpaid items and empty pending installments)
      await tx.order.delete({
        where: { id },
      });
    }, WRITE_TRANSACTION_OPTIONS);

    return NextResponse.json({
      success: true,
      message: "سفارش با موفقیت حذف و موجودی اقلام به انبار بازگردانده شد.",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : undefined;
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : undefined;

    if (errorMessage === "ORDER_NOT_FOUND" || errorCode === "P2025") {
      return NextResponse.json({ error: "سفارش مورد نظر یافت نشد." }, { status: 404 });
    }
    if (errorMessage === "PAID_ORDER_CANNOT_BE_DELETED") {
      return NextResponse.json(
        {
          error:
            "این سفارش دارای سوابق مالی است و امکان حذف مستقیم آن وجود ندارد. ابتدا سفارش را لغو یا اصلاح کنید.",
        },
        { status: 400 }
      );
    }
    console.error("Error deleting order:", error);
    return NextResponse.json({ error: "خطا در حذف سفارش و بازگردانی انبار" }, { status: 500 });
  }
}
