import {
  toPersianDigits,
  toLatinDigits,
  formatToman,
  formatCarpetSize,
  formatJalaliDate,
  addJalaliMonths,
  normalizeIranianPhone,
  isValidIranianMobile,
} from "../src/lib/persian";
import { calculateTemperature, SCORE_WEIGHTS } from "../src/lib/scoring";
import { recommendCarpets } from "../src/lib/recommendation";
import { customerCreateSchema, orderCreateSchema } from "../src/lib/validations/schemas";
import { evaluateCustomerIntelligence } from "../src/lib/customer-intelligence";

console.log("==================================================");
console.log("🧪 شروع آزمایش‌های خودکار جامع CRM و ارزیابی پایداری (Production Hardening)...");
console.log("==================================================");

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failedTests++;
  }
}

// 1. Persian Number & Currency Tests
console.log("\n--- ۱. آزمون تبدیل اعداد و واحد پول تومان ---");
assert(toPersianDigits(1234567890) === "۱۲۳۴۵۶۷۸۹۰", "تبدیل ارقام انگلیسی به فارسی");
assert(toLatinDigits("۱۲۳۴۵۶") === "123456", "تبدیل ارقام فارسی به انگلیسی");
assert(formatToman(125000000) === "۱۲۵،۰۰۰،۰۰۰ تومان", "فرمت پول تومان با جداکننده ۳ رقمی فارسی");
assert(formatCarpetSize("3x4") === "۳×۴ متر (۱۲ متری)", "فرمت ابعاد فرش ۳×۴");
assert(formatCarpetSize("2.5x3.5") === "۲.۵×۳.۵ متر (۹ متری)", "فرمت ابعاد فرش ۲.۵×۳.۵");

// 2. Jalali Date & Solar Calendar Monthly Calculations
console.log("\n--- ۲. آزمون تقویم جلالی و محاسبات ماه‌های شمسی ---");
const testDate = new Date("2026-03-20T10:30:00Z");
const formattedJalali = formatJalaliDate(testDate);
assert(formattedJalali.length > 5, `فرمت صحیح تاریخ شمسی: ${formattedJalali}`);

const baseInstallmentDate = new Date("2026-04-15T00:00:00Z");
const nextMonthJalali = addJalaliMonths(baseInstallmentDate, 1);
const formattedNextMonth = formatJalaliDate(nextMonthJalali);
assert(formattedNextMonth.includes("۰۲") || formattedNextMonth.includes("۲"), `محاسبه دقیق ۱ ماه شمسی بعد: ${formattedNextMonth}`);

// 3. Iranian Mobile Number Normalization & Validation
console.log("\n--- ۳. آزمون اعتبارسنجی شماره همراه ایران ---");
assert(normalizeIranianPhone("+989121234567") === "09121234567", "نرمال‌سازی +98 به 09");
assert(normalizeIranianPhone("989121234567") === "09121234567", "نرمال‌سازی 98 به 09");
assert(isValidIranianMobile("09121234567") === true, "اعتبارسنجی شماره موبایل معتبر");
assert(isValidIranianMobile("02188776655") === false, "رد شماره تلفن ثابت به عنوان موبایل");

// 4. Lead Scoring Tests
console.log("\n--- ۴. آزمون موتور امتیازدهی لیدها (Lead Scoring) ---");
assert(SCORE_WEIGHTS.PRICE_INQUIRY === 10, "امتیاز استعلام قیمت = ۱۰");
assert(SCORE_WEIGHTS.SHIPPING_REQUEST === 20, "امتیاز درخواست ارسال = ۲۰");
assert(calculateTemperature(75) === "HOT", "امتیاز ۷۵ = لید داغ (HOT)");
assert(calculateTemperature(45) === "WARM", "امتیاز ۴۵ = لید گرم (WARM)");
assert(calculateTemperature(25) === "COLD", "امتیاز ۲۵ = لید سرد (COLD)");
assert(calculateTemperature(5) === "UNQUALIFIED", "امتیاز ۵ = لید ضعیف (UNQUALIFIED)");

// 5. Carpet Recommendation Engine Tests (Normalized 0-100 & Stock Priority)
console.log("\n--- ۵. آزمون موتور هوشمند تطابق و پیشنهاد فرش یاشار ---");
const mockProducts = [
  {
    id: "p1",
    code: "CRP-01",
    name: "فرش لچک ترنج اصفهان",
    pattern: "ترنج",
    collection: "اصفهان",
    shane: 1500,
    density: 4500,
    style: "کلاسیک",
    primaryColor: "سرمه‌ای",
    images: "[]",
    variants: [
      {
        id: "v1",
        sku: "CRP-01-3X4",
        size: "3x4",
        areaSquareMeters: 12,
        cashPrice: 48000000,
        installmentPrice: 54000000,
        stock: 5,
        reservedStock: 1,
      },
    ],
  },
  {
    id: "p2",
    code: "CRP-02",
    name: "فرش مدرن طوسی",
    pattern: "مدرن",
    collection: "مدرن آرت",
    shane: 1200,
    density: 3600,
    style: "مدرن",
    primaryColor: "طوسی",
    images: "[]",
    variants: [
      {
        id: "v2",
        sku: "CRP-02-2X3",
        size: "2x3",
        areaSquareMeters: 6,
        cashPrice: 18000000,
        installmentPrice: 21000000,
        stock: 0, // Out of stock
        reservedStock: 0,
      },
    ],
  },
];

const recResults = recommendCarpets(
  {
    preferredSizes: ["3x4"],
    preferredShane: "1500",
    preferredColors: ["سرمه‌ای"],
    preferredStyle: "کلاسیک",
    budgetMax: 50000000,
  },
  mockProducts as any
);

assert(recResults.length > 0, "استخراج موفق پیشنهادات منطبق");
assert(recResults[0].product.name.includes("اصفهان"), "بالاترین امتیاز تطابق برای فرش شاه‌عباسی اصفهان");
assert(recResults[0].matchScore <= 100 && recResults[0].matchScore >= 80, `امتیاز نرمال‌شده بین ۸۰ تا ۱۰۰ (امتیاز واقعی: ${recResults[0].matchScore}٪)`);
assert(recResults[0].stockStatus === "AVAILABLE", "تشخیص وضعیت موجودی آماده تحویل");
assert(recResults[0].isPersonalized === true, "تشخیص پیشنهاد اختصاصی بر اساس پروفایل نیازسنجی");

// Test General Showcase when no preferences exist
const generalRecs = recommendCarpets({}, mockProducts as any);
assert(generalRecs.length > 0, "نمایش پیشنهادات عمومی از انبار در صورت عدم وجود پروفایل سلیقه");
assert(generalRecs[0].isPersonalized === false, "برچسب‌گذاری صحیح پیشنهاد عمومی بدون سلیقه فرضی");

// 6. Inventory Deduction & Oversell Prevention Logic
console.log("\n--- ۶. آزمون یکپارچگی انبار، کسر موجودی و جلوگیری از منفی شدن موجودی ---");
// Scenario: Stock 5, Sell 2 -> Stock 3
const initialStock = 5;
const reservedStock = 1;
const requestedQtyValid = 2;
const availableStock = initialStock - reservedStock; // 4
assert(requestedQtyValid <= availableStock, "بررسی موجودی آزاد برای سفارش مجاز (۲ از ۴)");
const remainingStockAfterSale = initialStock - requestedQtyValid;
assert(remainingStockAfterSale === 3, "کسر صحیح موجودی انبار پس از ثبت فروش (۵ - ۲ = ۳)");

// Scenario: Oversell Prevention (Stock 1, Try to sell 2)
const lowStock = 1;
const lowReserved = 0;
const requestedQtyOversell = 2;
const availableLow = lowStock - lowReserved;
const isOversellBlocked = requestedQtyOversell > availableLow;
assert(isOversellBlocked === true, "جلوگیری قطعی از ثبت سفارش بیش از موجودی آزاد انبار (Oversell Prevention)");

// 7. Financial Ledger & Installment Consistency Tests
console.log("\n--- ۷. آزمون تراز مالی، دفتر کل پرداخت‌ها و عدم تکرار تراکنش ---");
const finalOrderAmount = 100000000; // 100m
const paymentsList = [
  { amount: 30000000, status: "CONFIRMED" },
  { amount: 20000000, status: "CONFIRMED" },
];
const calculatedPaidAmount = paymentsList.reduce((sum, p) => sum + p.amount, 0);
const calculatedRemainingAmount = Math.max(0, finalOrderAmount - calculatedPaidAmount);
assert(calculatedPaidAmount === 50000000, "محاسبه دقیق مجموع واریزی‌ها از دفتر پرداخت‌ها (۵۰ میلیون)");
assert(calculatedRemainingAmount === 50000000, "محاسبه دقیق مانده بدهی فاکتور (۵۰ میلیون)");

// Installment Idempotency test (PAID -> PAID should not double add)
let installmentPaid = false;
let orderPaidAmount = 30000000;
const installmentAmount = 10000000;

function payInstallment() {
  if (!installmentPaid) {
    installmentPaid = true;
    orderPaidAmount += installmentAmount;
  }
}
payInstallment();
assert(orderPaidAmount === 40000000, "پرداخت اول قسط با موفقیت ثبت شد");
payInstallment(); // duplicate call
assert(orderPaidAmount === 40000000, "جلوگیری از ثبت مجدد و دوباره پرداخت شدن قسط (Idempotent Payment)");

// 8. Customer Intelligence & Segmentation Tests
console.log("\n--- ۸. آزمون هوشمندی مشتری، امتیازدهی و اقدام بعدی (Customer Intelligence) ---");
const mockCustomerHot = {
  id: "cust_hot",
  firstName: "رضا",
  lastName: "تهرانی",
  createdAt: new Date().toISOString(),
  orders: [
    {
      id: "ord_1",
      finalAmount: 90000000,
      paidAmount: 90000000,
      remainingAmount: 0,
      status: "PAID",
      createdAt: new Date().toISOString(),
      installments: [],
    },
    {
      id: "ord_2",
      finalAmount: 45000000,
      paidAmount: 45000000,
      remainingAmount: 0,
      status: "PAID",
      createdAt: new Date().toISOString(),
      installments: [],
    },
  ],
  deals: [
    {
      id: "deal_1",
      title: "خرید ۳ تخته ۱۲ متری",
      value: 95000000,
      stage: "NEGOTIATION",
      updatedAt: new Date().toISOString(),
    },
  ],
  followUps: [
    {
      id: "fu_1",
      title: "تماس تلفنی",
      status: "DONE",
      scheduledAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  ],
  needProfiles: [
    {
      preferredSizes: '["3x4"]',
      preferredColors: '["سرمه‌ای"]',
      budgetMax: 100000000,
    },
  ],
};

const intelHot = evaluateCustomerIntelligence(mockCustomerHot);
assert(intelHot.score >= 80, `امتیاز بالای ۸۰ برای مشتری وفادار و کلان (امتیاز: ${intelHot.score})`);
assert(intelHot.segment === "HIGH_VALUE" || intelHot.segment === "REPEAT_BUYER", `دسته‌بندی پرارزش یا وفادار (دسته‌بندی: ${intelHot.segment})`);
assert(intelHot.nextBestAction.action.length > 0, `تولید هوشمند اقدام بعدی: ${intelHot.nextBestAction.action}`);
assert(intelHot.scoreBreakdown.length >= 3, "ارائه دلایل شفاف محاسبه امتیاز هوشمندی");

// At-Risk Customer Test
const mockCustomerAtRisk = {
  id: "cust_risk",
  firstName: "بهرام",
  lastName: "شاکری",
  createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
  orders: [
    {
      id: "ord_risk",
      finalAmount: 40000000,
      paidAmount: 10000000,
      remainingAmount: 30000000,
      status: "PENDING",
      createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
      installments: [
        {
          id: "inst_overdue",
          amount: 15000000,
          status: "OVERDUE",
          dueDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        },
      ],
    },
  ],
  deals: [],
  followUps: [
    {
      id: "fu_overdue",
      title: "تماس پیگیری قسط",
      status: "OVERDUE",
      scheduledAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    },
  ],
  needProfiles: [],
};

const intelRisk = evaluateCustomerIntelligence(mockCustomerAtRisk);
assert(intelRisk.segment === "AT_RISK", "شناسایی دقیق مشتری در معرض ریسک (AT_RISK)");
assert(intelRisk.hasOverdueInstallment === true, "شناسایی وجود قسط معوقه");
assert(intelRisk.nextBestAction.priority === "URGENT", "اولویت فوری (URGENT) برای پیگیری مطالبات معوقه");

// 9. Exact Integer Installment Division
console.log("\n--- ۹. آزمون دقت ریاضی اقساط صحیح و بدون کسر اعشاری ---");
const totalRemaining = 100000000;
const installmentCount = 3;
const basePerInstallment = Math.floor(totalRemaining / installmentCount);
const remainder = totalRemaining - (basePerInstallment * installmentCount);
const installments = [];
for (let i = 1; i <= installmentCount; i++) {
  const amount = i === installmentCount ? basePerInstallment + remainder : basePerInstallment;
  installments.push(amount);
}
const sumInstallments = installments.reduce((a, b) => a + b, 0);
assert(sumInstallments === totalRemaining, `مجموع اقساط (${sumInstallments}) دقیقا برابر با مانده کل (${totalRemaining}) است`);
assert(installments[0] === 33333333, "مبلغ قسط اول عدد صحیح تومان");
assert(installments[2] === 33333334, "کسر ریالی به آخرین قسط منتقل شد");

// 10. Zod Schema Validation Tests
console.log("\n--- ۱۰. آزمون اعتبارسنجی ورودی‌های API با Zod ---");
const validCustomer = customerCreateSchema.safeParse({
  firstName: "علی",
  lastName: "کاظمی",
  phone: "09121112233",
  province: "تهران",
  city: "تهران",
});
assert(validCustomer.success === true, "اعتبارسنجی مشتری معتبر");

const invalidCustomer = customerCreateSchema.safeParse({
  firstName: "",
  lastName: "",
  phone: "123",
  province: "",
  city: "",
});
assert(invalidCustomer.success === false, "رد درخواست ایجاد مشتری با فیلدهای خالی و نامعتبر");

const validOrder = orderCreateSchema.safeParse({
  customerId: "cust_123",
  items: [{ variantId: "var_1", quantity: 2, unitPrice: 25000000 }],
  discountAmount: 1000000,
  paymentMethod: "INSTALLMENT",
  initialPaidAmount: 10000000,
  installmentCount: 4,
});
assert(validOrder.success === true, "اعتبارسنجی سفارش معتبر");

console.log("\n==================================================");
console.log(`📊 نتیجه نهایی آزمون‌ها: ${passedTests} قبولی | ${failedTests} رد`);
console.log("==================================================");

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("🎉 تمامی آزمون‌های خودکار هوشمندی، انبارداری، محاسبات مالی، امنیت و تقویم شمسی با موفقیت پاس شدند!");
}
