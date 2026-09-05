import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSessionFromRequest, hashPassword } from "@/lib/auth";
import {
  ADMIN_ROLES,
  hasAllowedRole,
  MANAGEMENT_ROLES,
} from "@/lib/authorization";
import { logAuditEvent } from "@/lib/audit";
import { normalizeIranianPhone, isValidIranianMobile } from "@/lib/persian";
import { userCreateSchema, userUpdateSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!hasAllowedRole(session, MANAGEMENT_ROLES)) {
      return NextResponse.json({ error: "عدم دسترسی به فهرست کاربران" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            assignedLeads: true,
            assignedCustomers: true,
            orders: true,
            followUps: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error("Error fetching team users:", error);
    return NextResponse.json({ error: "خطا در دریافت لیست کاربران" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!hasAllowedRole(session, ADMIN_ROLES)) {
      return NextResponse.json({ error: "فقط مدیر سیستم مجاز به تعریف کاربر جدید است." }, { status: 403 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = userCreateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات کاربر نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, phone, password, role } = parsed.data;
    const cleanPhone = normalizeIranianPhone(phone);

    if (!isValidIranianMobile(cleanPhone)) {
      return NextResponse.json({ error: "شماره همراه وارد شده نامعتبر است." }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase().trim() }, { phone: cleanPhone }] },
    });
    if (existing) {
      return NextResponse.json({ error: "کاربری با این ایمیل یا شماره موبایل از قبل وجود دارد." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        phone: cleanPhone,
        passwordHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "خطا در ایجاد کاربر جدید" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!hasAllowedRole(session, ADMIN_ROLES)) {
      return NextResponse.json({ error: "فقط مدیر ارشد مجاز به ویرایش کاربر است." }, { status: 403 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = userUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات ارسالی نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, name, email, phone, role, password, isActive } = parsed.data;
    const cleanPhone = normalizeIranianPhone(phone);

    if (!isValidIranianMobile(cleanPhone)) {
      return NextResponse.json({ error: "شماره همراه نامعتبر است." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "کاربر مورد نظر یافت نشد." }, { status: 404 });
    }

    // Prevent deactivating or demoting the last active ADMIN
    if (targetUser.role === "ADMIN" && (isActive === false || (role && role !== "ADMIN"))) {
      const activeAdminCount = await prisma.user.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (activeAdminCount <= 1) {
        return NextResponse.json(
          { error: "امکان غیرفعال‌سازی یا تغییر نقش تنها مدیر ارشد فعال سیستم وجود ندارد." },
          { status: 400 }
        );
      }
    }

    const targetRole = role || targetUser.role;

    const updateData: Prisma.UserUpdateInput = {
      name,
      email: email.toLowerCase().trim(),
      phone: cleanPhone,
      role: targetRole,
      isActive: isActive !== undefined ? isActive : undefined,
    };

    const passwordChanged = Boolean(password);
    const roleChanged = targetRole !== targetUser.role;
    const activeStatusChanged = isActive !== undefined && isActive !== targetUser.isActive;

    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    if (passwordChanged || roleChanged || activeStatusChanged) {
      updateData.sessionVersion = { increment: 1 };
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      details: {
        name: updatedUser.name,
        role: updatedUser.role,
        sessionsInvalidated: passwordChanged || roleChanged || activeStatusChanged,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "خطا در ویرایش اطلاعات کاربر" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!hasAllowedRole(session, ADMIN_ROLES)) {
      return NextResponse.json({ error: "فقط مدیر ارشد مجاز به حذف کاربر است." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "شناسه کاربر الزامی است." }, { status: 400 });
    }

    if (id === session.userId) {
      return NextResponse.json({ error: "شما نمی‌توانید حساب کاربری جاری خود را حذف کنید." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "کاربر مورد نظر یافت نشد." }, { status: 404 });
    }

    if (targetUser.role === "ADMIN") {
      const activeAdminCount = await prisma.user.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (activeAdminCount <= 1) {
        return NextResponse.json(
          { error: "امکان حذف تنها مدیر ارشد فعال سیستم وجود ندارد." },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({
      where: { id },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "DELETE",
      entity: "User",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "خطا در حذف کاربر" }, { status: 500 });
  }
}
