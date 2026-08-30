import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { dealCreateSchema, dealUpdateSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repId = searchParams.get("repId");

    const whereClause: any = {};
    if (session.role === "SALES_REP") {
      whereClause.assignedToId = session.userId;
    } else if (repId) {
      whereClause.assignedToId = repId;
    }

    const deals = await prisma.deal.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            score: true,
            temperature: true,
            source: true,
            city: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            code: true,
            city: true,
          },
        },
        product: { select: { id: true, code: true, name: true, primaryColor: true } },
        variant: { select: { id: true, sku: true, size: true, cashPrice: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
        followUps: {
          where: { status: "PENDING" },
          orderBy: { scheduledAt: "asc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ deals });
  } catch (error: any) {
    console.error("Error fetching pipeline deals:", error);
    return NextResponse.json({ error: "خطا در بارگذاری پایپ‌لاین" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const rawBody = await req.json().catch(() => null);
    const parsed = dealCreateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات معامله نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      title,
      value,
      stage,
      priority,
      leadId,
      customerId,
      productId,
      variantId,
      assignedToId,
      expectedCloseDate,
      notes,
    } = parsed.data;

    // Server-side RBAC: Sales reps can only assign deals to themselves
    const targetRepId =
      session.role === "SALES_REP"
        ? session.userId
        : assignedToId || session.userId;

    const deal = await prisma.deal.create({
      data: {
        title,
        value: Math.round(value || 0),
        stage,
        priority,
        leadId: leadId || null,
        customerId: customerId || null,
        productId: productId || null,
        variantId: variantId || null,
        assignedToId: targetRepId,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        notes: notes || null,
      },
      include: {
        lead: true,
        customer: true,
        product: true,
        assignedTo: true,
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "CREATE",
      entity: "Deal",
      entityId: deal.id,
      details: { title: deal.title, value: deal.value, stage: deal.stage },
    });

    return NextResponse.json({ success: true, deal });
  } catch (error: any) {
    console.error("Error creating deal:", error);
    return NextResponse.json({ error: "خطا در ایجاد معامله جدید" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const rawBody = await req.json().catch(() => null);
    const parsed = dealUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات معامله نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, title, value, priority, stage, notes, expectedCloseDate } = parsed.data;

    const currentDeal = await prisma.deal.findUnique({ where: { id } });
    if (!currentDeal) {
      return NextResponse.json({ error: "معامله یافت نشد." }, { status: 404 });
    }

    // Server-side RBAC: Sales reps can only edit their own deals
    if (session.role === "SALES_REP" && currentDeal.assignedToId !== session.userId) {
      return NextResponse.json({ error: "عدم دسترسی برای ویرایش این معامله" }, { status: 403 });
    }

    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: {
        title,
        value: value !== undefined ? Math.round(value) : undefined,
        priority,
        stage,
        notes,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      },
      include: {
        lead: true,
        customer: true,
        product: true,
        assignedTo: true,
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "UPDATE",
      entity: "Deal",
      entityId: id,
      details: { title: updatedDeal.title, value: updatedDeal.value, stage: updatedDeal.stage },
    });

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (error: any) {
    console.error("Error updating deal:", error);
    return NextResponse.json({ error: "خطا در به‌روزرسانی معامله" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "شناسه معامله الزامی است." }, { status: 400 });
    }

    const currentDeal = await prisma.deal.findUnique({ where: { id } });
    if (!currentDeal) {
      return NextResponse.json({ error: "معامله یافت نشد." }, { status: 404 });
    }

    // Server-side RBAC: Sales reps can only delete their own deals
    if (session.role === "SALES_REP" && currentDeal.assignedToId !== session.userId) {
      return NextResponse.json({ error: "عدم دسترسی برای حذف این معامله" }, { status: 403 });
    }

    await prisma.deal.delete({
      where: { id },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "DELETE",
      entity: "Deal",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting deal:", error);
    return NextResponse.json({ error: "خطا در حذف معامله از پایپ‌لاین" }, { status: 500 });
  }
}
