import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { runAutomationRules } from "@/lib/automation";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    // Run background automation rules check
    await runAutomationRules();

    const isRep = session.role === "SALES_REP";
    const userFilter = isRep ? { assignedToId: session.userId } : {};
    const sellerFilter = isRep ? { sellerId: session.userId } : {};

    // 1. KPI Counts
    const totalLeads = await prisma.lead.count({ where: userFilter });
    const newLeads = await prisma.lead.count({
      where: { ...userFilter, status: "NEW" },
    });
    const hotLeadsCount = await prisma.lead.count({
      where: { ...userFilter, temperature: "HOT", status: { notIn: ["WON", "LOST"] } },
    });

    const wonDeals = await prisma.deal.findMany({
      where: { ...userFilter, stage: "WON" },
      select: { value: true },
    });
    const lostDeals = await prisma.deal.count({
      where: { ...userFilter, stage: "LOST" },
    });
    const openDeals = await prisma.deal.findMany({
      where: { ...userFilter, stage: { notIn: ["WON", "LOST"] } },
      select: { value: true },
    });

    const totalWonRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const openPipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);

    const totalCustomers = await prisma.customer.count({
      where: isRep ? { assignedToId: session.userId } : {},
    });

    // Overdue & Today's Follow-ups
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const overdueFollowUps = await prisma.followUp.count({
      where: {
        ...userFilter,
        status: { in: ["PENDING", "OVERDUE"] },
        scheduledAt: { lt: now },
      },
    });

    const todayFollowUps = await prisma.followUp.findMany({
      where: {
        ...userFilter,
        scheduledAt: { gte: startOfToday, lte: endOfToday },
      },
      include: {
        lead: { select: { firstName: true, lastName: true, phone: true } },
        customer: { select: { firstName: true, lastName: true, phone: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    });

    // Recent Hot Leads
    const hotLeads = await prisma.lead.findMany({
      where: { ...userFilter, temperature: "HOT", status: { notIn: ["WON", "LOST"] } },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { score: "desc" },
      take: 6,
    });

    // Lead Sources Distribution
    const leadsBySource = await prisma.lead.groupBy({
      by: ["source"],
      _count: { id: true },
      where: userFilter,
    });

    // Top Selling Carpets (for Manager)
    const topCarpets = await prisma.orderItem.groupBy({
      by: ["variantId"],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });

    // Fetch variant details for top carpets
    const topCarpetDetails = await Promise.all(
      topCarpets.map(async (tc) => {
        const variant = await prisma.productVariant.findUnique({
          where: { id: tc.variantId },
          include: { product: true },
        });
        return {
          productName: variant?.product.name || "فرش سفارشی",
          code: variant?.product.code || "-",
          size: variant?.size || "-",
          soldCount: tc._sum.quantity || 0,
          totalRevenue: tc._sum.totalPrice || 0,
        };
      })
    );

    // Reps Leaderboard (for Admin/Manager)
    const salesReps = await prisma.user.findMany({
      where: { role: { in: ["SALES_REP", "SALES_MANAGER"] }, isActive: true },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        orders: { select: { finalAmount: true } },
        assignedLeads: { select: { id: true, status: true } },
      },
    });

    const leaderboard = salesReps.map((r) => {
      const totalSales = r.orders.reduce((sum, o) => sum + o.finalAmount, 0);
      const totalLeadsAssigned = r.assignedLeads.length;
      const wonCount = r.assignedLeads.filter((l) => l.status === "WON").length;
      const convRate = totalLeadsAssigned > 0 ? Math.round((wonCount / totalLeadsAssigned) * 100) : 0;
      return {
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        role: r.role,
        totalSales,
        leadsCount: totalLeadsAssigned,
        conversionRate: convRate,
      };
    }).sort((a, b) => b.totalSales - a.totalSales);

    return NextResponse.json({
      kpis: {
        totalLeads,
        newLeads,
        hotLeadsCount,
        totalCustomers,
        totalWonRevenue,
        openPipelineValue,
        wonDealsCount: wonDeals.length,
        lostDealsCount: lostDeals,
        conversionRate:
          totalLeads > 0 ? Math.round((wonDeals.length / totalLeads) * 100) : 0,
        overdueFollowUps,
      },
      todayFollowUps,
      hotLeads,
      leadsBySource,
      topCarpetDetails,
      leaderboard,
    });
  } catch (error: any) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json({ error: "خطا در بارگذاری داشبورد" }, { status: 500 });
  }
}
