import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  getSessionFromRequest,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getClientIp } from "@/lib/ip";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let response: NextResponse;

  try {
    const session = await getSessionFromRequest(req);
    if (session) {
      await prisma.user.updateMany({
        where: { id: session.userId, sessionVersion: session.sessionVersion },
        data: { sessionVersion: { increment: 1 } },
      });

      await logAuditEvent({
        userId: session.userId,
        action: "LOGOUT",
        entity: "User",
        entityId: session.userId,
        details: { allSessionsInvalidated: true },
        ipAddress: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      });
    }

    response = NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    console.error("Logout error:", error);
    response = NextResponse.json(
      { error: "خطا در خروج امن از سامانه" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getAuthCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
