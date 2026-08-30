import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest, hashPassword } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { normalizeIranianPhone, isValidIranianMobile } from "@/lib/persian";
import { userCreateSchema, userUpdateSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

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
  } catch (error: any) {
    console.error("Error fetching team users:", error);
    return NextResponse.json({ error: "خطا در دریافت لیست کاربران" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "ADMIN") {
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
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "خطا در ایجاد کاربر جدید" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SALES_MANAGER")) {
      return NextResponse.json({ error: "عدم دسترسی کافی برای ویرایش کاربر" }, { status: 403 });
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

    // Role escalation prevention: Only ADMIN can change someone's role to ADMIN
    let targetRole = role;
    if (session.role !== "ADMIN" && role === "ADMIN") {
      targetRole = undefined; // Deny elevating to ADMIN by non-admin
    }

    const updateData: any = {
      name,
      email: email.toLowerCase().trim(),
      phone: cleanPhone,
      role: targetRole || undefined,
      isActive: isActive !== undefined ? isActive : undefined,
    };

    if (password && password.trim().length >= 6) {
      updateData.passwordHash = await hashPassword(password.trim());
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
      details: { name: updatedUser.name, role: updatedUser.role },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "خطا در ویرایش اطلاعات کاربر" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "ADMIN") {
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
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "خطا در حذف کاربر" }, { status: 500 });
  }
}
