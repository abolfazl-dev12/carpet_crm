export type LeadTemperature = "HOT" | "WARM" | "COLD" | "UNQUALIFIED";

export interface ScoreRuleEvent {
  type:
    | "PRICE_INQUIRY"         // استعلام قیمت (+10)
    | "PHOTO_CATALOG_REQUEST" // درخواست عکس یا کاتالوگ (+5)
    | "PRODUCT_SELECTED"      // انتخاب محصول مشخص (+15)
    | "INSTALLMENT_INQUIRY"   // سؤال درباره شرایط اقساط (+15)
    | "BUDGET_DECLARED"       // اعلام بودجه (+10)
    | "SHIPPING_REQUEST"      // درخواست ارسال / پرو (+20)
    | "FOLLOWUP_REPLIED"      // پاسخ به پیگیری (+5)
    | "CONSECUTIVE_NO_ANSWER" // عدم پاسخ مکرر (-10)
    | "INVALID_NUMBER";       // شماره نامعتبر (-20)
  note?: string;
}

export const SCORE_WEIGHTS: Record<ScoreRuleEvent["type"], number> = {
  PRICE_INQUIRY: 10,
  PHOTO_CATALOG_REQUEST: 5,
  PRODUCT_SELECTED: 15,
  INSTALLMENT_INQUIRY: 15,
  BUDGET_DECLARED: 10,
  SHIPPING_REQUEST: 20,
  FOLLOWUP_REPLIED: 5,
  CONSECUTIVE_NO_ANSWER: -10,
  INVALID_NUMBER: -20,
};

/**
 * Calculates lead temperature based on total score
 */
export function calculateTemperature(score: number): LeadTemperature {
  if (score >= 55) return "HOT";
  if (score >= 35) return "WARM";
  if (score >= 15) return "COLD";
  return "UNQUALIFIED";
}

/**
 * Persian label for temperature
 */
export function getTemperatureLabel(temp: LeadTemperature): {
  label: string;
  colorClass: string;
  badgeClass: string;
} {
  switch (temp) {
    case "HOT":
      return {
        label: "داغ (آماده خرید)",
        colorClass: "text-rose-600 dark:text-rose-400",
        badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      };
    case "WARM":
      return {
        label: "گرم (علاقه‌مند)",
        colorClass: "text-amber-600 dark:text-amber-400",
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      };
    case "COLD":
      return {
        label: "سرد (مرحله اولیه)",
        colorClass: "text-blue-600 dark:text-blue-400",
        badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      };
    case "UNQUALIFIED":
    default:
      return {
        label: "ضعیف / نامعتبر",
        colorClass: "text-gray-500 dark:text-gray-400",
        badgeClass: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
      };
  }
}
