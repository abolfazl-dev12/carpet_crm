import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, signSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { normalizeIranianPhone } from "@/lib/persian";
import { loginSchema } from "@/lib/validations/schemas";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "لطفاً ایمیل یا شماره موبایل معتبر و رمز عبور را وارد کنید." },
        { status: 400 }
      );
    }

    const { identifier, password } = parsed.data;
    const normalizedPhone = normalizeIranianPhone(identifier);

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { phone: normalizedPhone },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "اطلاعات ورود نادرست است یا حساب کاربری یافت نشد." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "حساب کاربری شما غیرفعال شده است. لطفاً با مدیر سیستم تماس بگیرید." },
        { status: 403 }
      );
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "اطلاعات ورود نادرست است یا رمز عبور اشتباه است." },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      phone: user.phone,
      avatar: user.avatar,
    });

    await logAuditEvent({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent"),
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });

    // Set HTTP-only secure cookie
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "خطای سرور در فرآیند ورود. لطفاً مجدداً تلاش نمایید." },
      { status: 500 }
    );
  }
}
