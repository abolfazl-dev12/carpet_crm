import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { recommendCarpets } from "@/lib/recommendation";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    }

    const body = await req.json();
    const {
      preferredSizes = [],
      preferredShane,
      preferredDensity,
      preferredColors = [],
      preferredStyle,
      preferredCollection,
      budgetMax,
      paymentPreference,
    } = body;

    // Fetch all active products with variants
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        variants: { where: { isActive: true } },
      },
    });

    const recommendations = recommendCarpets(
      {
        preferredSizes,
        preferredShane,
        preferredDensity,
        preferredColors,
        preferredStyle,
        preferredCollection,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        paymentPreference,
      },
      products
    );

    return NextResponse.json({
      success: true,
      totalMatches: recommendations.length,
      recommendations,
    });
  } catch (error: any) {
    console.error("Recommendation engine error:", error);
    return NextResponse.json(
      { error: "خطا در پردازش موتور پیشنهاد هوشمند فرش" },
      { status: 500 }
    );
  }
}
