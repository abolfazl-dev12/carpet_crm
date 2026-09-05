import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import {
  ADMIN_ROLES,
  hasAllowedRole,
  MANAGEMENT_ROLES,
} from "@/lib/authorization";
import { logAuditEvent } from "@/lib/audit";
import { productCreateSchema, productUpdateSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const collection = searchParams.get("collection")?.trim() || "";
    const shane = searchParams.get("shane")?.trim() || "";
    const style = searchParams.get("style")?.trim() || "";
    const primaryColor = searchParams.get("primaryColor")?.trim() || "";

    const whereClause: Prisma.ProductWhereInput = { isActive: true };

    if (collection) whereClause.collection = { contains: collection };
    if (shane) whereClause.shane = parseInt(shane, 10);
    if (style) whereClause.style = style;
    if (primaryColor) whereClause.primaryColor = { contains: primaryColor };

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { pattern: { contains: search } },
        { collection: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { areaSquareMeters: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "خطا در دریافت کاتالوگ فرش‌ها" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!hasAllowedRole(session, MANAGEMENT_ROLES)) {
      return NextResponse.json({ error: "عدم دسترسی کافی برای ایجاد محصول" }, { status: 403 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = productCreateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات فرش نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      code,
      name,
      pattern,
      collection,
      shane,
      density,
      colorCount,
      yarnMaterial,
      weavingMachine,
      style,
      primaryColor,
      images,
      description,
      variants = [],
    } = parsed.data;

    const defaultVariants =
      variants.length > 0
        ? variants
        : [
            { size: "3x4", areaSquareMeters: 12, cashPrice: 42000000, stock: 5 },
            { size: "2.5x3.5", areaSquareMeters: 8.75, cashPrice: 32000000, stock: 4 },
            { size: "2x3", areaSquareMeters: 6, cashPrice: 21000000, stock: 6 },
          ];

    const product = await prisma.product.create({
      data: {
        code,
        name,
        pattern,
        collection,
        shane: Math.round(shane),
        density: Math.round(density),
        colorCount: Math.round(colorCount || 8),
        yarnMaterial: yarnMaterial || "۱۰۰٪ اکریلیک هیت‌ست شده",
        weavingMachine: weavingMachine || "وندویل بلژیک",
        style: style || "کلاسیک",
        primaryColor: primaryColor || "سرمه‌ای",
        images: images || [],
        description: description || null,
        variants: {
          create: defaultVariants.map((v) => ({
            sku: `${code}-${v.size.toUpperCase().replace(/\./g, "_")}`,
            size: v.size,
            areaSquareMeters: v.areaSquareMeters || 12,
            cashPrice: Math.round(v.cashPrice),
            installmentPrice: Math.round(v.installmentPrice || v.cashPrice * 1.15),
            stock: Math.max(0, Math.round(v.stock || 0)),
            reservedStock: 0,
            soldStock: 0,
          })),
        },
      },
      include: { variants: true },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "CREATE",
      entity: "Product",
      entityId: product.id,
      details: { code: product.code, name: product.name },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "خطا در ثبت فرش در کاتالوگ" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!hasAllowedRole(session, MANAGEMENT_ROLES)) {
      return NextResponse.json({ error: "عدم دسترسی کافی برای ویرایش محصول" }, { status: 403 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = productUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات ارسالی نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      id,
      code,
      name,
      pattern,
      collection,
      shane,
      density,
      yarnMaterial,
      weavingMachine,
      style,
      primaryColor,
      description,
    } = parsed.data;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        code,
        name,
        pattern: pattern || undefined,
        collection: collection || undefined,
        shane: shane ? Math.round(shane) : undefined,
        density: density ? Math.round(density) : undefined,
        yarnMaterial: yarnMaterial || undefined,
        weavingMachine: weavingMachine || undefined,
        style: style || undefined,
        primaryColor: primaryColor || undefined,
        description: description !== undefined ? description : undefined,
      },
      include: { variants: true },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "UPDATE",
      entity: "Product",
      entityId: id,
      details: { name: updatedProduct.name, code: updatedProduct.code },
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "خطا در ویرایش اطلاعات فرش" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!hasAllowedRole(session, ADMIN_ROLES)) {
      return NextResponse.json({ error: "فقط مدیر ارشد مجاز به حذف فرش از سیستم است." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "شناسه فرش الزامی است." }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "DELETE",
      entity: "Product",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "خطا در حذف فرش از سیستم" }, { status: 500 });
  }
}
