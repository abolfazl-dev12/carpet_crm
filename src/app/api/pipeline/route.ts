import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { PUBLIC_USER_SELECT } from "@/lib/public-user";
import { getSessionFromRequest } from "@/lib/auth";
import {
  canAccessOwners,
  canMutateCrm,
  checkRelatedResourceAccess,
  getDealScope,
  getFollowUpScope,
} from "@/lib/authorization";
import { logAuditEvent } from "@/lib/audit";
import { dealCreateSchema, dealUpdateSchema } from "@/lib/validations/schemas";

class RelatedDealResourceError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403
  ) {
    super(message);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const repId = searchParams.get("repId");

    const whereClause: Prisma.DealWhereInput = getDealScope(session);
    if (session.role !== "SALES_REP" && repId) {
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
          where: { status: "PENDING", ...getFollowUpScope(session) },
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
    if (!canMutateCrm(session)) {
      return NextResponse.json({ error: "نقش فقط‌خواندنی مجاز به ایجاد معامله نیست." }, { status: 403 });
    }

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

    const deal = await prisma.$transaction(async (tx) => {
      const relatedAccess = await checkRelatedResourceAccess(
        session,
        { leadId, customerId },
        tx
      );
      if (relatedAccess !== "ALLOWED") {
        throw new RelatedDealResourceError(
          relatedAccess === "NOT_FOUND"
            ? "مشتری یا سرنخ مرتبط یافت نشد."
            : "عدم دسترسی به مشتری یا سرنخ مرتبط با معامله",
          relatedAccess === "NOT_FOUND" ? 400 : 403
        );
      }

      return tx.deal.create({
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
          assignedTo: { select: PUBLIC_USER_SELECT },
        },
      });
    });

    await logAuditEvent({
      userId: session.userId,
      action: "CREATE",
      entity: "Deal",
      entityId: deal.id,
      details: { title: deal.title, value: deal.value, stage: deal.stage },
    });

    return NextResponse.json({ success: true, deal });
  } catch (error: unknown) {
    if (error instanceof RelatedDealResourceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error creating deal:", error);
    return NextResponse.json({ error: "خطا در ایجاد معامله جدید" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!canMutateCrm(session)) {
      return NextResponse.json({ error: "نقش فقط‌خواندنی مجاز به ویرایش معامله نیست." }, { status: 403 });
    }

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
    const relatedAccess = await checkRelatedResourceAccess(session, currentDeal);
    if (
      !canAccessOwners(session, [currentDeal.assignedToId]) ||
      relatedAccess !== "ALLOWED"
    ) {
      return NextResponse.json({ error: "عدم دسترسی برای ویرایش این معامله" }, { status: 403 });
    }

    const updatedDeal = await prisma.deal.update({
      where: { ...getDealScope(session), id },
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
        assignedTo: { select: PUBLIC_USER_SELECT },
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
    if (!canMutateCrm(session)) {
      return NextResponse.json({ error: "نقش فقط‌خواندنی مجاز به حذف معامله نیست." }, { status: 403 });
    }

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
    const relatedAccess = await checkRelatedResourceAccess(session, currentDeal);
    if (
      !canAccessOwners(session, [currentDeal.assignedToId]) ||
      relatedAccess !== "ALLOWED"
    ) {
      return NextResponse.json({ error: "عدم دسترسی برای حذف این معامله" }, { status: 403 });
    }

    await prisma.deal.delete({
      where: { ...getDealScope(session), id },
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
