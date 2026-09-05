import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { hasAllowedRole, MANAGEMENT_ROLES } from "@/lib/authorization";
import { logAuditEvent } from "@/lib/audit";
import { inventoryMovementSchema } from "@/lib/validations/schemas";

const INVENTORY_TRANSACTION_OPTIONS = { maxWait: 30_000, timeout: 30_000 } as const;

function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const variants = await prisma.productVariant.findMany({
      include: {
        product: true,
        inventoryLogs: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { stock: "asc" },
    });

    const movements = await prisma.inventoryMovement.findMany({
      include: {
        variant: { include: { product: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ variants, movements });
  } catch (error: unknown) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "خطا در دریافت موجودی انبار" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!hasAllowedRole(session, MANAGEMENT_ROLES)) {
      return NextResponse.json({ error: "عدم دسترسی به عملیات انبار" }, { status: 403 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = inventoryMovementSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات گردش انبار نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { variantId, type, quantity, reason } = parsed.data;
    const qty = Math.max(1, Math.round(quantity));

    // Execute entire read-validate-update-movement sequence strictly inside atomic transaction
    const { updatedVariant, movement, sku } = await prisma.$transaction(async (tx) => {
      // 1. Read the variant inside the transaction. The mutation below uses an
      // optimistic compare-and-swap so a concurrent writer cannot overwrite it.
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        throw new Error("NOT_FOUND");
      }

      const availableStock = variant.stock - (variant.reservedStock || 0);

      // 2. Strict validation guards inside transaction boundary
      if (type === "SALE") {
        if (qty > availableStock) {
          throw new Error("INSUFFICIENT_AVAILABLE_STOCK");
        }
      } else if (type === "RESERVATION") {
        if (qty > availableStock) {
          throw new Error("INSUFFICIENT_FOR_RESERVATION");
        }
      } else if (type === "RELEASE_RESERVATION") {
        if (qty > (variant.reservedStock || 0)) {
          throw new Error("EXCEEDS_RESERVED_STOCK");
        }
      }

      let newStock = variant.stock;
      let newReserved = variant.reservedStock || 0;
      let newSold = variant.soldStock || 0;

      if (type === "PURCHASE" || type === "RETURN") {
        newStock += qty;
      } else if (type === "SALE") {
        newStock -= qty;
        newSold += qty;
      } else if (type === "RESERVATION") {
        newReserved += qty;
      } else if (type === "RELEASE_RESERVATION") {
        newReserved -= qty;
      } else if (type === "ADJUSTMENT") {
        newStock = qty;
      }

      if (newStock < 0 || newReserved < 0) {
        throw new Error("NEGATIVE_STOCK_DISALLOWED");
      }

      // 3. Atomic stock mutation
      const updatedCount = await tx.productVariant.updateMany({
        where: {
          id: variantId,
          stock: variant.stock,
          reservedStock: variant.reservedStock,
          soldStock: variant.soldStock,
        },
        data: {
          stock: newStock,
          reservedStock: newReserved,
          soldStock: newSold,
        },
      });

      if (updatedCount.count !== 1) {
        throw new Error("CONCURRENT_INVENTORY_CHANGE");
      }

      const updated = await tx.productVariant.findUniqueOrThrow({
        where: { id: variantId },
      });

      if (updated.stock < 0 || updated.reservedStock < 0) {
        throw new Error("NEGATIVE_STOCK_DISALLOWED");
      }

      // 4. Atomic movement recording
      const mov = await tx.inventoryMovement.create({
        data: {
          variantId,
          type,
          quantity: qty,
          previousStock: variant.stock,
          newStock: updated.stock,
          reason,
          userId: session.userId,
        },
      });

      return { updatedVariant: updated, movement: mov, sku: variant.sku };
    }, INVENTORY_TRANSACTION_OPTIONS);

    await logAuditEvent({
      userId: session.userId,
      action: "UPDATE",
      entity: "InventoryMovement",
      entityId: movement.id,
      details: { sku, type, quantity: qty, newStock: updatedVariant.stock },
    });

    return NextResponse.json({ success: true, variant: updatedVariant, movement });
  } catch (error: unknown) {
    const message = errorMessage(error);
    console.error("Error in inventory movement:", error);
    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "کالای انبار یافت نشد." }, { status: 404 });
    }
    if (message === "INSUFFICIENT_AVAILABLE_STOCK") {
      return NextResponse.json(
        { error: "موجودی آزاد کافی برای ثبت این فروش وجود ندارد." },
        { status: 400 }
      );
    }
    if (message === "INSUFFICIENT_FOR_RESERVATION") {
      return NextResponse.json(
        { error: "موجودی آزاد کافی برای رزرو این کالا وجود ندارد." },
        { status: 400 }
      );
    }
    if (message === "EXCEEDS_RESERVED_STOCK") {
      return NextResponse.json(
        { error: "تعداد آزادسازی بیشتر از موجودی رزرو شده است." },
        { status: 400 }
      );
    }
    if (message === "NEGATIVE_STOCK_DISALLOWED") {
      return NextResponse.json(
        { error: "خطای محاسباتی انبار: موجودی منفی غیرمجاز است." },
        { status: 400 }
      );
    }
    if (message === "CONCURRENT_INVENTORY_CHANGE") {
      return NextResponse.json(
        { error: "موجودی کالا هم‌زمان تغییر کرده است؛ دوباره تلاش کنید." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "خطا در ثبت گردش انبار" }, { status: 500 });
  }
}
