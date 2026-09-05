import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import {
  canAccessOwners,
  canMutateCrm,
  checkRelatedResourceAccess,
  getDealScope,
  getLeadScope,
} from "@/lib/authorization";
import { logAuditEvent } from "@/lib/audit";
import { dealStageUpdateSchema } from "@/lib/validations/schemas";

class DealStageAuthorizationError extends Error {}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });
    if (!canMutateCrm(session)) {
      return NextResponse.json({ error: "نقش فقط‌خواندنی مجاز به تغییر مرحله معامله نیست." }, { status: 403 });
    }

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
    const relatedAccess = await checkRelatedResourceAccess(session, currentDeal);
    if (
      !canAccessOwners(session, [currentDeal.assignedToId]) ||
      relatedAccess !== "ALLOWED"
    ) {
      return NextResponse.json({ error: "عدم دسترسی برای تغییر مرحله این معامله" }, { status: 403 });
    }

    // Use Prisma transaction for atomic deal stage and linked lead status update
    const updatedDeal = await prisma.$transaction(async (tx) => {
      const txCurrentDeal = await tx.deal.findFirst({
        where: { ...getDealScope(session), id },
      });
      if (!txCurrentDeal) {
        throw new DealStageAuthorizationError(
          "عدم دسترسی برای تغییر مرحله این معامله"
        );
      }

      const deal = await tx.deal.update({
        where: { ...getDealScope(session), id },
        data: {
          stage,
          lostReason: stage === "LOST" ? lostReason : null,
          updatedAt: new Date(),
        },
      });

      // If deal has a linked lead, synchronize lead status atomically
      if (txCurrentDeal.leadId) {
        const updatedLead = await tx.lead.updateMany({
          where: { id: txCurrentDeal.leadId, ...getLeadScope(session) },
          data: { status: stage, lastActivityAt: new Date() },
        });
        if (updatedLead.count !== 1) {
          throw new DealStageAuthorizationError(
            "عدم دسترسی برای تغییر سرنخ مرتبط با معامله"
          );
        }
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
  } catch (error: unknown) {
    if (error instanceof DealStageAuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error updating deal stage:", error);
    return NextResponse.json({ error: "خطا در تغییر مرحله معامله" }, { status: 500 });
  }
}
