export type UserRole = "ADMIN" | "SALES_MANAGER" | "SALES_REP" | "VIEWER";

export type LeadSource =
  | "INSTAGRAM"
  | "WHATSAPP"
  | "TELEGRAM"
  | "WEBSITE"
  | "CALL"
  | "SMS"
  | "ADS"
  | "REFERRAL"
  | "STORE"
  | "OTHER";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "NEEDS_ASSESSMENT"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "DECISION_PENDING"
  | "WON"
  | "LOST"
  | "FUTURE_FOLLOWUP";

export type LeadTemperature = "HOT" | "WARM" | "COLD" | "UNQUALIFIED";

export type FollowUpType =
  | "CALL"
  | "WHATSAPP"
  | "SMS"
  | "SEND_CARPET_PHOTO"
  | "SEND_PRICE"
  | "SEND_CATALOG"
  | "NEGOTIATION"
  | "PAYMENT_REMINDER"
  | "IN_PERSON_VISIT"
  | "OTHER";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type FollowUpStatus = "PENDING" | "DONE" | "CANCELLED" | "OVERDUE";

export type PaymentMethod = "CASH" | "POS" | "CARD_TO_CARD" | "CHEQUE" | "ONLINE";

export type InstallmentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

export type OrderStatus = "DRAFT" | "CONFIRMED" | "PAID" | "COMPLETED" | "CANCELLED";

export interface CarpetNeedProfileDto {
  preferredSizes: string[];
  preferredShane?: string | null;
  preferredDensity?: string | null;
  preferredColors: string[];
  preferredStyle?: string | null;
  preferredCollection?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  quantity: number;
  paymentPreference: "CASH" | "INSTALLMENT" | "HYBRID";
  spaceType?: string | null;
  notes?: string | null;
}

export const STAGE_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; badgeClass: string }
> = {
  NEW: {
    label: "لید جدید",
    color: "#3B82F6",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  CONTACTED: {
    label: "تماس اولیه",
    color: "#06B6D4",
    badgeClass: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  },
  QUALIFIED: {
    label: "واجد شرایط",
    color: "#6366F1",
    badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  },
  NEEDS_ASSESSMENT: {
    label: "نیازسنجی ابعاد/طرح",
    color: "#8B5CF6",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  },
  PROPOSAL_SENT: {
    label: "پیشنهاد فرش و قیمت",
    color: "#F59E0B",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  NEGOTIATION: {
    label: "مذاکره و پیش‌فاکتور",
    color: "#EC4899",
    badgeClass: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
  },
  DECISION_PENDING: {
    label: "منتظر تصمیم مشتری",
    color: "#EAB308",
    badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  },
  WON: {
    label: "معامله موفق (فروش)",
    color: "#10B981",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  LOST: {
    label: "از دست رفته",
    color: "#EF4444",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  },
  FUTURE_FOLLOWUP: {
    label: "پیگیری در آینده",
    color: "#64748B",
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  },
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  INSTAGRAM: "اینستاگرام",
  WHATSAPP: "واتساپ",
  TELEGRAM: "تلگرام",
  WEBSITE: "وب‌سایت",
  CALL: "تماس مستقیم",
  SMS: "پیامک تبلیغاتی",
  ADS: "کمپین تبلیغاتی",
  REFERRAL: "معرفی مشتریان",
  STORE: "مراجعه حضوری به فروشگاه",
  OTHER: "سایر منابع",
};

export const FOLLOWUP_TYPE_LABELS: Record<FollowUpType, { label: string; icon: string }> = {
  CALL: { label: "تماس تلفنی", icon: "Phone" },
  WHATSAPP: { label: "پیام واتساپ", icon: "MessageCircle" },
  SMS: { label: "ارسال پیامک", icon: "Send" },
  SEND_CARPET_PHOTO: { label: "ارسال تصاویر و فیلم فرش", icon: "Image" },
  SEND_PRICE: { label: "اعلام قیمت و تخفیف", icon: "Tag" },
  SEND_CATALOG: { label: "ارسال کاتالوگ جامع", icon: "FileText" },
  NEGOTIATION: { label: "جلسه مذاکره حضوری/آنلاین", icon: "Users" },
  PAYMENT_REMINDER: { label: "یادآوری سررسید چک و قسط", icon: "CreditCard" },
  IN_PERSON_VISIT: { label: "پرو فرش در منزل / بازدید", icon: "Home" },
  OTHER: { label: "سایر پیگیری‌ها", icon: "Clock" },
};
