import { formatToman, toPersianDigits, formatJalaliDate } from "./persian";

export type CustomerSegment =
  | "HOT"
  | "WARM"
  | "COLD"
  | "AT_RISK"
  | "REPEAT_BUYER"
  | "HIGH_VALUE"
  | "NEW";

export interface ScoreFactor {
  factor: string;
  points: number;
  type: "POS" | "NEG";
}

export interface CustomerIntelligence {
  score: number; // 0 - 100
  segment: CustomerSegment;
  scoreBreakdown: ScoreFactor[];
  lastInteractionDate: Date | null;
  daysSinceLastInteraction: number | null;
  totalSpent: number;
  totalRemainingBalance: number;
  hasOverdueInstallment: boolean;
  hasOverdueFollowUp: boolean;
  activeDealsCount: number;
  activePipelineValue: number;
  nextBestAction: NextBestAction;
}

export interface NextBestAction {
  action: string;
  reason: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  suggestedDate: string;
  actionType: "CALL" | "RECOMMEND_CARPET" | "FOLLOWUP_DEAL" | "COLLECT_PAYMENT" | "LOYALTY_CHECK" | "INITIAL_CONTACT";
}

/**
 * Deterministic Customer Scoring & Intelligence Calculator
 */
export function evaluateCustomerIntelligence(customer: any): CustomerIntelligence {
  let score = 20; // Base score
  const scoreBreakdown: ScoreFactor[] = [{ factor: "امتیاز پایه پرونده مشتری", points: 20, type: "POS" }];

  const now = new Date();

  // 1. Calculate Interaction Dates & Recency
  const followUpDates = (customer.followUps || []).map((f: any) => new Date(f.completedAt || f.scheduledAt).getTime());
  const orderDates = (customer.orders || []).map((o: any) => new Date(o.createdAt).getTime());
  const dealDates = (customer.deals || []).map((d: any) => new Date(d.updatedAt || d.createdAt).getTime());
  const allInteractionTimestamps = [...followUpDates, ...orderDates, ...dealDates];

  let lastInteractionDate: Date | null = null;
  let daysSinceLastInteraction: number | null = null;

  if (allInteractionTimestamps.length > 0) {
    const maxTs = Math.max(...allInteractionTimestamps);
    lastInteractionDate = new Date(maxTs);
    daysSinceLastInteraction = Math.max(0, Math.floor((now.getTime() - maxTs) / (1000 * 60 * 60 * 24)));
  } else if (customer.createdAt) {
    const createdTs = new Date(customer.createdAt).getTime();
    daysSinceLastInteraction = Math.max(0, Math.floor((now.getTime() - createdTs) / (1000 * 60 * 60 * 24)));
  }

  // Recency Scoring
  if (daysSinceLastInteraction !== null) {
    if (daysSinceLastInteraction <= 3) {
      score += 20;
      scoreBreakdown.push({ factor: "تعامل بسیار تازه (کمتر از ۳ روز اخیر)", points: 20, type: "POS" });
    } else if (daysSinceLastInteraction <= 10) {
      score += 12;
      scoreBreakdown.push({ factor: "تعامل فعال در ۱۰ روز اخیر", points: 12, type: "POS" });
    } else if (daysSinceLastInteraction <= 25) {
      score += 5;
      scoreBreakdown.push({ factor: "تعامل در ماه جاری", points: 5, type: "POS" });
    } else if (daysSinceLastInteraction > 45) {
      score -= 15;
      scoreBreakdown.push({ factor: "عدم تعامل بیش از ۴۵ روز (ریسک رکود ارتباط)", points: -15, type: "NEG" });
    }
  }

  // 2. Orders & Financial History
  const orders = customer.orders || [];
  const completedOrders = orders.filter((o: any) => o.status === "PAID" || o.status === "CONFIRMED" || o.status === "COMPLETED");
  const totalSpent = completedOrders.reduce((sum: number, o: any) => sum + (o.finalAmount || 0), 0);
  const totalRemainingBalance = orders.reduce((sum: number, o: any) => sum + (o.remainingAmount || 0), 0);

  if (completedOrders.length >= 2) {
    score += 25;
    scoreBreakdown.push({ factor: `مشتری وفادار و خریدار مکرر (${toPersianDigits(completedOrders.length)} سفارش ثبت‌شده)`, points: 25, type: "POS" });
  } else if (completedOrders.length === 1) {
    score += 15;
    scoreBreakdown.push({ factor: "دارای سابقه خرید موفق در سیستم", points: 15, type: "POS" });
  }

  if (totalSpent >= 80000000) {
    score += 20;
    scoreBreakdown.push({ factor: `حجم خرید کلان بالای ۸۰ میلیون تومان (${formatToman(totalSpent)})`, points: 20, type: "POS" });
  } else if (totalSpent >= 30000000) {
    score += 10;
    scoreBreakdown.push({ factor: `حجم خرید بالای ۳۰ میلیون تومان (${formatToman(totalSpent)})`, points: 10, type: "POS" });
  }

  // 3. Pipeline Deals Momentum
  const deals = customer.deals || [];
  const activeDeals = deals.filter((d: any) => d.stage !== "WON" && d.stage !== "LOST");
  const activePipelineValue = activeDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

  if (activeDeals.length > 0) {
    const hasAdvancedDeal = activeDeals.some((d: any) => d.stage === "NEGOTIATION" || d.stage === "PROPOSAL_SENT" || d.stage === "DECISION_PENDING");
    if (hasAdvancedDeal) {
      score += 20;
      scoreBreakdown.push({ factor: "معامله در مرحله پیشرفته پایپ‌لاین (مذاکره/پیش‌فاکتور)", points: 20, type: "POS" });
    } else {
      score += 10;
      scoreBreakdown.push({ factor: "دارای معامله فعال در جریان پایپ‌لاین", points: 10, type: "POS" });
    }
  }

  // 4. Need Profile & Preference Quality
  const needProfile = customer.needProfiles?.[0];
  if (needProfile) {
    if (needProfile.preferredSizes && needProfile.preferredColors) {
      score += 10;
      scoreBreakdown.push({ factor: "پروفایل نیازسنجی و سلیقه فرش تکمیل است", points: 10, type: "POS" });
    }
    if (needProfile.budgetMax && needProfile.budgetMax > 0) {
      score += 5;
      scoreBreakdown.push({ factor: `بودجه مشخص اعلام شده (${formatToman(needProfile.budgetMax)})`, points: 5, type: "POS" });
    }
  }

  // 5. Penalties: Overdue Tasks & Overdue Installments
  const followUps = customer.followUps || [];
  const hasOverdueFollowUp = followUps.some((f: any) => f.status === "OVERDUE" || (f.status === "PENDING" && new Date(f.scheduledAt).getTime() < now.getTime()));

  if (hasOverdueFollowUp) {
    score -= 10;
    scoreBreakdown.push({ factor: "وظیفه پیگیری عقب‌افتاده و معوق دارد", points: -10, type: "NEG" });
  }

  // Check Overdue Installments
  let hasOverdueInstallment = false;
  for (const order of orders) {
    const installments = order.installments || [];
    const hasOverdue = installments.some((inst: any) => inst.status === "OVERDUE" || (inst.status === "PENDING" && new Date(inst.dueDate).getTime() < now.getTime()));
    if (hasOverdue) {
      hasOverdueInstallment = true;
      break;
    }
  }

  if (hasOverdueInstallment) {
    score -= 20;
    scoreBreakdown.push({ factor: "دارای اقساط یا چک‌های سررسید گذشته و معوقه", points: -20, type: "NEG" });
  }

  // Final Normalized Score 0 - 100
  const finalScore = Math.min(100, Math.max(0, score));

  // 6. Segment Determination
  let segment: CustomerSegment = "WARM";
  const isNewCustomer = customer.createdAt && (now.getTime() - new Date(customer.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000 && completedOrders.length === 0;

  if (hasOverdueInstallment || (hasOverdueFollowUp && daysSinceLastInteraction !== null && daysSinceLastInteraction > 20)) {
    segment = "AT_RISK";
  } else if (totalSpent >= 80000000 || activePipelineValue >= 80000000) {
    segment = "HIGH_VALUE";
  } else if (completedOrders.length >= 2) {
    segment = "REPEAT_BUYER";
  } else if (finalScore >= 75 || (activeDeals.length > 0 && finalScore >= 65)) {
    segment = "HOT";
  } else if (isNewCustomer) {
    segment = "NEW";
  } else if (finalScore >= 45) {
    segment = "WARM";
  } else {
    segment = "COLD";
  }

  // 7. Calculate Next Best Action
  const nextBestAction = calculateNextBestActionInternal({
    customer,
    finalScore,
    segment,
    daysSinceLastInteraction,
    hasOverdueInstallment,
    hasOverdueFollowUp,
    activeDeals,
    completedOrders,
    needProfile,
    totalRemainingBalance,
  });

  return {
    score: finalScore,
    segment,
    scoreBreakdown,
    lastInteractionDate,
    daysSinceLastInteraction,
    totalSpent,
    totalRemainingBalance,
    hasOverdueInstallment,
    hasOverdueFollowUp,
    activeDealsCount: activeDeals.length,
    activePipelineValue,
    nextBestAction,
  };
}

/**
 * Internal Next Best Action Generation
 */
function calculateNextBestActionInternal(params: {
  customer: any;
  finalScore: number;
  segment: CustomerSegment;
  daysSinceLastInteraction: number | null;
  hasOverdueInstallment: boolean;
  hasOverdueFollowUp: boolean;
  activeDeals: any[];
  completedOrders: any[];
  needProfile: any;
  totalRemainingBalance: number;
}): NextBestAction {
  const {
    customer,
    segment,
    daysSinceLastInteraction,
    hasOverdueInstallment,
    hasOverdueFollowUp,
    activeDeals,
    completedOrders,
    needProfile,
    totalRemainingBalance,
  } = params;

  // 1. Highest Priority: Overdue Installment
  if (hasOverdueInstallment) {
    return {
      action: "پیگیری فوری وصول چک و تسویه اقساط معوقه",
      reason: `مشتری دارای مانده اقساط معوق (${formatToman(totalRemainingBalance)}) با سررسید منقضی‌شده است.`,
      priority: "URGENT",
      suggestedDate: "همین امروز",
      actionType: "COLLECT_PAYMENT",
    };
  }

  // 2. Overdue Followup
  if (hasOverdueFollowUp) {
    return {
      action: "برقراری تماس پیگیری معوقه با مشتری",
      reason: "زمان مقرر پیگیری وظیفه سپری شده و پاسخ مشتری در سیستم ثبت نشده است.",
      priority: "HIGH",
      suggestedDate: "همین امروز",
      actionType: "CALL",
    };
  }

  // 3. Active Deal in Negotiation
  if (activeDeals.length > 0) {
    const topDeal = activeDeals[0];
    if (topDeal.stage === "NEGOTIATION" || topDeal.stage === "PROPOSAL_SENT") {
      return {
        action: `پیگیری نهایی‌سازی معامله "${topDeal.title}"`,
        reason: `معامله به ارزش ${formatToman(topDeal.value)} در مرحله ${topDeal.stage === "NEGOTIATION" ? "مذاکره نهایی" : "پیش‌فاکتور"} است.`,
        priority: "HIGH",
        suggestedDate: "طی ۲۴ ساعت آینده",
        actionType: "FOLLOWUP_DEAL",
      };
    }

    if (daysSinceLastInteraction !== null && daysSinceLastInteraction >= 5) {
      return {
        action: "تماس برای پیشبرد وضعیت معامله و ارسال عکس کاتالوگ",
        reason: `معامله فعال بیش از ${toPersianDigits(daysSinceLastInteraction)} روز است که تعامل جدیدی نداشته است.`,
        priority: "HIGH",
        suggestedDate: "امروز یا فردا",
        actionType: "CALL",
      };
    }
  }

  // 4. Customer has Need Profile but no active deals
  if (needProfile && activeDeals.length === 0) {
    const sizes = needProfile.preferredSizes ? JSON.parse(needProfile.preferredSizes) : [];
    return {
      action: "ارسال پیشنهاد طرح‌های منطبق با سلیقه مشتری از انبار",
      reason: `پروفایل سلیقه (${sizes.join("، ") || "طرح‌های محبوب"}) آماده دریافت پیشنهاد و شروع معامله است.`,
      priority: "MEDIUM",
      suggestedDate: "۲ روز آینده",
      actionType: "RECOMMEND_CARPET",
    };
  }

  // 5. Repeat Buyer Loyalty
  if (segment === "REPEAT_BUYER" || segment === "HIGH_VALUE") {
    if (daysSinceLastInteraction !== null && daysSinceLastInteraction >= 45) {
      return {
        action: "تماس وفاداری و معرفی جدیدترین کلکسیون‌های دستباف‌گونه",
        reason: `مشتری وفادار با ${toPersianDigits(completedOrders.length)} خرید قبلی بیش از ۴۵ روز است که سفارش جدیدی ثبت نکرده است.`,
        priority: "MEDIUM",
        suggestedDate: "این هفته",
        actionType: "LOYALTY_CHECK",
      };
    }
  }

  // 6. Inactive / Cold Re-engagement
  if (daysSinceLastInteraction !== null && daysSinceLastInteraction >= 30) {
    return {
      action: "ارسال پیامک یا تماس احوالپرسی و اطلاع‌رسانی جشنواره تخفیف یاشار",
      reason: `عدم تعامل با مشتری برای ${toPersianDigits(daysSinceLastInteraction)} روز متوالی.`,
      priority: "LOW",
      suggestedDate: "طی روزهای آینده",
      actionType: "INITIAL_CONTACT",
    };
  }

  // Default Action
  return {
    action: "نیازسنجی تکمیلی و هماهنگی برای ارسال تصویر طرح‌های جدید",
    reason: "حفظ ارتباط مستمر و ارائه پیشنهادات دوره‌ای فرش.",
    priority: "LOW",
    suggestedDate: "۳ روز آینده",
    actionType: "CALL",
  };
}

/**
 * Returns Segment Visual Badge Configuration
 */
export function getCustomerSegmentConfig(segment: CustomerSegment): {
  label: string;
  badgeClass: string;
  description: string;
} {
  switch (segment) {
    case "HOT":
      return {
        label: "داغ (آماده خرید)",
        badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        description: "دارای معاملات فعال و تعاملات نزدیک؛ احتمال خرید بسیار بالا",
      };
    case "HIGH_VALUE":
      return {
        label: "مشتری VIP / کلان",
        badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700",
        description: "حجم خرید یا بودجه معامله بالای ۸۰ میلیون تومان",
      };
    case "REPEAT_BUYER":
      return {
        label: "خریدار مکرر / وفادار",
        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        description: "ثبت حداقل ۲ فاکتور خرید موفق و تسویه‌شده",
      };
    case "AT_RISK":
      return {
        label: "در معرض ریسک",
        badgeClass: "bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800",
        description: "دارای چک/قسط معوق یا پیگیری فراموش‌شده در معامله فعال",
      };
    case "NEW":
      return {
        label: "مشتری جدید",
        badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
        description: "عضویت در ۷ روز گذشته بدون فاکتور قبلی",
      };
    case "WARM":
      return {
        label: "گرم و پیگیر",
        badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        description: "دارای علاقه به طرح‌ها و پاسخگویی به پیگیری‌ها",
      };
    case "COLD":
    default:
      return {
        label: "کم‌تعامل / راکد",
        badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        description: "بدون معامله فعال یا تعامل در ماه اخیر",
      };
  }
}
