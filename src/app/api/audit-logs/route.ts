import { NextRequest, NextResponse } from "next/server";
import { AuditAction, type Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { ADMIN_ROLES, hasAllowedRole, isEnumValue } from "@/lib/authorization";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!hasAllowedRole(session, ADMIN_ROLES)) {
      return NextResponse.json({ error: "فقط مدیر ارشد مجاز به مشاهده لاگ‌هاست." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity");
    const action = searchParams.get("action");

    const whereClause: Prisma.AuditLogWhereInput = {};
    if (entity) whereClause.entity = entity;
    if (action) {
      if (!isEnumValue(Object.values(AuditAction), action)) {
        return NextResponse.json({ error: "نوع عملیات لاگ نامعتبر است." }, { status: 400 });
      }
      whereClause.action = action;
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: "خطا در دریافت لاگ‌های امنیتی" }, { status: 500 });
  }
}
