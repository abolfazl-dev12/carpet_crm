import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { inventoryMovementSchema } from "@/lib/validations/schemas";

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
  } catch (error: any) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "خطا در دریافت موجودی انبار" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SALES_MANAGER")) {
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

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return NextResponse.json({ error: "کالای انبار یافت نشد." }, { status: 404 });

    const qty = Math.max(1, Math.round(quantity));
    let newStock = variant.stock;
    let newReserved = variant.reservedStock;
    let newSold = variant.soldStock;

    if (type === "PURCHASE" || type === "RETURN") {
      newStock += qty;
    } else if (type === "SALE") {
      newStock = Math.max(0, newStock - qty);
      newSold += qty;
      if (newReserved > 0) newReserved = Math.max(0, newReserved - qty);
    } else if (type === "RESERVATION") {
      newReserved += qty;
    } else if (type === "RELEASE_RESERVATION") {
      newReserved = Math.max(0, newReserved - qty);
    } else if (type === "ADJUSTMENT") {
      newStock = qty;
    }

    // Atomic transaction for updating variant stock and creating movement log
    const { updatedVariant, movement } = await prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          stock: newStock,
          reservedStock: newReserved,
          soldStock: newSold,
        },
      });

      const mov = await tx.inventoryMovement.create({
        data: {
          variantId,
          type,
          quantity: qty,
          previousStock: variant.stock,
          newStock,
          reason,
          userId: session.userId,
        },
      });

      return { updatedVariant: updated, movement: mov };
    });

    await logAuditEvent({
      userId: session.userId,
      action: "UPDATE",
      entity: "InventoryMovement",
      entityId: movement.id,
      details: { sku: variant.sku, type, quantity: qty, newStock },
    });

    return NextResponse.json({ success: true, variant: updatedVariant, movement });
  } catch (error: any) {
    console.error("Error in inventory movement:", error);
    return NextResponse.json({ error: "خطا در ثبت گردش انبار" }, { status: 500 });
  }
}
