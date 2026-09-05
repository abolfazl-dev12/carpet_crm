import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "عدم احراز هویت", user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: session.userId,
          name: session.name,
          email: session.email,
          phone: session.phone,
          role: session.role,
          avatar: session.avatar,
          isActive: true,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: "خطا در احراز هویت", user: null },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
