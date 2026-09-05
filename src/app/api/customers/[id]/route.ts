import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PUBLIC_USER_SELECT } from "@/lib/public-user";
import { getSessionFromRequest } from "@/lib/auth";
import {
  canAccessOwners,
  canMutateCrm,
  getCustomerScope,
  getDealScope,
  getFollowUpScope,
  getLeadScope,
  getOrderScope,
  hasAllowedRole,
  MANAGEMENT_ROLES,
} from "@/lib/authorization";
import { logAuditEvent } from "@/lib/audit";
import { customerUpdateSchema } from "@/lib/validations/schemas";
import { normalizeIranianPhone, isValidIranianMobile } from "@/lib/persian";
import { readStringArray } from "@/lib/json-fields";
import { evaluateCustomerIntelligence } from "@/lib/customer-intelligence";
import { recommendCarpets } from "@/lib/recommendation";

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
        deals: {
          where: getDealScope(session),
          include: { product: true, variant: true },
          orderBy: { createdAt: "desc" },
        },
        orders: {
          where: getOrderScope(session),
          include: {
            items: { include: { variant: { include: { product: true } } } },
            payments: { orderBy: { paidAt: "desc" } },
            installments: { orderBy: { installmentNumber: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        },
        followUps: {
          where: getFollowUpScope(session),
          include: { assignedTo: { select: { name: true } } },
          orderBy: { scheduledAt: "desc" },
        },
        leads: {
          where: getLeadScope(session),
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) return NextResponse.json({ error: "مشتری یافت نشد" }, { status: 404 });

    // Server-side RBAC: Sales Reps can only view their own assigned customers
    if (!canAccessOwners(session, [customer.assignedToId])) {
      return NextResponse.json({ error: "عدم دسترسی به این پرونده مشتری" }, { status: 403 });
    }

    // 1. Calculate Real Customer Intelligence
    const intelligence = evaluateCustomerIntelligence(customer);

    // 2. Fetch Active Products Catalog for Real Carpet Recommendations
    const activeProducts = await prisma.product.findMany({
      where: { isActive: true },
      include: { variants: { where: { isActive: true } } },
    });

    const needProfile = customer.needProfiles?.[0];
    let recommendations: any[] = [];

    if (needProfile) {
      const preferredSizes = readStringArray(needProfile.preferredSizes);
      const preferredColors = readStringArray(needProfile.preferredColors);

      // Extract previous purchased collections for affinity bonus
      const previousPurchasedCollections = customer.orders.flatMap((o) =>
        o.items.map((it) => it.variant?.product?.collection).filter(Boolean)
      );

      recommendations = recommendCarpets(
        {
          preferredSizes,
          preferredShane: needProfile.preferredShane,
          preferredDensity: needProfile.preferredDensity,
          preferredColors,
          preferredStyle: needProfile.preferredStyle,
          preferredCollection: needProfile.preferredCollection,
          budgetMin: needProfile.budgetMin,
          budgetMax: needProfile.budgetMax,
          paymentPreference: needProfile.paymentPreference,
          previousPurchasedCollections,
        },
        activeProducts
      ).slice(0, 6);
    } else {
      // General catalog showcase without fabricating customer preferences
      recommendations = recommendCarpets({}, activeProducts).slice(0, 4);
    }

    // 3. Construct Unified Chronological Activity Timeline
    const timelineEvents: Array<{
      id: string;
      type: "CUSTOMER_CREATED" | "LEAD_CREATED" | "FOLLOWUP" | "DEAL" | "ORDER" | "PAYMENT" | "INSTALLMENT";
      title: string;
      description?: string;
      timestamp: Date;
      metadata?: any;
    }> = [];

    // Customer Registration
    timelineEvents.push({
      id: `cust_created_${customer.id}`,
      type: "CUSTOMER_CREATED",
      title: "ثبت و افتتاح پرونده مشتری در سامانه",
      description: `ثبت توسط ${customer.assignedTo?.name || "سیستم"} در استان ${customer.province}، شهر ${customer.city}`,
      timestamp: new Date(customer.createdAt),
    });

    // Linked Leads
    for (const l of customer.leads) {
      timelineEvents.push({
        id: `lead_${l.id}`,
        type: "LEAD_CREATED",
        title: `ثبت سرنخ اولیه فروش (منبع: ${l.source})`,
        description: `امتیاز اولیه: ${l.score} • وضعیت: ${l.status}`,
        timestamp: new Date(l.createdAt),
      });
    }

    // Follow-ups
    for (const f of customer.followUps) {
      timelineEvents.push({
        id: `fu_${f.id}`,
        type: "FOLLOWUP",
        title: `وظیفه پیگیری: ${f.title}`,
        description: f.resultNote ? `گزارش: ${f.resultNote}` : `وضعیت: ${f.status === "DONE" ? "انجام‌شده" : "در انتظار"}`,
        timestamp: new Date(f.completedAt || f.scheduledAt),
        metadata: { status: f.status, type: f.type },
      });
    }

    // Deals
    for (const d of customer.deals) {
      timelineEvents.push({
        id: `deal_${d.id}`,
        type: "DEAL",
        title: `معامله پایپ‌لاین: ${d.title}`,
        description: `ارزش: ${d.value.toLocaleString()} تومان • مرحله: ${d.stage}`,
        timestamp: new Date(d.createdAt),
        metadata: { stage: d.stage, value: d.value },
      });
    }

    // Orders
    for (const o of customer.orders) {
      timelineEvents.push({
        id: `order_${o.id}`,
        type: "ORDER",
        title: `صدور فاکتور فروش شماره ${o.orderNumber}`,
        description: `مبلغ کل: ${o.finalAmount.toLocaleString()} تومان • شامل ${o.items.length} قلم فرش`,
        timestamp: new Date(o.createdAt),
        metadata: { orderNumber: o.orderNumber, amount: o.finalAmount },
      });

      // Payments inside order
      for (const p of o.payments) {
        timelineEvents.push({
          id: `pay_${p.id}`,
          type: "PAYMENT",
          title: `دریافت و ثبت تراکنش مالی (${p.method})`,
          description: `مبلغ واریزی: ${p.amount.toLocaleString()} تومان • رهگیری: ${p.trackingNumber || "-"}`,
          timestamp: new Date(p.paidAt),
          metadata: { amount: p.amount, method: p.method },
        });
      }
    }

    // Sort Timeline Descending by Date
    timelineEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      customer,
      intelligence,
      recommendations,
      activityTimeline: timelineEvents,
    });
  } catch (error: any) {
    console.error("Error fetching customer 360:", error);
    return NextResponse.json({ error: "خطا در دریافت پروفایل ۳۶۰ مشتری" }, { status: 500 });
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
      return NextResponse.json({ error: "نقش فقط‌خواندنی مجاز به ویرایش مشتری نیست." }, { status: 403 });
    }

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
    if (!canAccessOwners(session, [currentCustomer.assignedToId])) {
      return NextResponse.json({ error: "عدم دسترسی برای ویرایش این مشتری" }, { status: 403 });
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
        where: { ...getCustomerScope(session), id },
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
        include: { needProfiles: true, assignedTo: { select: PUBLIC_USER_SELECT } },
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
            preferredSizes: preferredSizes || ["3x4"],
            preferredShane,
            preferredDensity,
            preferredColors: preferredColors || ["سرمه‌ای"],
            preferredStyle,
            preferredCollection,
            budgetMin: budgetMin !== undefined && budgetMin !== null ? Math.round(budgetMin) : null,
            budgetMax: budgetMax !== undefined && budgetMax !== null ? Math.round(budgetMax) : null,
            quantity: quantity ? Math.max(1, Math.round(quantity)) : 1,
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
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!hasAllowedRole(session, MANAGEMENT_ROLES)) {
      return NextResponse.json({ error: "عدم دسترسی کافی برای حذف مشتری" }, { status: 403 });
    }

    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true, deals: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "مشتری یافت نشد." }, { status: 404 });
    }

    // Financial & Referential Integrity Guard:
    // Block deleting customer if they have order records to prevent ledger inconsistency
    if (customer._count.orders > 0) {
      return NextResponse.json(
        {
          error:
            "امکان حذف این مشتری به دلیل وجود سوابق مالی و فاکتورهای فروش ثبت‌شده وجود ندارد. سوابق مالی جهت حفظ یکپارچگی حسابداری محافظت می‌شوند.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.followUp.deleteMany({ where: { customerId: id } });
      await tx.deal.deleteMany({ where: { customerId: id } });
      await tx.carpetNeedProfile.deleteMany({ where: { customerId: id } });
      await tx.customer.delete({ where: { id } });

      await logAuditEvent(
        {
          userId: session.userId,
          action: "DELETE",
          entity: "Customer",
          entityId: id,
        },
        tx
      );
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    return NextResponse.json({ error: "خطا در حذف مشتری" }, { status: 500 });
  }
}
