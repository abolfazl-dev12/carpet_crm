import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { generateCustomerCode } from "@/lib/generators";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: "عدم احراز هویت" }, { status: 401 });

    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { needProfile: true },
    });

    if (!lead) return NextResponse.json({ error: "سرنخ یافت نشد" }, { status: 404 });

    // Server-side RBAC: Sales reps can only convert their own assigned leads
    if (session.role === "SALES_REP" && lead.assignedToId !== session.userId) {
      return NextResponse.json({ error: "عدم دسترسی برای تبدیل این سرنخ" }, { status: 403 });
    }

    if (lead.convertedToCustomerId) {
      return NextResponse.json({
        error: "این سرنخ قبلاً به مشتری تبدیل شده است.",
        customerId: lead.convertedToCustomerId,
      });
    }

    // Atomically generate code, create customer, update lead, and update deals in a transaction
    const customer = await prisma.$transaction(async (tx) => {
      const customerCode = await generateCustomerCode(tx);

      // Create Customer record
      const createdCustomer = await tx.customer.create({
        data: {
          code: customerCode,
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          secondPhone: lead.secondPhone,
          province: lead.province,
          city: lead.city,
          notes: `تبدیل شده از سرنخ فروش (منبع: ${lead.source}). یادداشت: ${lead.notes || "-"}`,
          assignedToId: lead.assignedToId || session.userId,
          needProfiles: lead.needProfile
            ? {
                create: {
                  preferredSizes: lead.needProfile.preferredSizes,
                  preferredShane: lead.needProfile.preferredShane,
                  preferredDensity: lead.needProfile.preferredDensity,
                  preferredColors: lead.needProfile.preferredColors,
                  preferredStyle: lead.needProfile.preferredStyle,
                  preferredCollection: lead.needProfile.preferredCollection,
                  budgetMin: lead.needProfile.budgetMin,
                  budgetMax: lead.needProfile.budgetMax,
                  quantity: lead.needProfile.quantity,
                  paymentPreference: lead.needProfile.paymentPreference,
                  spaceType: lead.needProfile.spaceType,
                  notes: lead.needProfile.notes,
                },
              }
            : undefined,
        },
      });

      // Update Lead status to WON and link customer
      await tx.lead.update({
        where: { id },
        data: {
          status: "WON",
          convertedToCustomerId: createdCustomer.id,
        },
      });

      // Link any existing deals
      await tx.deal.updateMany({
        where: { leadId: id },
        data: { customerId: createdCustomer.id, stage: "WON" },
      });

      return createdCustomer;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "STATUS_CHANGE",
      entity: "Lead",
      entityId: id,
      details: {
        action: "CONVERTED_TO_CUSTOMER",
        customerId: customer.id,
        customerCode: customer.code,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error("Error converting lead:", error);
    return NextResponse.json({ error: "خطا در تبدیل سرنخ به مشتری" }, { status: 500 });
  }
}
