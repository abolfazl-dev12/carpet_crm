import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  comparePassword,
  getAuthCookieOptions,
  signSessionToken,
  AUTH_COOKIE_NAME,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { normalizeIranianPhone } from "@/lib/persian";
import { loginSchema } from "@/lib/validations/schemas";
import {
  checkRateLimit,
  createRateLimitKey,
  resetRateLimit,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import {
  comparePasswordWithDummyHash,
  hashPassword,
  needsPasswordRehash,
} from "@/lib/password";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_IP_ATTEMPTS = 20;
const MAX_IDENTIFIER_ATTEMPTS = 5;
const INVALID_CREDENTIALS_MESSAGE = "نام کاربری یا رمز عبور اشتباه است.";
const RATE_LIMIT_MESSAGE =
  "تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً دقایقی دیگر دوباره تلاش کنید.";

function rateLimitResponse(limit: RateLimitResult) {
  return NextResponse.json(
    { error: RATE_LIMIT_MESSAGE },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(limit.resetInSeconds),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const userAgent = req.headers.get("user-agent");

    // A trusted-proxy IP bucket is optional. The identifier bucket is always enforced
    // and is reset only after a successful login.
    if (clientIp) {
      const ipKey = createRateLimitKey("login-ip", clientIp);
      const ipLimit = await checkRateLimit(ipKey, MAX_IP_ATTEMPTS, LOGIN_WINDOW_MS);
      if (!ipLimit.allowed) {
        return rateLimitResponse(ipLimit);
      }
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "لطفاً ایمیل یا شماره موبایل معتبر و رمز عبور را وارد کنید." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { identifier, password } = parsed.data;
    const normalizedPhone = normalizeIranianPhone(identifier);
    const normalizedEmail = identifier.toLowerCase().trim();
    const normalizedIdentifier = identifier.includes("@") ? normalizedEmail : normalizedPhone;

    const accountKey = createRateLimitKey("login-identifier", normalizedIdentifier);
    const accountLimit = await checkRateLimit(
      accountKey,
      MAX_IDENTIFIER_ATTEMPTS,
      LOGIN_WINDOW_MS
    );
    if (!accountLimit.allowed) {
      return rateLimitResponse(accountLimit);
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { phone: normalizedPhone },
        ],
      },
    });

    const isPasswordValid = user
      ? await comparePassword(password, user.passwordHash)
      : (await comparePasswordWithDummyHash(password), false);

    // Missing, disabled, and wrong-password accounts have the same status and response.
    if (!user || !user.isActive || !isPasswordValid) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_MESSAGE },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (needsPasswordRehash(user.passwordHash)) {
      const upgradedHash = await hashPassword(password);
      const upgraded = await prisma.user.updateMany({
        where: {
          id: user.id,
          passwordHash: user.passwordHash,
          sessionVersion: user.sessionVersion,
          isActive: true,
        },
        data: { passwordHash: upgradedHash },
      });

      if (upgraded.count !== 1) {
        return NextResponse.json(
          { error: INVALID_CREDENTIALS_MESSAGE },
          { status: 401, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    await resetRateLimit(accountKey);

    const token = await signSessionToken({
      userId: user.id,
      sessionVersion: user.sessionVersion,
    });

    await logAuditEvent({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: clientIp,
      userAgent: userAgent,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    return response;
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "خطای سرور در فرآیند ورود. لطفاً مجدداً تلاش نمایید." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
