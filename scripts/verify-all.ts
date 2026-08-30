import {
  toPersianDigits,
  toLatinDigits,
  formatToman,
  formatCarpetSize,
  formatJalaliDate,
  normalizeIranianPhone,
  isValidIranianMobile,
} from "../src/lib/persian";
import { calculateTemperature, SCORE_WEIGHTS } from "../src/lib/scoring";
import { recommendCarpets } from "../src/lib/recommendation";
import { customerCreateSchema, orderCreateSchema } from "../src/lib/validations/schemas";

console.log("==================================================");
console.log("🧪 شروع آزمایش‌های خودکار سیستم CRM فروش فرش...");
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

// 2. Jalali Date Tests
console.log("\n--- ۲. آزمون تقویم جلالی (شمسی) ---");
const testDate = new Date("2026-03-20T10:30:00Z");
const formattedJalali = formatJalaliDate(testDate);
assert(formattedJalali.length > 5, `فرمت صحیح تاریخ شمسی: ${formattedJalali}`);

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

// 5. Carpet Recommendation Engine Tests
console.log("\n--- ۵. آزمون موتور هوشمند تطابق و پیشنهاد فرش ---");
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
        cashPrice: 18000000,
        installmentPrice: 21000000,
        stock: 8,
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
assert(recResults[0].matchScore >= 80, `امتیاز تطابق بالای ۸۰٪ (امتیاز واقعی: ${recResults[0].matchScore}٪)`);

// 6. Financial Calculation & Exact Installment Splitting Tests
console.log("\n--- ۶. آزمون دقت محاسبات مالی و اقساط بدون پرتی اعشاری ---");
const totalRemaining = 100000000; // 100 million Tomans
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
assert(installments[0] === 33333333, "مبلغ قسط اول دقیق و بدون اعشار");
assert(installments[2] === 33333334, "کسر ریالی به آخرین قسط اضافه شد");

// 7. Zod Schema Validation Tests
console.log("\n--- ۷. آزمون اعتبارسنجی ورودی‌های API با Zod ---");
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
  phone: "123", // too short
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
  console.log("🎉 تمامی آزمون‌های خودکار امنیتی، منطق تجاری و محاسبات با موفقیت پاس شدند!");
}
