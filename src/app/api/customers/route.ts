import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { normalizeIranianPhone, isValidIranianMobile } from "@/lib/persian";
import { logAuditEvent } from "@/lib/audit";
import { customerCreateSchema } from "@/lib/validations/schemas";
import { generateCustomerCode } from "@/lib/generators";
import { evaluateCustomerIntelligence } from "@/lib/customer-intelligence";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const province = searchParams.get("province")?.trim() || "";
    const repId = searchParams.get("repId")?.trim() || "";
    const segmentFilter = searchParams.get("segment")?.trim() || "";
    const sortBy = searchParams.get("sort")?.trim() || "score_desc";

    const whereClause: any = {};

    // Enforce server-side RBAC: Sales Reps only see their assigned customers
    if (session.role === "SALES_REP") {
      whereClause.assignedToId = session.userId;
    } else if (repId) {
      whereClause.assignedToId = repId;
    }

    if (province) whereClause.province = province;

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { code: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const rawCustomers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        needProfiles: true,
        orders: {
          include: { installments: true },
          orderBy: { createdAt: "desc" },
        },
        deals: {
          orderBy: { updatedAt: "desc" },
        },
        followUps: {
          orderBy: { scheduledAt: "desc" },
        },
        _count: { select: { orders: true, deals: true, followUps: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute Customer Intelligence for each customer
    let customersWithIntelligence = rawCustomers.map((c) => {
      const intelligence = evaluateCustomerIntelligence(c);
      return {
        ...c,
        intelligence,
      };
    });

    // Apply Segment Filtering if requested
    if (segmentFilter) {
      customersWithIntelligence = customersWithIntelligence.filter(
        (c) => c.intelligence.segment === segmentFilter
      );
    }

    // Apply Sorting
    if (sortBy === "score_desc") {
      customersWithIntelligence.sort((a, b) => b.intelligence.score - a.intelligence.score);
    } else if (sortBy === "spent_desc") {
      customersWithIntelligence.sort((a, b) => b.intelligence.totalSpent - a.intelligence.totalSpent);
    } else if (sortBy === "created_desc") {
      customersWithIntelligence.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return NextResponse.json({ customers: customersWithIntelligence });
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "خطا در دریافت لیست مشتریان" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const rawBody = await req.json().catch(() => null);
    const parsed = customerCreateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات ارسالی نامعتبر است.", details: parsed.error.flatten().fieldErrors },
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

    const normalizedPhone = normalizeIranianPhone(phone);
    if (!isValidIranianMobile(normalizedPhone)) {
      return NextResponse.json(
        { error: "شماره همراه باید ۱۱ رقم معتبر ایران باشد." },
        { status: 400 }
      );
    }

    // Server-side ownership: Sales reps cannot assign customer to someone else
    const targetRepId =
      session.role === "SALES_REP"
        ? session.userId
        : assignedToId || session.userId;

    // Use Prisma transaction for atomic concurrency-safe code generation & creation
    const customer = await prisma.$transaction(async (tx) => {
      const customerCode = await generateCustomerCode(tx);

      return tx.customer.create({
        data: {
          code: customerCode,
          firstName,
          lastName,
          phone: normalizedPhone,
          secondPhone: secondPhone ? normalizeIranianPhone(secondPhone) : null,
          province,
          city,
          address: address || null,
          postalCode: postalCode || null,
          notes: notes || null,
          assignedToId: targetRepId,
          needProfiles: {
            create: {
              preferredSizes: JSON.stringify(preferredSizes || ["3x4"]),
              preferredShane: preferredShane || null,
              preferredDensity: preferredDensity || null,
              preferredColors: JSON.stringify(preferredColors || ["سرمه‌ای"]),
              preferredStyle: preferredStyle || null,
              preferredCollection: preferredCollection || null,
              budgetMin: budgetMin !== undefined && budgetMin !== null ? Math.round(budgetMin) : null,
              budgetMax: budgetMax !== undefined && budgetMax !== null ? Math.round(budgetMax) : null,
              quantity: Math.max(1, Math.round(quantity || 1)),
              paymentPreference: paymentPreference || "CASH",
              spaceType: spaceType || null,
            },
          },
        },
        include: { needProfiles: true, assignedTo: true },
      });
    });

    await logAuditEvent({
      userId: session.userId,
      action: "CREATE",
      entity: "Customer",
      entityId: customer.id,
      details: { code: customer.code, name: `${customer.firstName} ${customer.lastName}` },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error("Error creating customer:", error);
    return NextResponse.json({ error: "خطا در ثبت مشتری جدید" }, { status: 500 });
  }
}
