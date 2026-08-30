import { z } from "zod";

// ==========================================
// Auth Schemas
// ==========================================
export const loginSchema = z.object({
  identifier: z.string().min(1, "ایمیل یا شماره همراه الزامی است").max(100),
  password: z.string().min(1, "رمز عبور الزامی است").max(128),
});

// ==========================================
// Customer Schemas
// ==========================================
export const customerCreateSchema = z.object({
  firstName: z.string().min(1, "نام الزامی است").max(50),
  lastName: z.string().min(1, "نام خانوادگی الزامی است").max(50),
  phone: z.string().min(10, "شماره تماس نامعتبر است").max(20),
  secondPhone: z.string().max(20).optional().nullable(),
  province: z.string().min(1, "استان الزامی است").max(50),
  city: z.string().min(1, "شهر الزامی است").max(50),
  address: z.string().max(300).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  assignedToId: z.string().max(100).optional().nullable(),
  preferredSizes: z.array(z.string()).optional(),
  preferredShane: z.string().max(20).optional().nullable(),
  preferredDensity: z.string().max(20).optional().nullable(),
  preferredColors: z.array(z.string()).optional(),
  preferredStyle: z.string().max(50).optional().nullable(),
  preferredCollection: z.string().max(50).optional().nullable(),
  budgetMin: z.number().nonnegative().optional().nullable(),
  budgetMax: z.number().nonnegative().optional().nullable(),
  quantity: z.number().int().positive().default(1),
  paymentPreference: z.enum(["CASH", "INSTALLMENT", "HYBRID"]).default("CASH"),
  spaceType: z.string().max(50).optional().nullable(),
});

export const customerUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().min(10).max(20).optional(),
  secondPhone: z.string().max(20).optional().nullable(),
  province: z.string().min(1).max(50).optional(),
  city: z.string().min(1).max(50).optional(),
  address: z.string().max(300).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  assignedToId: z.string().max(100).optional().nullable(),
  preferredSizes: z.array(z.string()).optional(),
  preferredShane: z.string().max(20).optional().nullable(),
  preferredDensity: z.string().max(20).optional().nullable(),
  preferredColors: z.array(z.string()).optional(),
  preferredStyle: z.string().max(50).optional().nullable(),
  preferredCollection: z.string().max(50).optional().nullable(),
  budgetMin: z.number().nonnegative().optional().nullable(),
  budgetMax: z.number().nonnegative().optional().nullable(),
  quantity: z.number().int().positive().optional(),
  paymentPreference: z.enum(["CASH", "INSTALLMENT", "HYBRID"]).optional(),
  spaceType: z.string().max(50).optional().nullable(),
});

// ==========================================
// Lead Schemas
// ==========================================
export const leadCreateSchema = z.object({
  firstName: z.string().min(1, "نام الزامی است").max(50),
  lastName: z.string().min(1, "نام خانوادگی الزامی است").max(50),
  phone: z.string().min(10, "شماره تماس الزامی است").max(20),
  secondPhone: z.string().max(20).optional().nullable(),
  province: z.string().min(1, "استان الزامی است").max(50),
  city: z.string().min(1, "شهر الزامی است").max(50),
  source: z.enum([
    "INSTAGRAM",
    "WHATSAPP",
    "TELEGRAM",
    "WEBSITE",
    "CALL",
    "SMS",
    "ADS",
    "REFERRAL",
    "STORE",
    "OTHER",
  ]).default("INSTAGRAM"),
  campaign: z.string().max(100).optional().nullable(),
  score: z.number().int().min(0).max(100).default(15),
  estimatedBudget: z.number().nonnegative().optional().nullable(),
  purchaseTimeframe: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  assignedToId: z.string().max(100).optional().nullable(),
  preferredSizes: z.array(z.string()).optional(),
  preferredShane: z.string().max(20).optional().nullable(),
  preferredDensity: z.string().max(20).optional().nullable(),
  preferredColors: z.array(z.string()).optional(),
  preferredStyle: z.string().max(50).optional().nullable(),
  preferredCollection: z.string().max(50).optional().nullable(),
  paymentPreference: z.enum(["CASH", "INSTALLMENT", "HYBRID"]).default("CASH"),
  spaceType: z.string().max(50).optional().nullable(),
});

export const leadUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().min(10).max(20).optional(),
  secondPhone: z.string().max(20).optional().nullable(),
  province: z.string().min(1).max(50).optional(),
  city: z.string().min(1).max(50).optional(),
  source: z.enum([
    "INSTAGRAM",
    "WHATSAPP",
    "TELEGRAM",
    "WEBSITE",
    "CALL",
    "SMS",
    "ADS",
    "REFERRAL",
    "STORE",
    "OTHER",
  ]).optional(),
  campaign: z.string().max(100).optional().nullable(),
  status: z.enum([
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "NEEDS_ASSESSMENT",
    "PROPOSAL_SENT",
    "NEGOTIATION",
    "DECISION_PENDING",
    "WON",
    "LOST",
    "FUTURE_FOLLOWUP",
  ]).optional(),
  score: z.number().int().min(0).max(100).optional(),
  estimatedBudget: z.number().nonnegative().optional().nullable(),
  purchaseTimeframe: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  assignedToId: z.string().max(100).optional().nullable(),
  preferredSizes: z.array(z.string()).optional(),
  preferredShane: z.string().max(20).optional().nullable(),
  preferredDensity: z.string().max(20).optional().nullable(),
  preferredColors: z.array(z.string()).optional(),
  preferredStyle: z.string().max(50).optional().nullable(),
  preferredCollection: z.string().max(50).optional().nullable(),
  paymentPreference: z.enum(["CASH", "INSTALLMENT", "HYBRID"]).optional(),
  spaceType: z.string().max(50).optional().nullable(),
});

// ==========================================
// Order & Payment Schemas
// ==========================================
export const orderItemSchema = z.object({
  variantId: z.string().min(1, "شناسه تنوع فرش الزامی است"),
  quantity: z.number().int().positive("تعداد باید حداقل ۱ تخته باشد"),
  unitPrice: z.number().nonnegative("قیمت واحد نمی‌تواند منفی باشد"),
});

export const orderCreateSchema = z.object({
  customerId: z.string().min(1, "شناسه مشتری الزامی است"),
  items: z.array(orderItemSchema).min(1, "حداقل یک قلم فرش الزامی است"),
  discountAmount: z.number().nonnegative().default(0),
  paymentMethod: z.enum([
    "CASH",
    "POS",
    "CARD_TO_CARD",
    "CHEQUE",
    "ONLINE",
    "INSTALLMENT",
  ]).default("CASH"),
  initialPaidAmount: z.number().nonnegative().default(0),
  installmentCount: z.number().int().min(0).max(24).default(0),
  shippingAddress: z.string().max(300).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const installmentUpdateSchema = z.object({
  id: z.string().min(1, "شناسه قسط الزامی است"),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]),
  paymentTracking: z.string().max(100).optional().nullable(),
  chequeNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// ==========================================
// Pipeline / Deal Schemas
// ==========================================
export const dealCreateSchema = z.object({
  title: z.string().min(1, "عنوان معامله الزامی است").max(100),
  value: z.number().nonnegative().default(0),
  stage: z.enum([
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "NEEDS_ASSESSMENT",
    "PROPOSAL_SENT",
    "NEGOTIATION",
    "DECISION_PENDING",
    "WON",
    "LOST",
    "FUTURE_FOLLOWUP",
  ]).default("NEW"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  leadId: z.string().max(100).optional().nullable(),
  customerId: z.string().max(100).optional().nullable(),
  productId: z.string().max(100).optional().nullable(),
  variantId: z.string().max(100).optional().nullable(),
  assignedToId: z.string().max(100).optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const dealUpdateSchema = z.object({
  id: z.string().min(1, "شناسه معامله الزامی است"),
  title: z.string().min(1).max(100),
  value: z.number().nonnegative().optional(),
  stage: z.enum([
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "NEEDS_ASSESSMENT",
    "PROPOSAL_SENT",
    "NEGOTIATION",
    "DECISION_PENDING",
    "WON",
    "LOST",
    "FUTURE_FOLLOWUP",
  ]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  notes: z.string().max(1000).optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
});

export const dealStageUpdateSchema = z.object({
  stage: z.enum([
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "NEEDS_ASSESSMENT",
    "PROPOSAL_SENT",
    "NEGOTIATION",
    "DECISION_PENDING",
    "WON",
    "LOST",
    "FUTURE_FOLLOWUP",
  ]),
  lostReason: z.string().max(500).optional().nullable(),
});

// ==========================================
// Follow-Up Schemas
// ==========================================
export const followUpCreateSchema = z.object({
  title: z.string().min(1, "عنوان پیگیری الزامی است").max(150),
  type: z.enum([
    "CALL",
    "WHATSAPP",
    "SMS",
    "SEND_CARPET_PHOTO",
    "SEND_PRICE",
    "SEND_CATALOG",
    "NEGOTIATION",
    "PAYMENT_REMINDER",
    "IN_PERSON_VISIT",
    "OTHER",
  ]).default("CALL"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  scheduledAt: z.string().min(1, "تاریخ پیگیری الزامی است"),
  leadId: z.string().max(100).optional().nullable(),
  customerId: z.string().max(100).optional().nullable(),
  dealId: z.string().max(100).optional().nullable(),
  assignedToId: z.string().max(100).optional().nullable(),
});

export const followUpUpdateSchema = z.object({
  id: z.string().min(1, "شناسه پیگیری الزامی است"),
  status: z.enum(["PENDING", "DONE", "CANCELLED", "OVERDUE"]),
  resultNote: z.string().max(1000).optional().nullable(),
});

// ==========================================
// Inventory Schemas
// ==========================================
export const inventoryMovementSchema = z.object({
  variantId: z.string().min(1, "شناسه کالا الزامی است"),
  type: z.enum([
    "PURCHASE",
    "RESERVATION",
    "RELEASE_RESERVATION",
    "SALE",
    "RETURN",
    "ADJUSTMENT",
  ]),
  quantity: z.number().int().min(1, "تعداد باید حداقل ۱ باشد"),
  reason: z.string().min(1, "دلیل گردش انبار الزامی است").max(300),
});

// ==========================================
// Product Schemas
// ==========================================
export const productVariantInputSchema = z.object({
  size: z.string().min(1),
  areaSquareMeters: z.number().positive().default(12),
  cashPrice: z.number().positive(),
  installmentPrice: z.number().positive().optional(),
  stock: z.number().int().nonnegative().default(0),
});

export const productCreateSchema = z.object({
  code: z.string().min(1, "کد محصول الزامی است").max(50),
  name: z.string().min(1, "نام فرش الزامی است").max(100),
  pattern: z.string().min(1, "نقشه فرش الزامی است").max(50),
  collection: z.string().min(1, "کلکسیون الزامی است").max(50),
  shane: z.number().int().positive("شانه باید عدد مثبت باشد"),
  density: z.number().int().positive("تراکم باید عدد مثبت باشد"),
  colorCount: z.number().int().positive().default(8),
  yarnMaterial: z.string().max(100).optional().nullable(),
  weavingMachine: z.string().max(100).optional().nullable(),
  style: z.string().max(50).optional().nullable(),
  primaryColor: z.string().max(50).optional().nullable(),
  images: z.array(z.string()).optional(),
  description: z.string().max(1000).optional().nullable(),
  variants: z.array(productVariantInputSchema).optional(),
});

export const productUpdateSchema = z.object({
  id: z.string().min(1, "شناسه فرش الزامی است"),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  pattern: z.string().max(50).optional().nullable(),
  collection: z.string().max(50).optional().nullable(),
  shane: z.number().int().positive().optional(),
  density: z.number().int().positive().optional(),
  yarnMaterial: z.string().max(100).optional().nullable(),
  weavingMachine: z.string().max(100).optional().nullable(),
  style: z.string().max(50).optional().nullable(),
  primaryColor: z.string().max(50).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});

// ==========================================
// User / Team Schemas
// ==========================================
export const userCreateSchema = z.object({
  name: z.string().min(1, "نام و نام خانوادگی الزامی است").max(100),
  email: z.string().email("ایمیل نامعتبر است").max(100),
  phone: z.string().min(10, "شماره همراه نامعتبر است").max(20),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد").max(128),
  role: z.enum(["ADMIN", "SALES_MANAGER", "SALES_REP", "VIEWER"]).default("SALES_REP"),
});

export const userUpdateSchema = z.object({
  id: z.string().min(1, "شناسه کاربر الزامی است"),
  name: z.string().min(1).max(100),
  email: z.string().email().max(100),
  phone: z.string().min(10).max(20),
  role: z.enum(["ADMIN", "SALES_MANAGER", "SALES_REP", "VIEWER"]).optional(),
  password: z.string().min(6).max(128).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});
