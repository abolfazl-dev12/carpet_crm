import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { normalizeIranianPhone, isValidIranianMobile } from "@/lib/persian";
import { calculateTemperature } from "@/lib/scoring";
import { logAuditEvent } from "@/lib/audit";
import { leadCreateSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const source = searchParams.get("source")?.trim() || "";
    const temperature = searchParams.get("temperature")?.trim() || "";
    const repId = searchParams.get("repId")?.trim() || "";

    const whereClause: any = {};

    // Role-based visibility enforcement
    if (session.role === "SALES_REP") {
      whereClause.assignedToId = session.userId;
    } else if (repId) {
      whereClause.assignedToId = repId;
    }

    if (status) whereClause.status = status;
    if (source) whereClause.source = source;
    if (temperature) whereClause.temperature = temperature;

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { city: { contains: search } },
        { province: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        needProfile: true,
        followUps: {
          orderBy: { scheduledAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: "خطا در دریافت لیست سرنخ‌ها" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = leadCreateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات سرنخ نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
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

    const normalizedPhone = normalizeIranianPhone(phone);
    if (!isValidIranianMobile(normalizedPhone)) {
      return NextResponse.json(
        { error: "شماره موبایل وارد شده باید ۱۱ رقمی معتبر ایران باشد (مانند ۰۹۱۲۳۴۵۶۷۸۹)" },
        { status: 400 }
      );
    }

    const temperature = calculateTemperature(score);
    // Enforce server-side ownership: Sales reps cannot assign to other reps
    const targetRepId =
      session.role === "SALES_REP"
        ? session.userId
        : assignedToId || session.userId;

    const cleanBudget = estimatedBudget !== undefined && estimatedBudget !== null ? Math.round(estimatedBudget) : null;

    // Use Prisma transaction for atomic lead, deal, and followup creation
    const lead = await prisma.$transaction(async (tx) => {
      const createdLead = await tx.lead.create({
        data: {
          firstName,
          lastName,
          phone: normalizedPhone,
          secondPhone: secondPhone ? normalizeIranianPhone(secondPhone) : null,
          province,
          city,
          source,
          campaign: campaign || null,
          score,
          temperature,
          estimatedBudget: cleanBudget,
          purchaseTimeframe: purchaseTimeframe || null,
          notes: notes || null,
          assignedToId: targetRepId,
          needProfile: {
            create: {
              preferredSizes: JSON.stringify(preferredSizes || ["3x4"]),
              preferredShane: preferredShane || null,
              preferredDensity: preferredDensity || null,
              preferredColors: JSON.stringify(preferredColors || ["سرمه‌ای"]),
              preferredStyle: preferredStyle || null,
              preferredCollection: preferredCollection || null,
              budgetMin: cleanBudget ? Math.round(cleanBudget * 0.7) : null,
              budgetMax: cleanBudget,
              quantity: 1,
              paymentPreference: paymentPreference || "CASH",
              spaceType: spaceType || null,
            },
          },
        },
        include: {
          needProfile: true,
          assignedTo: true,
        },
      });

      // Automatically create initial pipeline Deal
      await tx.deal.create({
        data: {
          title: `معامله فرش: ${createdLead.firstName} ${createdLead.lastName}`,
          value: cleanBudget || 25000000,
          stage: "NEW",
          priority: createdLead.temperature === "HOT" ? "HIGH" : "MEDIUM",
          leadId: createdLead.id,
          assignedToId: targetRepId,
        },
      });

      // Create Initial FollowUp
      await tx.followUp.create({
        data: {
          title: `تماس اولیه و نیازسنجی با ${createdLead.firstName} ${createdLead.lastName}`,
          type: "CALL",
          priority: createdLead.temperature === "HOT" ? "URGENT" : "HIGH",
          status: "PENDING",
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          leadId: createdLead.id,
          assignedToId: targetRepId,
        },
      });

      return createdLead;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "CREATE",
      entity: "Lead",
      entityId: lead.id,
      details: { name: `${lead.firstName} ${lead.lastName}`, phone: lead.phone },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "خطا در ثبت سرنخ جدید" }, { status: 500 });
  }
}
