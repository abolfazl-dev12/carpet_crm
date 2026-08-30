import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { dealStageUpdateSchema } from "@/lib/validations/schemas";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { id } = await params;
    const rawBody = await req.json().catch(() => null);
    const parsed = dealStageUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "مرحله معامله نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { stage, lostReason } = parsed.data;

    const currentDeal = await prisma.deal.findUnique({ where: { id } });
    if (!currentDeal) {
      return NextResponse.json({ error: "معامله یافت نشد." }, { status: 404 });
    }

    // Server-side RBAC: Sales reps can only update stages for their assigned deals
    if (session.role === "SALES_REP" && currentDeal.assignedToId !== session.userId) {
      return NextResponse.json({ error: "عدم دسترسی برای تغییر مرحله این معامله" }, { status: 403 });
    }

    // Use Prisma transaction for atomic deal stage and linked lead status update
    const updatedDeal = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.update({
        where: { id },
        data: {
          stage,
          lostReason: stage === "LOST" ? lostReason : null,
          updatedAt: new Date(),
        },
      });

      // If deal has a linked lead, synchronize lead status atomically
      if (currentDeal.leadId) {
        await tx.lead.update({
          where: { id: currentDeal.leadId },
          data: { status: stage, lastActivityAt: new Date() },
        });
      }

      return deal;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "STATUS_CHANGE",
      entity: "Deal",
      entityId: id,
      details: { fromStage: currentDeal.stage, toStage: stage },
    });

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (error: any) {
    console.error("Error updating deal stage:", error);
    return NextResponse.json({ error: "خطا در تغییر مرحله معامله" }, { status: 500 });
  }
}
