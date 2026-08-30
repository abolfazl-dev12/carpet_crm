import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { followUpCreateSchema, followUpUpdateSchema } from "@/lib/validations/schemas";
import { evaluateCustomerIntelligence } from "@/lib/customer-intelligence";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const repId = searchParams.get("repId");

    const whereClause: any = {};
    // Server-side RBAC: Sales reps only see their assigned follow-ups
    if (session.role === "SALES_REP") {
      whereClause.assignedToId = session.userId;
    } else if (repId) {
      whereClause.assignedToId = repId;
    }

    if (status) whereClause.status = status;

    const followUps = await prisma.followUp.findMany({
      where: whereClause,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, code: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    // Generate Dynamic "Today's Sales Next Best Actions"
    const customerFilter = session.role === "SALES_REP" ? { assignedToId: session.userId } : {};
    const relevantCustomers = await prisma.customer.findMany({
      where: customerFilter,
      include: {
        orders: { include: { installments: true } },
        deals: true,
        followUps: true,
        needProfiles: true,
        assignedTo: { select: { name: true } },
      },
      take: 30,
    });

    const todaysSuggestedActions: any[] = [];

    for (const c of relevantCustomers) {
      const intel = evaluateCustomerIntelligence(c);
      if (
        intel.nextBestAction.priority === "URGENT" ||
        intel.nextBestAction.priority === "HIGH" ||
        intel.segment === "HOT" ||
        intel.segment === "AT_RISK"
      ) {
        todaysSuggestedActions.push({
          customerId: c.id,
          customerCode: c.code,
          customerName: `${c.firstName} ${c.lastName}`,
          phone: c.phone,
          score: intel.score,
          segment: intel.segment,
          action: intel.nextBestAction.action,
          reason: intel.nextBestAction.reason,
          priority: intel.nextBestAction.priority,
          suggestedDate: intel.nextBestAction.suggestedDate,
          actionType: intel.nextBestAction.actionType,
        });
      }
    }

    // Sort priority: URGENT first, then HIGH, then score descending
    todaysSuggestedActions.sort((a, b) => {
      const pOrder: Record<string, number> = { URGENT: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
      const diff = (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      if (diff !== 0) return diff;
      return b.score - a.score;
    });

    return NextResponse.json({
      followUps,
      todaysSuggestedActions: todaysSuggestedActions.slice(0, 8),
    });
  } catch (error: any) {
    console.error("Error fetching follow-ups:", error);
    return NextResponse.json({ error: "خطا در دریافت لیست پیگیری‌ها" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const rawBody = await req.json().catch(() => null);
    const parsed = followUpCreateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات پیگیری نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      title,
      type,
      priority,
      scheduledAt,
      leadId,
      customerId,
      dealId,
      assignedToId,
    } = parsed.data;

    // Server-side RBAC: Sales reps cannot assign follow-up to another rep
    const targetRepId =
      session.role === "SALES_REP"
        ? session.userId
        : assignedToId || session.userId;

    const followUp = await prisma.followUp.create({
      data: {
        title,
        type,
        priority,
        status: "PENDING",
        scheduledAt: new Date(scheduledAt),
        leadId: leadId || null,
        customerId: customerId || null,
        dealId: dealId || null,
        assignedToId: targetRepId,
      },
      include: { lead: true, customer: true, assignedTo: true },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "CREATE",
      entity: "FollowUp",
      entityId: followUp.id,
      details: { title: followUp.title, type: followUp.type },
    });

    return NextResponse.json({ success: true, followUp });
  } catch (error: any) {
    console.error("Error creating follow-up:", error);
    return NextResponse.json({ error: "خطا در ثبت پیگیری جدید" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const rawBody = await req.json().catch(() => null);
    const parsed = followUpUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات ارسالی نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, status, resultNote } = parsed.data;

    const currentFollowUp = await prisma.followUp.findUnique({ where: { id } });
    if (!currentFollowUp) {
      return NextResponse.json({ error: "پیگیری یافت نشد." }, { status: 404 });
    }

    // Server-side RBAC: Sales reps can only update their own follow-ups
    if (session.role === "SALES_REP" && currentFollowUp.assignedToId !== session.userId) {
      return NextResponse.json({ error: "عدم دسترسی برای تغییر وضعیت این پیگیری" }, { status: 403 });
    }

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        status,
        resultNote: resultNote || null,
        completedAt: status === "DONE" ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, followUp: updated });
  } catch (error: any) {
    console.error("Error updating follow-up:", error);
    return NextResponse.json({ error: "خطا در به‌روزرسانی وضعیت پیگیری" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "شناسه پیگیری الزامی است." }, { status: 400 });
    }

    const currentFollowUp = await prisma.followUp.findUnique({ where: { id } });
    if (!currentFollowUp) {
      return NextResponse.json({ error: "پیگیری یافت نشد." }, { status: 404 });
    }

    // Server-side RBAC: Sales reps can only delete their own follow-ups
    if (session.role === "SALES_REP" && currentFollowUp.assignedToId !== session.userId) {
      return NextResponse.json({ error: "عدم دسترسی برای حذف این پیگیری" }, { status: 403 });
    }

    await prisma.followUp.delete({
      where: { id },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "DELETE",
      entity: "FollowUp",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting follow-up:", error);
    return NextResponse.json({ error: "خطا در حذف پیگیری" }, { status: 500 });
  }
}
