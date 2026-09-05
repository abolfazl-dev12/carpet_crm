import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { getCustomerScope, getLeadScope } from "@/lib/authorization";
import { normalizeIranianPhone } from "@/lib/persian";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q || q.length < 2) {
      return NextResponse.json({ leads: [], customers: [], products: [] });
    }

    const normalizedPhone = normalizeIranianPhone(q);

    const customerWhere: Prisma.CustomerWhereInput = {
      ...getCustomerScope(session),
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { phone: { contains: normalizedPhone || q } },
        { code: { contains: q } },
        { city: { contains: q } },
      ],
    };

    const leadWhere: Prisma.LeadWhereInput = {
      ...getLeadScope(session),
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { phone: { contains: normalizedPhone || q } },
        { city: { contains: q } },
      ],
    };

    // Search Customers
    const customers = await prisma.customer.findMany({
      where: customerWhere,
      select: {
        id: true,
        code: true,
        firstName: true,
        lastName: true,
        phone: true,
        province: true,
        city: true,
      },
      take: 5,
    });

    // Search Leads
    const leads = await prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        score: true,
        temperature: true,
        status: true,
      },
      take: 5,
    });

    // Search Products
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q } },
          { code: { contains: q } },
          { pattern: { contains: q } },
          { collection: { contains: q } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        collection: true,
        shane: true,
        primaryColor: true,
      },
      take: 5,
    });

    return NextResponse.json({ customers, leads, products });
  } catch (error: any) {
    console.error("Global search error:", error);
    return NextResponse.json({ error: "خطا در جستجو" }, { status: 500 });
  }
}
