import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PUBLIC_USER_SELECT } from "@/lib/public-user";
import { getSessionFromRequest } from "@/lib/auth";
import {
  canAccessOwners,
  canMutateCrm,
  getDealScope,
  getFollowUpScope,
  getLeadScope,
  hasAllowedRole,
  MANAGEMENT_ROLES,
} from "@/lib/authorization";
import { calculateTemperature } from "@/lib/scoring";
import { logAuditEvent } from "@/lib/audit";
import { leadUpdateSchema } from "@/lib/validations/schemas";
import { normalizeIranianPhone, isValidIranianMobile } from "@/lib/persian";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        needProfile: true,
        assignedTo: { select: { id: true, name: true, phone: true, avatar: true } },
        deals: {
          where: getDealScope(session),
          include: { product: true, variant: true },
        },
        followUps: {
          where: getFollowUpScope(session),
          orderBy: { scheduledAt: "desc" },
        },
        convertedToCustomer: true,
      },
    });

    if (!lead) return NextResponse.json({ error: "سرنخ یافت نشد" }, { status: 404 });

    // Server-side RBAC check: Sales reps can only view their own assigned leads
    if (!canAccessOwners(session, [lead.assignedToId])) {
      return NextResponse.json({ error: "عدم دسترسی به این سرنخ" }, { status: 403 });
    }

    const visibleLead =
      session.role === "SALES_REP" &&
      lead.convertedToCustomer &&
      lead.convertedToCustomer.assignedToId !== session.userId
        ? { ...lead, convertedToCustomer: null }
        : lead;

    return NextResponse.json({ lead: visibleLead });
  } catch (error: any) {
    console.error("Error fetching lead:", error);
    return NextResponse.json({ error: "خطا در دریافت سرنخ" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!canMutateCrm(session)) {
      return NextResponse.json({ error: "نقش فقط‌خواندنی مجاز به ویرایش سرنخ نیست." }, { status: 403 });
    }

    const { id } = await params;
    const rawBody = await req.json().catch(() => null);
    const parsed = leadUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات ارسالی نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const currentLead = await prisma.lead.findUnique({ where: { id } });
    if (!currentLead) return NextResponse.json({ error: "سرنخ یافت نشد" }, { status: 404 });

    // Server-side RBAC: Sales reps can only update their own leads and cannot reassign
    if (!canAccessOwners(session, [currentLead.assignedToId])) {
      return NextResponse.json({ error: "عدم دسترسی برای ویرایش این سرنخ" }, { status: 403 });
    }

    const {
      firstName,
      lastName,
      phone,
      secondPhone,
      province,
      city,
      source,
      campaign,
      status,
      score,
      estimatedBudget,
      purchaseTimeframe,
      notes,
      assignedToId,
      preferredSizes,
      preferredShane,
      preferredDensity,
      preferredColors,
      preferredStyle,
      preferredCollection,
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

    const newScore = score !== undefined ? score : currentLead.score;
    const temperature = calculateTemperature(newScore);

    const targetAssignedToId =
      session.role === "SALES_REP"
        ? currentLead.assignedToId
        : assignedToId !== undefined
        ? assignedToId
        : currentLead.assignedToId;

    const cleanBudget =
      estimatedBudget !== undefined
        ? estimatedBudget !== null
          ? Math.round(estimatedBudget)
          : null
        : undefined;

    // Use Prisma transaction for atomic lead and need profile update
    const updatedLead = await prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { ...getLeadScope(session), id },
        data: {
          firstName,
          lastName,
          phone: cleanPhone,
          secondPhone: secondPhone ? normalizeIranianPhone(secondPhone) : secondPhone,
          province,
          city,
          source,
          campaign,
          status,
          score: newScore,
          temperature,
          estimatedBudget: cleanBudget,
          purchaseTimeframe,
          notes,
          assignedToId: targetAssignedToId,
          lastActivityAt: new Date(),
        },
        include: { needProfile: true, assignedTo: { select: PUBLIC_USER_SELECT } },
      });

      if (preferredSizes || preferredShane || preferredColors || preferredStyle || preferredDensity) {
        await tx.carpetNeedProfile.upsert({
          where: { leadId: id },
          create: {
            leadId: id,
            preferredSizes: preferredSizes || ["3x4"],
            preferredShane,
            preferredDensity,
            preferredColors: preferredColors || ["سرمه‌ای"],
            preferredStyle,
            preferredCollection,
            paymentPreference: paymentPreference || "CASH",
            spaceType,
          },
          update: {
            preferredSizes: preferredSizes || undefined,
            preferredShane,
            preferredDensity,
            preferredColors: preferredColors || undefined,
            preferredStyle,
            preferredCollection,
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
      entity: "Lead",
      entityId: id,
      details: { score: newScore, status: updatedLead.status },
    });

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "خطا در به‌روزرسانی سرنخ" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!hasAllowedRole(session, MANAGEMENT_ROLES)) {
      return NextResponse.json({ error: "عدم دسترسی کافی برای حذف" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.lead.delete({ where: { id } });

    await logAuditEvent({
      userId: session.userId,
      action: "DELETE",
      entity: "Lead",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: "خطا در حذف سرنخ" }, { status: 500 });
  }
}
