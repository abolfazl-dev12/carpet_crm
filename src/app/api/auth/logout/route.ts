import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (session) {
    await logAuditEvent({
      userId: session.userId,
      action: "LOGOUT",
      entity: "User",
      entityId: session.userId,
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
