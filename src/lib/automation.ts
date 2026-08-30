import prisma from "./prisma";

/**
 * Evaluates automation rules and creates internal notifications
 */
export async function runAutomationRules() {
  const notificationsCreated: number[] = [];

  try {
    const now = new Date();

    // 1. Hot Leads Alert: Leads with score >= 55 without recent notifications
    const hotLeads = await prisma.lead.findMany({
      where: {
        score: { gte: 55 },
        status: { notIn: ["WON", "LOST"] },
        assignedToId: { not: null },
      },
      include: { assignedTo: true },
    });

    for (const lead of hotLeads) {
      if (!lead.assignedToId) continue;
      // Check if alert already sent in last 24h
      const recentNotif = await prisma.notification.findFirst({
        where: {
          userId: lead.assignedToId,
          type: "HOT_LEAD",
          linkUrl: `/leads/${lead.id}`,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (!recentNotif) {
        await prisma.notification.create({
          data: {
            userId: lead.assignedToId,
            type: "HOT_LEAD",
            title: `🔥 لید داغ نیازمند اقدام: ${lead.firstName} ${lead.lastName}`,
            message: `لید با امتیاز ${lead.score} آماده نهایی‌سازی خرید فرش است. لطفا سریعا تماس بگیرید.`,
            linkUrl: `/leads/${lead.id}`,
          },
        });
      }
    }

    // 2. Overdue Follow-ups: Pending follow-ups past their scheduled time
    const overdueFollowUps = await prisma.followUp.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lt: now },
        assignedToId: { not: null },
      },
    });

    for (const task of overdueFollowUps) {
      if (!task.assignedToId) continue;
      // Mark as OVERDUE
      await prisma.followUp.update({
        where: { id: task.id },
        data: { status: "OVERDUE" },
      });

      await prisma.notification.create({
        data: {
          userId: task.assignedToId,
          type: "OVERDUE_ALERT",
          title: `⚠️ پیگیری عقب‌افتاده: ${task.title}`,
          message: `زمان مقرر پیگیری سپری شده است. لطفا وضعیت را ثبت نمایید.`,
          linkUrl: `/followups`,
        },
      });
    }

    // 3. Upcoming Installments due in next 3 days
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const dueInstallments = await prisma.installment.findMany({
      where: {
        status: "PENDING",
        dueDate: { lte: threeDaysFromNow, gte: now },
      },
      include: {
        order: {
          include: { customer: true, seller: true },
        },
      },
    });

    for (const inst of dueInstallments) {
      const sellerId = inst.order.sellerId;
      if (sellerId) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: sellerId,
            type: "PAYMENT_DUE",
            linkUrl: `/installments`,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: sellerId,
              type: "PAYMENT_DUE",
              title: `💳 سررسید قسط مشتری: ${inst.order.customer.firstName} ${inst.order.customer.lastName}`,
              message: `قسط شماره ${inst.installmentNumber} به مبلغ ${inst.amount.toLocaleString()} تومان نزدیک است.`,
              linkUrl: `/installments`,
            },
          });
        }
      }
    }

    // 4. Low stock variants
    const lowStockVariants = await prisma.productVariant.findMany({
      where: {
        stock: { lte: 2 },
      },
      include: { product: true },
    });

    if (lowStockVariants.length > 0) {
      // Notify admins and managers
      const managers = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SALES_MANAGER"] }, isActive: true },
      });

      for (const manager of managers) {
        for (const variant of lowStockVariants.slice(0, 3)) {
          const existing = await prisma.notification.findFirst({
            where: {
              userId: manager.id,
              type: "LOW_STOCK",
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          });
          if (!existing) {
            await prisma.notification.create({
              data: {
                userId: manager.id,
                type: "LOW_STOCK",
                title: `📦 هشدار کمبود موجودی: فرش ${variant.product.name}`,
                message: `سایز ${variant.size} کد انبار ${variant.sku} تنها ${variant.stock} تخته موجود دارد.`,
                linkUrl: `/inventory`,
              },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error executing automation rules:", error);
  }
}
