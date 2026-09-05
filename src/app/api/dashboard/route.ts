import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import {
  getCustomerScope,
  getDealScope,
  getFollowUpScope,
  getLeadScope,
  getOrderScope,
  hasAllowedRole,
  MANAGEMENT_ROLES,
} from "@/lib/authorization";
import { runAutomationRules } from "@/lib/automation";
import { evaluateCustomerIntelligence } from "@/lib/customer-intelligence";

const STAGE_WEIGHTS: Record<string, number> = {
  NEW: 0.1,
  CONTACTED: 0.2,
  QUALIFIED: 0.35,
  NEEDS_ASSESSMENT: 0.5,
  PROPOSAL_SENT: 0.7,
  NEGOTIATION: 0.85,
  DECISION_PENDING: 0.9,
  WON: 1.0,
  LOST: 0.0,
  FUTURE_FOLLOWUP: 0.2,
};

const STAGE_LABELS: Record<string, string> = {
  NEW: "لید جدید",
  CONTACTED: "تماس و ارتباط",
  QUALIFIED: "اعتبارسنجی اولیه",
  NEEDS_ASSESSMENT: "نیازسنجی و طرح",
  PROPOSAL_SENT: "پیشنهاد و پیش‌فاکتور",
  NEGOTIATION: "مذاکره نهایی",
  DECISION_PENDING: "در انتظار تصمیم",
  WON: "فروش موفق (Won)",
  LOST: "انصراف / لغو",
  FUTURE_FOLLOWUP: "پیگیری در آینده",
};

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    // Read-only roles and individual reps must not trigger organization-wide writes.
    if (hasAllowedRole(session, MANAGEMENT_ROLES)) {
      await runAutomationRules();
    }

    const isRep = session.role === "SALES_REP";
    const customerFilter = getCustomerScope(session);
    const leadFilter = getLeadScope(session);
    const dealFilter = getDealScope(session);
    const followUpFilter = getFollowUpScope(session);
    const orderFilter = getOrderScope(session);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Orders & Sales Metrics
    const allOrders = await prisma.order.findMany({
      where: orderFilter,
      select: {
        id: true,
        finalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
        createdAt: true,
      },
    });

    const completedOrders = allOrders.filter(
      (o) => o.status === "PAID" || o.status === "CONFIRMED" || o.status === "COMPLETED"
    );

    const totalWonRevenue = completedOrders.reduce((sum, o) => sum + o.finalAmount, 0);

    const salesThisMonth = completedOrders
      .filter((o) => new Date(o.createdAt).getTime() >= startOfMonth.getTime())
      .reduce((sum, o) => sum + o.finalAmount, 0);

    const totalOutstandingReceivables = allOrders.reduce((sum, o) => sum + o.remainingAmount, 0);

    // 2. Deals & Pipeline Metrics
    const allDeals = await prisma.deal.findMany({
      where: dealFilter,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, code: true } },
        lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
        product: { select: { name: true, code: true } },
      },
      orderBy: { value: "desc" },
    });

    const openDeals = allDeals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
    const wonDeals = allDeals.filter((d) => d.stage === "WON");
    const lostDeals = allDeals.filter((d) => d.stage === "LOST");

    const openPipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedPipelineValue = openDeals.reduce(
      (sum, d) => sum + d.value * (STAGE_WEIGHTS[d.stage] || 0.3),
      0
    );

    // 3. Leads & Conversion Rate
    const totalLeads = await prisma.lead.count({ where: leadFilter });
    const newLeads = await prisma.lead.count({
      where: { ...leadFilter, status: "NEW" },
    });
    const hotLeadsCount = await prisma.lead.count({
      where: { ...leadFilter, temperature: "HOT", status: { notIn: ["WON", "LOST"] } },
    });

    const totalCustomers = await prisma.customer.count({
      where: customerFilter,
    });

    const conversionRate =
      totalLeads > 0 ? Math.round((wonDeals.length / totalLeads) * 100) : 0;

    // 4. Overdue Installments
    const overdueInstallmentsList = await prisma.installment.findMany({
      where: {
        status: { in: ["PENDING", "OVERDUE"] },
        dueDate: { lt: now },
        order: orderFilter,
      },
      include: {
        order: {
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
            seller: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    const overdueInstallmentsAmount = overdueInstallmentsList.reduce(
      (sum, inst) => sum + inst.amount,
      0
    );

    // 5. Follow-ups
    const overdueFollowUps = await prisma.followUp.count({
      where: {
        ...followUpFilter,
        status: { in: ["PENDING", "OVERDUE"] },
        scheduledAt: { lt: now },
      },
    });

    const todayFollowUps = await prisma.followUp.findMany({
      where: {
        ...followUpFilter,
        scheduledAt: { gte: startOfToday, lte: endOfToday },
      },
      include: {
        lead: { select: { firstName: true, lastName: true, phone: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 8,
    });

    // 6. Real Sales Funnel Data
    const funnelStagesOrder = [
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "NEEDS_ASSESSMENT",
      "PROPOSAL_SENT",
      "NEGOTIATION",
      "WON",
      "LOST",
    ];

    const funnelStages = funnelStagesOrder.map((stageKey) => {
      const dealsInStage = allDeals.filter((d) => d.stage === stageKey);
      const stageValue = dealsInStage.reduce((sum, d) => sum + d.value, 0);
      return {
        key: stageKey,
        stage: STAGE_LABELS[stageKey] || stageKey,
        count: dealsInStage.length,
        totalValue: stageValue,
      };
    });

    // 7. High-Value Opportunities (Top Open Deals >= 20,000,000)
    const highValueOpportunities = openDeals
      .filter((d) => d.value >= 20000000)
      .slice(0, 6)
      .map((d) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        stage: d.stage,
        priority: d.priority,
        customer: d.customer,
        lead: d.lead,
        assignedTo: d.assignedTo,
        product: d.product,
        updatedAt: d.updatedAt,
      }));

    // 8. At-Risk Customers (Calculated from real Customer Intelligence)
    const rawCustomers = await prisma.customer.findMany({
      where: customerFilter,
      include: {
        orders: {
          where: orderFilter,
          include: { installments: true },
        },
        deals: { where: dealFilter },
        followUps: { where: followUpFilter },
        needProfiles: true,
        assignedTo: { select: { name: true } },
      },
      take: 50,
    });

    const atRiskCustomers = rawCustomers
      .map((c) => {
        const intel = evaluateCustomerIntelligence(c);
        return {
          id: c.id,
          code: c.code,
          name: `${c.firstName} ${c.lastName}`,
          phone: c.phone,
          city: c.city,
          assignedTo: c.assignedTo?.name || "تعیین‌نشده",
          score: intel.score,
          segment: intel.segment,
          daysSinceLastInteraction: intel.daysSinceLastInteraction,
          totalRemainingBalance: intel.totalRemainingBalance,
          nextBestAction: intel.nextBestAction,
          reason: intel.hasOverdueInstallment
            ? "دارای چک یا قسط معوقه منقضی‌شده"
            : intel.hasOverdueFollowUp
            ? "دارای وظیفه پیگیری فراموش‌شده"
            : "عدم تعامل بیش از ۳۰ روز",
        };
      })
      .filter((c) => c.segment === "AT_RISK" || c.score < 40)
      .slice(0, 6);

    // 9. Reps Leaderboard (For Manager / Admin)
    const salesReps = await prisma.user.findMany({
      where: {
        role: { in: ["SALES_REP", "SALES_MANAGER", "ADMIN"] },
        isActive: true,
        ...(isRep ? { id: session.userId } : {}),
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        orders: {
          where: orderFilter,
          select: { finalAmount: true, status: true },
        },
        assignedLeads: {
          where: leadFilter,
          select: { id: true, status: true },
        },
        assignedCustomers: {
          where: customerFilter,
          select: { id: true },
        },
        followUps: {
          where: followUpFilter,
          select: { status: true },
        },
      },
    });

    const leaderboard = salesReps
      .map((r) => {
        const totalSales = r.orders
          .filter((o) => o.status === "PAID" || o.status === "CONFIRMED" || o.status === "COMPLETED")
          .reduce((sum, o) => sum + o.finalAmount, 0);

        const totalLeadsAssigned = r.assignedLeads.length;
        const wonCount = r.assignedLeads.filter((l) => l.status === "WON").length;
        const convRate = totalLeadsAssigned > 0 ? Math.round((wonCount / totalLeadsAssigned) * 100) : 0;
        const completedFollowUps = r.followUps.filter((f) => f.status === "DONE").length;
        const overdueFollowUpsCount = r.followUps.filter((f) => f.status === "OVERDUE").length;

        return {
          id: r.id,
          name: r.name,
          avatar: r.avatar,
          role: r.role,
          totalSales,
          leadsCount: totalLeadsAssigned,
          customersCount: r.assignedCustomers.length,
          conversionRate: convRate,
          completedFollowUps,
          overdueFollowUps: overdueFollowUpsCount,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);

    // 10. Top Selling Carpets
    const topCarpets = await prisma.orderItem.groupBy({
      by: ["variantId"],
      where: isRep ? { order: orderFilter } : undefined,
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });

    const variantIds = topCarpets.map((tc) => tc.variantId);
    const variantsList = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });
    const variantMap = new Map(variantsList.map((v) => [v.id, v]));

    const topCarpetDetails = topCarpets.map((tc) => {
      const variant = variantMap.get(tc.variantId);
      return {
        productName: variant?.product.name || "فرش سفارشی",
        code: variant?.product.code || "-",
        size: variant?.size || "-",
        soldCount: tc._sum.quantity || 0,
        totalRevenue: tc._sum.totalPrice || 0,
      };
    });

    return NextResponse.json({
      kpis: {
        totalWonRevenue,
        salesThisMonth,
        openPipelineValue,
        weightedPipelineValue: Math.round(weightedPipelineValue),
        totalOutstandingReceivables,
        overdueInstallmentsAmount,
        overdueInstallmentsCount: overdueInstallmentsList.length,
        totalLeads,
        newLeads,
        hotLeadsCount,
        totalCustomers,
        wonDealsCount: wonDeals.length,
        lostDealsCount: lostDeals.length,
        conversionRate,
        overdueFollowUps,
      },
      funnelStages,
      highValueOpportunities,
      atRiskCustomers,
      todayFollowUps,
      overdueInstallmentsList,
      topCarpetDetails,
      leaderboard,
    });
  } catch (error: any) {
    console.error("CEO Command Center metrics error:", error);
    return NextResponse.json({ error: "خطا در بارگذاری داشبورد مدیریتی" }, { status: 500 });
  }
}
