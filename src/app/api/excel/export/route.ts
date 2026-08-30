import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import * as XLSX from "xlsx";
import { formatJalaliDate } from "@/lib/persian";
import { SOURCE_LABELS, STAGE_CONFIG } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "leads"; // leads | customers | products

    let dataToExport: any[] = [];
    const fileName = `carpet-crm-${type}.xlsx`;

    if (type === "leads") {
      const whereClause: any = {};
      // Server-side RBAC: Sales reps can only export their own leads
      if (session.role === "SALES_REP") {
        whereClause.assignedToId = session.userId;
      }

      const leads = await prisma.lead.findMany({
        where: whereClause,
        include: { assignedTo: true },
        orderBy: { createdAt: "desc" },
      });

      dataToExport = leads.map((l) => ({
        "نام و نام خانوادگی": `${l.firstName} ${l.lastName}`,
        "شماره همراه": l.phone,
        "استان": l.province,
        "شهر": l.city,
        "منبع لید": (SOURCE_LABELS as any)[l.source] || l.source,
        "وضعیت": (STAGE_CONFIG as any)[l.status]?.label || l.status,
        "امتیاز": l.score,
        "دمای لید": l.temperature,
        "بودجه تخمینی (تومان)": l.estimatedBudget || "-",
        "کارشناس مسئول": l.assignedTo?.name || "تعیین نشده",
        "تاریخ ایجاد": formatJalaliDate(l.createdAt),
      }));
    } else if (type === "customers") {
      const whereClause: any = {};
      // Server-side RBAC: Sales reps can only export their own customers
      if (session.role === "SALES_REP") {
        whereClause.assignedToId = session.userId;
      }

      const customers = await prisma.customer.findMany({
        where: whereClause,
        include: { assignedTo: true, orders: true },
        orderBy: { createdAt: "desc" },
      });

      dataToExport = customers.map((c) => ({
        "کد مشتری": c.code,
        "نام و نام خانوادگی": `${c.firstName} ${c.lastName}`,
        "شماره تماس": c.phone,
        "استان": c.province,
        "شهر": c.city,
        "آدرس": c.address || "-",
        "تعداد سفارش‌ها": c.orders.length,
        "کارشناس فروش": c.assignedTo?.name || "-",
        "تاریخ ثبت": formatJalaliDate(c.createdAt),
      }));
    } else if (type === "products") {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: { variants: true },
        orderBy: { createdAt: "desc" },
      });

      const rows: any[] = [];
      for (const p of products) {
        for (const v of p.variants) {
          rows.push({
            "کد محصول": p.code,
            "کد انبار (SKU)": v.sku,
            "نام طرح": p.name,
            "نقشه": p.pattern,
            "کلکسیون": p.collection,
            "شانه": p.shane,
            "تراکم": p.density,
            "رنگ زمینه": p.primaryColor,
            "سایز": v.size,
            "موجودی انبار": v.stock,
            "قیمت نقدی (تومان)": v.cashPrice,
            "قیمت اقساطی (تومان)": v.installmentPrice,
          });
        }
      }
      dataToExport = rows;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Excel export error:", error);
    return NextResponse.json({ error: "خطا در خروجی اکسل" }, { status: 500 });
  }
}
