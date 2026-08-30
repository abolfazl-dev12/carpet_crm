import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { customerUpdateSchema } from "@/lib/validations/schemas";
import { normalizeIranianPhone, isValidIranianMobile } from "@/lib/persian";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        needProfiles: true,
        assignedTo: { select: { id: true, name: true, phone: true, avatar: true } },
        deals: { include: { product: true, variant: true } },
        orders: {
          include: {
            items: { include: { variant: { include: { product: true } } } },
            payments: true,
            installments: true,
          },
          orderBy: { createdAt: "desc" },
        },
        followUps: { orderBy: { scheduledAt: "desc" } },
        leads: true,
      },
    });

    if (!customer) return NextResponse.json({ error: "مشتری یافت نشد" }, { status: 404 });

    // Server-side RBAC: Sales Reps can only view their own assigned customers
    if (session.role === "SALES_REP" && customer.assignedToId !== session.userId) {
      return NextResponse.json({ error: "عدم دسترسی به این پرونده مشتری" }, { status: 403 });
    }

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error("Error fetching customer:", error);
    return NextResponse.json({ error: "خطا در دریافت پروفایل مشتری" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { id } = await params;
    const rawBody = await req.json().catch(() => null);
    const parsed = customerUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات ارسالی نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const currentCustomer = await prisma.customer.findUnique({ where: { id } });
    if (!currentCustomer) {
      return NextResponse.json({ error: "مشتری یافت نشد." }, { status: 404 });
    }

    // Server-side RBAC: Sales reps can only update their own customers and cannot reassign
    if (session.role === "SALES_REP") {
      if (currentCustomer.assignedToId !== session.userId) {
        return NextResponse.json({ error: "عدم دسترسی برای ویرایش این مشتری" }, { status: 403 });
      }
    }

    const {
      firstName,
      lastName,
      phone,
      secondPhone,
      province,
      city,
      address,
      postalCode,
      notes,
      assignedToId,
      preferredSizes,
      preferredShane,
      preferredDensity,
      preferredColors,
      preferredStyle,
      preferredCollection,
      budgetMin,
      budgetMax,
      quantity,
      paymentPreference,
      spaceType,
    } = parsed.data;

    let cleanPhone = undefined;
    if (phone) {
      cleanPhone = normalizeIranianPhone(phone);
      if (!isValidIranianMobile(cleanPhone)) {
        return NextResponse.json({ error: "شماره همراه وارد شده نامعتبر است." }, { status: 400 });
      }
    }

    const targetAssignedToId =
      session.role === "SALES_REP"
        ? currentCustomer.assignedToId
        : assignedToId !== undefined
        ? assignedToId
        : currentCustomer.assignedToId;

    const updatedCustomer = await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id },
        data: {
          firstName,
          lastName,
          phone: cleanPhone,
          secondPhone: secondPhone ? normalizeIranianPhone(secondPhone) : secondPhone,
          province,
          city,
          address,
          postalCode,
          notes,
          assignedToId: targetAssignedToId,
        },
        include: { needProfiles: true, assignedTo: true },
      });

      if (
        preferredSizes ||
        preferredShane ||
        preferredColors ||
        preferredStyle ||
        budgetMin !== undefined ||
        budgetMax !== undefined
      ) {
        await tx.carpetNeedProfile.upsert({
          where: { customerId: id },
          create: {
            customerId: id,
            preferredSizes: JSON.stringify(preferredSizes || ["3x4"]),
            preferredShane,
            preferredDensity,
            preferredColors: JSON.stringify(preferredColors || ["سرمه‌ای"]),
            preferredStyle,
            preferredCollection,
            budgetMin: budgetMin !== undefined && budgetMin !== null ? Math.round(budgetMin) : null,
            budgetMax: budgetMax !== undefined && budgetMax !== null ? Math.round(budgetMax) : null,
            quantity: quantity ? Math.max(1, Math.round(quantity)) : 1,
            paymentPreference: paymentPreference || "CASH",
            spaceType,
          },
          update: {
            preferredSizes: preferredSizes ? JSON.stringify(preferredSizes) : undefined,
            preferredShane,
            preferredDensity,
            preferredColors: preferredColors ? JSON.stringify(preferredColors) : undefined,
            preferredStyle,
            preferredCollection,
            budgetMin: budgetMin !== undefined ? (budgetMin !== null ? Math.round(budgetMin) : null) : undefined,
            budgetMax: budgetMax !== undefined ? (budgetMax !== null ? Math.round(budgetMax) : null) : undefined,
            quantity: quantity !== undefined ? Math.max(1, Math.round(quantity)) : undefined,
            paymentPreference,
            spaceType,
          },
        });
      }

      return updated;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "UPDATE",
      entity: "Customer",
      entityId: id,
      details: { name: `${updatedCustomer.firstName} ${updatedCustomer.lastName}` },
    });

    return NextResponse.json({ success: true, customer: updatedCustomer });
  } catch (error: any) {
    console.error("Error updating customer:", error);
    return NextResponse.json({ error: "خطا در ویرایش مشتری" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SALES_MANAGER")) {
      return NextResponse.json({ error: "عدم دسترسی کافی برای حذف مشتری" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.customer.delete({
      where: { id },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "DELETE",
      entity: "Customer",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    return NextResponse.json({ error: "خطا در حذف مشتری" }, { status: 500 });
  }
}
