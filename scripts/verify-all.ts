import { NextRequest } from "next/server";
import { SignJWT, decodeJwt } from "jose";
import bcrypt from "bcryptjs";
import { testPublicUserResponses } from "./test-public-user-responses";
import { assertDisposableDatabase } from "./postgresql-test-safety.cjs";
import * as XLSX from "xlsx";
import prisma from "../src/lib/prisma";
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
import {
  signSessionToken,
  AUTH_COOKIE_NAME,
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  getAuthCookieOptions,
  getJwtSecret,
  getSessionFromRequest,
} from "../src/lib/auth";
import { hashPassword, PASSWORD_HASH_ROUNDS } from "../src/lib/password";
import { validateAuthEnvironment, validateJwtSecret } from "../src/lib/auth-config";
import { getDashboardAuthRedirect } from "../src/lib/dashboard-auth";
import { getClientIp, getClientIpOptions } from "../src/lib/ip";
import {
  checkRateLimit,
  createRateLimitKey,
  resetRateLimit,
} from "../src/lib/rate-limit";

import {
  DELETE as deleteOrderRoute,
  POST as createOrderRoute,
  GET as getOrdersRoute,
} from "../src/app/api/orders/route";
import {
  GET as getInstallmentsRoute,
  PUT as updateInstallmentRoute,
} from "../src/app/api/installments/route";
import {
  GET as getInventoryRoute,
  POST as inventoryMovementRoute,
} from "../src/app/api/inventory/route";
import { POST as loginRoute } from "../src/app/api/auth/login/route";
import { POST as logoutRoute } from "../src/app/api/auth/logout/route";
import { GET as getCurrentUserRoute } from "../src/app/api/auth/me/route";
import {
  DELETE as deleteTeamRoute,
  GET as getTeamRoute,
  POST as createTeamRoute,
  PUT as updateTeamRoute,
} from "../src/app/api/team/route";
import {
  GET as getCustomersRoute,
  POST as createCustomerRoute,
} from "../src/app/api/customers/route";
import {
  DELETE as deleteCustomerRoute,
  GET as getCustomerByIdRoute,
  PUT as updateCustomerRoute,
} from "../src/app/api/customers/[id]/route";
import {
  GET as getLeadsRoute,
  POST as createLeadRoute,
} from "../src/app/api/leads/route";
import {
  DELETE as deleteLeadRoute,
  GET as getLeadByIdRoute,
  PUT as updateLeadRoute,
} from "../src/app/api/leads/[id]/route";
import { POST as convertLeadRoute } from "../src/app/api/leads/[id]/convert/route";
import {
  DELETE as deleteFollowUpRoute,
  GET as getFollowUpsRoute,
  POST as createFollowUpRoute,
  PUT as updateFollowUpRoute,
} from "../src/app/api/followups/route";
import {
  DELETE as deleteDealRoute,
  GET as getPipelineRoute,
  POST as createDealRoute,
  PUT as updateDealRoute,
} from "../src/app/api/pipeline/route";
import { PUT as updateDealStageRoute } from "../src/app/api/pipeline/[id]/stage/route";
import {
  DELETE as deleteProductRoute,
  GET as getProductsRoute,
  POST as createProductRoute,
  PUT as updateProductRoute,
} from "../src/app/api/products/route";
import { POST as createRecommendationRoute } from "../src/app/api/recommendation/route";
import {
  GET as getNotificationsRoute,
  PUT as updateNotificationsRoute,
} from "../src/app/api/notifications/route";
import { GET as getDashboardRoute } from "../src/app/api/dashboard/route";
import { GET as getSearchRoute } from "../src/app/api/search/route";
import { GET as exportExcelRoute } from "../src/app/api/excel/export/route";
import { GET as getAuditLogsRoute } from "../src/app/api/audit-logs/route";
import { GET as getReportsRoute } from "../src/app/api/reports/route";

console.log("==================================================");
console.log("🧪 شروع آزمایش‌های خودکار جامع CRM و پایگاه داده (V2.1 API & DB Level Hardening)...");
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

/**
 * Helper to construct real NextRequest instances with proper headers & authentication cookies
 */
function createApiRequest(
  url: string,
  method: string,
  body?: unknown,
  sessionToken?: string,
  extraHeaders: Record<string, string> = {}
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...extraHeaders,
  };
  if (sessionToken) {
    headers["cookie"] = `${AUTH_COOKIE_NAME}=${sessionToken}`;
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runAllTests() {
  // A direct invocation must not bypass the PostgreSQL runner's safety gate.
  if (!process.env.DATABASE_URL?.startsWith("file:")) {
    await assertDisposableDatabase(prisma);
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

  // 5. Carpet Recommendation Engine Tests
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
      images: [],
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
      images: [],
      variants: [
        {
          id: "v2",
          sku: "CRP-02-2X3",
          size: "2x3",
          areaSquareMeters: 6,
          cashPrice: 18000000,
          installmentPrice: 21000000,
          stock: 0,
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

  // 6. Real Database Test: Installment Unique Constraint (P2002 on duplicate)
  console.log("\n--- ۶. آزمون واقعی پایگاه داده: قید یکتایی اقساط (Real DB P2002 Unique Constraint) ---");
  const sampleOrder = await prisma.order.findFirst();
  if (sampleOrder) {
    const testInstNum = 8888;
    // Clean any residue
    await prisma.installment.deleteMany({
      where: { orderId: sampleOrder.id, installmentNumber: testInstNum },
    });

    const firstInsert = await prisma.installment.create({
      data: {
        orderId: sampleOrder.id,
        installmentNumber: testInstNum,
        amount: 500000,
        dueDate: new Date(),
        status: "PENDING",
      },
    });
    assert(firstInsert.installmentNumber === testInstNum, "درج موفق قسط اول در پایگاه داده واقعی");

    let p2002Caught = false;
    try {
      await prisma.installment.create({
        data: {
          orderId: sampleOrder.id,
          installmentNumber: testInstNum,
          amount: 500000,
          dueDate: new Date(),
          status: "PENDING",
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        p2002Caught = true;
      }
    }
    assert(p2002Caught === true, "رد قطعی درج قسط تکراری توسط قید یکتایی دیتابیس با ارور P2002");

    // Clean up test record
    await prisma.installment.deleteMany({
      where: { orderId: sampleOrder.id, installmentNumber: testInstNum },
    });
  }

  // 7. Real Database Test: Payment Idempotency (P2002 on duplicate idempotencyKey)
  console.log("\n--- ۷. آزمون واقعی پایگاه داده: کلید یکتای پرداخت (Payment Idempotency Key P2002) ---");
  if (sampleOrder) {
    const testIdempotencyKey = `TEST-IDEMP-${Date.now()}`;
    await prisma.payment.deleteMany({ where: { idempotencyKey: testIdempotencyKey } });

    const firstPayment = await prisma.payment.create({
      data: {
        idempotencyKey: testIdempotencyKey,
        orderId: sampleOrder.id,
        amount: 250000,
        method: "POS",
        status: "CONFIRMED",
      },
    });
    assert(firstPayment.idempotencyKey === testIdempotencyKey, "ثبت تراکنش پرداخت اول با کلید یکتا");

    let dupPaymentBlocked = false;
    try {
      await prisma.payment.create({
        data: {
          idempotencyKey: testIdempotencyKey,
          orderId: sampleOrder.id,
          amount: 250000,
          method: "POS",
          status: "CONFIRMED",
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        dupPaymentBlocked = true;
      }
    }
    assert(dupPaymentBlocked === true, "رد قطعی تراکنش تکراری پرداخت در سطح دیتابیس با ارور P2002");

    await prisma.payment.deleteMany({ where: { idempotencyKey: testIdempotencyKey } });
  }

  // 8. Real Database Test: Inventory Movement & Exact Stock Sale
  console.log("\n--- ۸. آزمون گردش انبار و فروش دقیق موجودی (Real Stock Mutation & Movement Log) ---");
  const testVariant = await prisma.productVariant.findFirst({ where: { stock: { gte: 5 } } });
  if (testVariant) {
    const origStock = testVariant.stock;
    const origSold = testVariant.soldStock;

    // Simulate 5 items sale
    const { updatedVariant, movement } = await prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.update({
        where: { id: testVariant.id },
        data: {
          stock: { decrement: 5 },
          soldStock: { increment: 5 },
        },
      });

      const m = await tx.inventoryMovement.create({
        data: {
          variantId: testVariant.id,
          type: "SALE",
          quantity: 5,
          previousStock: origStock,
          newStock: v.stock,
          reason: "آزمون سیستمی فروش دقیق موجودی",
        },
      });

      return { updatedVariant: v, movement: m };
    });

    assert(updatedVariant.stock === origStock - 5, `کسر صحیح ۵ تخته فرش از موجودی انبار (${origStock} -> ${updatedVariant.stock})`);
    assert(movement.type === "SALE" && movement.quantity === 5, "ثبت دقیق سند گردش انبار با نوع SALE");

    // Restore stock and clean test movement
    await prisma.$transaction([
      prisma.productVariant.update({
        where: { id: testVariant.id },
        data: { stock: origStock, soldStock: origSold },
      }),
      prisma.inventoryMovement.delete({ where: { id: movement.id } }),
    ]);
  }

  // 9. Real Database Test: Transaction Rollback Safety
  console.log("\n--- ۹. آزمون برگشت کامل ترنزکشن در خطای سیستمی (Transaction Rollback Safety) ---");
  const variantForRollback = await prisma.productVariant.findFirst();
  if (variantForRollback) {
    const stockBefore = variantForRollback.stock;
    let rollbackHappened = false;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.productVariant.update({
          where: { id: variantForRollback.id },
          data: { stock: stockBefore - 1 },
        });

        await tx.inventoryMovement.create({
          data: {
            variantId: variantForRollback.id,
            type: "SALE",
            quantity: 1,
            previousStock: stockBefore,
            newStock: stockBefore - 1,
            reason: "آزمون رول‌بک",
          },
        });

        // Intentional exception to trigger rollback
        throw new Error("INTENTIONAL_ERROR_TRIGGER_ROLLBACK");
      });
    } catch (e: any) {
      if (e.message === "INTENTIONAL_ERROR_TRIGGER_ROLLBACK") {
        rollbackHappened = true;
      }
    }

    const variantAfter = await prisma.productVariant.findUnique({ where: { id: variantForRollback.id } });
    assert(rollbackHappened === true, "ایجاد موفق خطای ساختگی جهت تست Rollback");
    assert(variantAfter?.stock === stockBefore, "عدم تغییر موجودی انبار و بازگشت کامل تغییرات پس از شکست ترنزکشن");
  }

  // 10. Real Concurrency Simulation (2 concurrent buyers on stock = 1)
  console.log("\n--- ۱۰. آزمون همزمانی خرید همزمان دو مشتری روی موجودی ۱ تخته فرش (Concurrency Test) ---");
  const singleStockProduct = await prisma.product.create({
    data: {
      code: `TEST-CONC-${Date.now()}`,
      name: "فرش تست همزمانی",
      pattern: "مدرن",
      collection: "تست",
      shane: 1200,
      density: 3600,
      yarnMaterial: "اکریلیک",
      weavingMachine: "شونهر",
      style: "مدرن",
      primaryColor: "طوسی",
      images: [],
      variants: {
        create: {
          sku: `SKU-CONC-${Date.now()}`,
          size: "2x3",
          areaSquareMeters: 6,
          cashPrice: 10000000,
          installmentPrice: 12000000,
          stock: 1, // exactly 1
          reservedStock: 0,
        },
      },
    },
    include: { variants: true },
  });

  const concVariantId = singleStockProduct.variants[0].id;

  async function attemptSale(buyerName: string): Promise<{ success: boolean; buyer: string }> {
    try {
      return await prisma.$transaction(async (tx) => {
        const v = await tx.productVariant.findUnique({ where: { id: concVariantId } });
        if (!v || v.stock < 1) {
          throw new Error("OUT_OF_STOCK");
        }
        await tx.productVariant.update({
          where: { id: concVariantId },
          data: { stock: { decrement: 1 }, soldStock: { increment: 1 } },
        });
        return { success: true, buyer: buyerName };
      });
    } catch {
      return { success: false, buyer: buyerName };
    }
  }

  // Run 2 sales concurrently
  const [resA, resB] = await Promise.all([
    attemptSale("خریدار A"),
    attemptSale("خریدار B"),
  ]);

  const successCount = (resA.success ? 1 : 0) + (resB.success ? 1 : 0);
  const failCount = (!resA.success ? 1 : 0) + (!resB.success ? 1 : 0);
  const finalVariantStock = await prisma.productVariant.findUnique({ where: { id: concVariantId } });

  assert(successCount === 1, "دقیقاً یک خریدار موفق به خرید کالا با موجودی ۱ شد");
  assert(failCount === 1, "خریدار دوم به علت اتمام موجودی رد شد");
  assert(finalVariantStock?.stock === 0, `موجودی نهایی انبار دقیقا ۰ است و منفی نشد (موجودی: ${finalVariantStock?.stock})`);

  // Clean up test product
  await prisma.product.delete({ where: { id: singleStockProduct.id } });

  // 11. Customer Intelligence & Segmentation Tests
  console.log("\n--- ۱۱. آزمون هوشمندی مشتری، امتیازدهی و اقدام بعدی (Customer Intelligence) ---");
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
        preferredSizes: ["3x4"],
        preferredColors: ["سرمه‌ای"],
        budgetMax: 100000000,
      },
    ],
  };

  const intelHot = evaluateCustomerIntelligence(mockCustomerHot);
  assert(intelHot.score >= 80, `امتیاز بالای ۸۰ برای مشتری وفادار و کلان (امتیاز: ${intelHot.score})`);
  assert(intelHot.nextBestAction.action.length > 0, `تولید هوشمند اقدام بعدی: ${intelHot.nextBestAction.action}`);

  // 12. Zod Validation Tests
  console.log("\n--- ۱۲. آزمون اعتبارسنجی ورودی‌های API با Zod ---");
  const validOrder = orderCreateSchema.safeParse({
    customerId: "cust_123",
    items: [{ variantId: "var_1", quantity: 2 }],
    paymentMethod: "INSTALLMENT",
    installmentCount: 4,
  });
  assert(validOrder.success === true, "اعتبارسنجی ساختار استاندارد سفارش");

  const orderWithClientPrice = orderCreateSchema.safeParse({
    customerId: "cust_123",
    items: [{ variantId: "var_1", quantity: 2, unitPrice: 1 }],
    paymentMethod: "CASH",
  });
  assert(
    orderWithClientPrice.success === false,
    "رد قیمت واحد ارسالی کلاینت در قرارداد Zod سفارش"
  );

  // 13. Comprehensive Order Deletion, Stock Restoration & Financial Safety Tests (DB Level)
  console.log("\n--- ۱۳. آزمون‌های سطح پایگاه داده: حذف سفارش و گارد مالی ---");

  const testCustomer = await prisma.customer.findFirst();
  const testCustomerId = testCustomer?.id || "mock-cust";

  // Create test product and variant
  const testProductForDelete = await prisma.product.create({
    data: {
      code: `PROD-DEL-${Date.now()}`,
      name: "فرش تست بازگردانی حذف سفارش",
      pattern: "افشان",
      collection: "کاشان",
      shane: 1200,
      density: 3600,
      yarnMaterial: "اکریلیک",
      weavingMachine: "وندویل",
      style: "کلاسیک",
      primaryColor: "کرم",
      images: [],
      variants: {
        create: {
          sku: `SKU-DEL-${Date.now()}`,
          size: "3x4",
          areaSquareMeters: 12,
          cashPrice: 30000000,
          installmentPrice: 35000000,
          stock: 5,
          soldStock: 0,
        },
      },
    },
    include: { variants: true },
  });

  const delVariant = testProductForDelete.variants[0];

  // 14. Real API Route Level Integration Tests (Calling Actual Route Handlers)
  console.log("\n--- ۱۴. آزمون‌های سطح واقعی Route Handler و درخواست‌های HTTP (Real API Integration Tests) ---");

  // Retrieve or create users with different roles for RBAC verification
  let adminUser = await prisma.user.findFirst({ where: { role: "ADMIN", isActive: true } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        name: "مدیر تستی",
        email: `admin-test-${Date.now()}@carpet.ir`,
        phone: "09121111111",
        passwordHash: "hash",
        role: "ADMIN",
        isActive: true,
      },
    });
  }

  let salesUser = await prisma.user.findFirst({ where: { role: "SALES_REP", isActive: true } });
  if (!salesUser) {
    salesUser = await prisma.user.create({
      data: {
        name: "کارشناس فروش تستی",
        email: `rep-test-${Date.now()}@carpet.ir`,
        phone: "09122222222",
        passwordHash: "hash",
        role: "SALES_REP",
        isActive: true,
      },
    });
  }

  let viewerUser = await prisma.user.findFirst({ where: { role: "VIEWER", isActive: true } });
  if (!viewerUser) {
    viewerUser = await prisma.user.create({
      data: {
        name: "بیننده تستی",
        email: `viewer-test-${Date.now()}@carpet.ir`,
        phone: "09123333333",
        passwordHash: "hash",
        role: "VIEWER",
        isActive: true,
      },
    });
  }

  const adminToken = await signSessionToken({
    userId: adminUser.id,
    sessionVersion: adminUser.sessionVersion,
  });

  const salesToken = await signSessionToken({
    userId: salesUser.id,
    sessionVersion: salesUser.sessionVersion,
  });

  const viewerToken = await signSessionToken({
    userId: viewerUser.id,
    sessionVersion: viewerUser.sessionVersion,
  });

  // Test 14.1: Real DELETE /api/orders Route Call with Admin Token
  const orderForApiDelete = await prisma.order.create({
    data: {
      orderNumber: `ORD-API-DEL-${Date.now()}`,
      customerId: testCustomerId,
      sellerId: adminUser.id,
      totalAmount: 30000000,
      finalAmount: 30000000,
      paidAmount: 0,
      remainingAmount: 30000000,
      status: "CONFIRMED",
      items: {
        create: {
          variantId: delVariant.id,
          quantity: 1,
          unitPrice: 30000000,
          totalPrice: 30000000,
        },
      },
    },
  });

  // Adjust variant stock to simulate order decrement (5 -> 4)
  await prisma.productVariant.update({
    where: { id: delVariant.id },
    data: { stock: 4, soldStock: 1 },
  });

  const deleteReq = createApiRequest(
    `http://localhost:3000/api/orders?id=${orderForApiDelete.id}`,
    "DELETE",
    undefined,
    adminToken
  );

  const deleteRes = await deleteOrderRoute(deleteReq);
  const deleteBody = await deleteRes.json();

  assert(deleteRes.status === 200, `فراخوانی واقعی متد DELETE با وضعیت HTTP 200 (کد واقعی: ${deleteRes.status})`);
  assert(deleteBody.success === true, "پاسخ موفق JSON از کنترلر واقعی API");

  const stockAfterApiDel = await prisma.productVariant.findUnique({ where: { id: delVariant.id } });
  assert(stockAfterApiDel?.stock === 5, `موجودی انبار پس از اجرای کامل Route به ۵ بازگشت (موجودی واقعی: ${stockAfterApiDel?.stock})`);

  const returnMovement = await prisma.inventoryMovement.findFirst({
    where: {
      variantId: delVariant.id,
      type: "RETURN",
    },
    orderBy: { createdAt: "desc" },
  });
  assert(
    returnMovement?.quantity === 1 && returnMovement.newStock === 5,
    "ثبت خودکار سند گردش انبار با نوع RETURN از درون Route Handler واقعی"
  );

  const auditLogEntry = await prisma.auditLog.findFirst({
    where: { entity: "Order", entityId: orderForApiDelete.id, action: "DELETE" },
  });
  assert(auditLogEntry !== null, "ثبت لاگ امنیتی AuditLog به صورت اتمیک در زمان حذف سفارش از طریق API");

  // Test 14.2: Double Delete Protection via Real API
  const secondDeleteReq = createApiRequest(
    `http://localhost:3000/api/orders?id=${orderForApiDelete.id}`,
    "DELETE",
    undefined,
    adminToken
  );
  const secondDeleteRes = await deleteOrderRoute(secondDeleteReq);
  assert(secondDeleteRes.status === 404, `درخواست دوم حذف سفارش با خطای HTTP 404 مواجه شد (کد واقعی: ${secondDeleteRes.status})`);

  const stockAfterSecondApiAttempt = await prisma.productVariant.findUnique({ where: { id: delVariant.id } });
  assert(stockAfterSecondApiAttempt?.stock === 5, "موجودی انبار در برابر تلاش مجدد حذف مضاعف ثابت ماند (۵ تخته)");

  // Test 14.3: Paid Order Deletion Blocked via Real API
  const paidOrderForApi = await prisma.order.create({
    data: {
      orderNumber: `ORD-PAID-API-${Date.now()}`,
      customerId: testCustomerId,
      totalAmount: 40000000,
      finalAmount: 40000000,
      paidAmount: 40000000,
      remainingAmount: 0,
      status: "PAID",
      payments: {
        create: {
          idempotencyKey: `PAY-API-GUARD-${Date.now()}`,
          amount: 40000000,
          method: "POS",
          status: "CONFIRMED",
        },
      },
    },
  });

  const paidDeleteReq = createApiRequest(
    `http://localhost:3000/api/orders?id=${paidOrderForApi.id}`,
    "DELETE",
    undefined,
    adminToken
  );
  const paidDeleteRes = await deleteOrderRoute(paidDeleteReq);
  const paidDeleteBody = await paidDeleteRes.json();

  assert(paidDeleteRes.status === 400, `مسدودسازی حذف سفارش تسویه‌شده از طریق Route Handler با خطای HTTP 400 (کد واقعی: ${paidDeleteRes.status})`);
  assert(paidDeleteBody.error.includes("سوابق مالی") || paidDeleteBody.error.includes("لغو"), `پیام خطای فارسی محافظتی: ${paidDeleteBody.error}`);

  // Test 14.4: Completed Order Deletion Blocked via Real API
  const completedOrderForApi = await prisma.order.create({
    data: {
      orderNumber: `ORD-COMP-API-${Date.now()}`,
      customerId: testCustomerId,
      totalAmount: 25000000,
      finalAmount: 25000000,
      paidAmount: 25000000,
      remainingAmount: 0,
      status: "COMPLETED",
    },
  });

  const compDeleteReq = createApiRequest(
    `http://localhost:3000/api/orders?id=${completedOrderForApi.id}`,
    "DELETE",
    undefined,
    adminToken
  );
  const compDeleteRes = await deleteOrderRoute(compDeleteReq);
  assert(compDeleteRes.status === 400, "مسدودسازی حذف سفارش‌های نهایی COMPLETED با خطای HTTP 400");

  // Test 14.5: Unauthorized Request (No Session Cookie)
  const unauthReq = createApiRequest(
    `http://localhost:3000/api/orders?id=${completedOrderForApi.id}`,
    "DELETE"
  );
  const unauthRes = await deleteOrderRoute(unauthReq);
  assert(unauthRes.status === 401, `رد درخواست بدون سشن لاگین با خطای HTTP 401 (کد واقعی: ${unauthRes.status})`);

  // Test 14.6: RBAC Forbidden - Sales Rep cannot delete orders
  const salesDeleteReq = createApiRequest(
    `http://localhost:3000/api/orders?id=${completedOrderForApi.id}`,
    "DELETE",
    undefined,
    salesToken
  );
  const salesDeleteRes = await deleteOrderRoute(salesDeleteReq);
  assert(salesDeleteRes.status === 403, `رد درخواست حذف سفارش توسط SALES_REP با خطای HTTP 403 (کد واقعی: ${salesDeleteRes.status})`);

  // Test 14.7: RBAC Forbidden - Viewer cannot delete orders
  const viewerDeleteReq = createApiRequest(
    `http://localhost:3000/api/orders?id=${completedOrderForApi.id}`,
    "DELETE",
    undefined,
    viewerToken
  );
  const viewerDeleteRes = await deleteOrderRoute(viewerDeleteReq);
  assert(viewerDeleteRes.status === 403, `رد درخواست حذف سفارش توسط VIEWER با خطای HTTP 403 (کد واقعی: ${viewerDeleteRes.status})`);

  // Test 14.8: Concurrent DELETE calls through Real API Handler
  const orderForConcApiDel = await prisma.order.create({
    data: {
      orderNumber: `ORD-CONC-API-${Date.now()}`,
      customerId: testCustomerId,
      totalAmount: 10000000,
      finalAmount: 10000000,
      paidAmount: 0,
      remainingAmount: 10000000,
      status: "CONFIRMED",
      items: {
        create: {
          variantId: delVariant.id,
          quantity: 1,
          unitPrice: 10000000,
          totalPrice: 10000000,
        },
      },
    },
  });

  // Set initial stock to 4 for this item
  await prisma.productVariant.update({
    where: { id: delVariant.id },
    data: { stock: 4, soldStock: 1 },
  });

  const concReq1 = createApiRequest(
    `http://localhost:3000/api/orders?id=${orderForConcApiDel.id}`,
    "DELETE",
    undefined,
    adminToken
  );
  const concReq2 = createApiRequest(
    `http://localhost:3000/api/orders?id=${orderForConcApiDel.id}`,
    "DELETE",
    undefined,
    adminToken
  );

  const [concRes1, concRes2] = await Promise.all([
    deleteOrderRoute(concReq1),
    deleteOrderRoute(concReq2),
  ]);

  const statuses = [concRes1.status, concRes2.status];
  assert(statuses.includes(200), "درخواست همزمان: یک درخواست با موفقیت HTTP 200 سفارش را حذف کرد");
  assert(statuses.includes(404), "درخواست همزمان: درخواست دوم با خطای HTTP 404 رد شد");

  const stockAfterConcApi = await prisma.productVariant.findUnique({ where: { id: delVariant.id } });
  assert(stockAfterConcApi?.stock === 5, `موجودی نهایی انبار دقیقاً ۱ بار بازگردانی شد و به ۵ رسید (موجودی: ${stockAfterConcApi?.stock})`);

  // Clean up all temporary test orders & product
  await prisma.order.deleteMany({
    where: { id: { in: [paidOrderForApi.id, completedOrderForApi.id] } },
  });
  await prisma.product.delete({ where: { id: testProductForDelete.id } });

  // 15. Advanced Security, RBAC Escalation, IDOR, and Login Hardening Tests
  console.log("\n--- ۱۵. آزمون‌های پیشرفته امنیت RBAC، جلوگیری از ارتقای دسترسی، ایزولاسیون مالکیت (IDOR) و لاگین ---");

  // Create Sales Manager & Rep B for RBAC testing
  let managerUser = await prisma.user.findFirst({ where: { role: "SALES_MANAGER", isActive: true } });
  if (!managerUser) {
    managerUser = await prisma.user.create({
      data: {
        name: "مدیر فروش تستی",
        email: `manager-test-${Date.now()}@carpet.ir`,
        phone: "09124445566",
        passwordHash: "hash",
        role: "SALES_MANAGER",
        isActive: true,
      },
    });
  }

  let repBUser = await prisma.user.create({
    data: {
      name: "کارشناس فروش ب",
      email: `rep-b-${Date.now()}@carpet.ir`,
      phone: `0912${Math.floor(1000000 + Math.random() * 9000000)}`,
      passwordHash: "hash",
      role: "SALES_REP",
      isActive: true,
    },
  });

  const managerToken = await signSessionToken({
    userId: managerUser.id,
    sessionVersion: managerUser.sessionVersion,
  });

  const repBToken = await signSessionToken({
    userId: repBUser.id,
    sessionVersion: repBUser.sessionVersion,
  });

  // Test 15.1: Sales Manager cannot edit or demote ADMIN account (RBAC Escalation Guard)
  const managerEditAdminReq = createApiRequest(
    "http://localhost:3000/api/team",
    "PUT",
    {
      id: adminUser.id,
      name: "تلاش مدیر فروش برای تغییر مدیر ارشد",
      email: adminUser.email,
      phone: adminUser.phone,
      role: "SALES_REP", // Demotion attempt
    },
    managerToken
  );
  const managerEditAdminRes = await updateTeamRoute(managerEditAdminReq);
  assert(
    managerEditAdminRes.status === 403,
    `جلوگیری قاطع از دستکاری یا تنزل درجه مدیر ارشد توسط مدیر فروش (HTTP 403 - کد واقعی: ${managerEditAdminRes.status})`
  );

  // Test 15.2: Sales Manager cannot elevate any user to ADMIN (Privilege Escalation Guard)
  const managerElevateReq = createApiRequest(
    "http://localhost:3000/api/team",
    "PUT",
    {
      id: repBUser.id,
      name: repBUser.name,
      email: repBUser.email,
      phone: repBUser.phone,
      role: "ADMIN", // Elevation attempt
    },
    managerToken
  );
  const managerElevateRes = await updateTeamRoute(managerElevateReq);
  assert(
    managerElevateRes.status === 403,
    `جلوگیری قاطع از ارتقای دسترسی به ADMIN توسط مدیر فروش (HTTP 403 - کد واقعی: ${managerElevateRes.status})`
  );

  // Test 15.3: ADMIN can legally update a team member
  const adminUpdateUserReq = createApiRequest(
    "http://localhost:3000/api/team",
    "PUT",
    {
      id: repBUser.id,
      name: "کارشناس فروش ب (اصلاح‌شده)",
      email: repBUser.email,
      phone: repBUser.phone,
      role: "SALES_REP",
    },
    adminToken
  );
  const adminUpdateUserRes = await updateTeamRoute(adminUpdateUserReq);
  assert(adminUpdateUserRes.status === 200, "ویرایش موفق کاربر توسط مدیر ارشد ADMIN (HTTP 200)");

  // Create isolated Customer and Lead assigned to Rep B
  const customerOfRepB = await prisma.customer.create({
    data: {
      code: `CST-ISO-${Date.now()}`,
      firstName: "مشتری",
      lastName: "اختصاصی کارشناس ب",
      phone: `0935${Math.floor(1000000 + Math.random() * 9000000)}`,
      province: "تهران",
      city: "تهران",
      assignedToId: repBUser.id,
    },
  });

  const leadOfRepB = await prisma.lead.create({
    data: {
      firstName: "سرنخ",
      lastName: "اختصاصی کارشناس ب",
      phone: `0936${Math.floor(1000000 + Math.random() * 9000000)}`,
      province: "اصفهان",
      city: "اصفهان",
      assignedToId: repBUser.id,
    },
  });

  // Test 15.4: IDOR Protection - Sales Rep A attempting to view Rep B's customer
  const idorCustReq = createApiRequest(
    `http://localhost:3000/api/customers/${customerOfRepB.id}`,
    "GET",
    undefined,
    salesToken // Sales Rep A
  );
  const idorCustRes = await getCustomerByIdRoute(idorCustReq, {
    params: Promise.resolve({ id: customerOfRepB.id }),
  });
  assert(
    idorCustRes.status === 403,
    `رد دسترسی غیرمجاز کارشناس فروش به مشتری کارشناس دیگر (IDOR Guard HTTP 403 - کد واقعی: ${idorCustRes.status})`
  );

  // Test 15.5: IDOR Protection - Sales Rep A attempting to view Rep B's lead
  const idorLeadReq = createApiRequest(
    `http://localhost:3000/api/leads/${leadOfRepB.id}`,
    "GET",
    undefined,
    salesToken // Sales Rep A
  );
  const idorLeadRes = await getLeadByIdRoute(idorLeadReq, {
    params: Promise.resolve({ id: leadOfRepB.id }),
  });
  assert(
    idorLeadRes.status === 403,
    `رد دسترسی غیرمجاز کارشناس فروش به سرنخ کارشناس دیگر (IDOR Guard HTTP 403 - کد واقعی: ${idorLeadRes.status})`
  );

  // Test 15.6: Inventory Oversell Rejection via Real API POST /api/inventory
  const inventoryTestProduct = await prisma.product.create({
    data: {
      code: `PROD-INV-${Date.now()}`,
      name: "فرش تست کنترل موجودی انبار",
      pattern: "شاه‌عباسی",
      collection: "اصفهان",
      shane: 1500,
      density: 4500,
      yarnMaterial: "اکریلیک",
      weavingMachine: "وندویل",
      style: "کلاسیک",
      primaryColor: "سرمه‌ای",
      images: [],
      variants: {
        create: {
          sku: `SKU-INV-${Date.now()}`,
          size: "3x4",
          areaSquareMeters: 12,
          cashPrice: 50000000,
          installmentPrice: 55000000,
          stock: 2, // only 2 in stock
          reservedStock: 0,
        },
      },
    },
    include: { variants: true },
  });

  const invVariant = inventoryTestProduct.variants[0];

  const oversellReq = createApiRequest(
    "http://localhost:3000/api/inventory",
    "POST",
    {
      variantId: invVariant.id,
      type: "SALE",
      quantity: 5, // Attempt to sell 5 when only 2 exist
      reason: "تست فروش بیش از موجودی انبار",
    },
    adminToken
  );
  const oversellRes = await inventoryMovementRoute(oversellReq);
  const oversellBody = await oversellRes.json();
  assert(
    oversellRes.status === 400,
    `رد ثبت گردش انبار برای تعداد فراتر از موجودی کالا (HTTP 400 - کد واقعی: ${oversellRes.status})`
  );
  assert(
    oversellBody.error.includes("موجودی"),
    `پیام خطای شفاف فارسی انبار: ${oversellBody.error}`
  );

  // Clean up inventory test product and isolation test users/records
  await prisma.product.delete({ where: { id: inventoryTestProduct.id } });
  await prisma.customer.delete({ where: { id: customerOfRepB.id } });
  await prisma.lead.delete({ where: { id: leadOfRepB.id } });
  await prisma.user.delete({ where: { id: repBUser.id } });

  // Test 15.7: Uniform Authentication Error for Non-existent User (User Enumeration Prevention)
  const nonExistentLoginReq = createApiRequest(
    "http://localhost:3000/api/auth/login",
    "POST",
    {
      identifier: "nonexistent-user-test@carpet.ir",
      password: "WrongPassword123!",
    }
  );
  const nonExistentLoginRes = await loginRoute(nonExistentLoginReq);
  const nonExistentLoginBody = await nonExistentLoginRes.json();
  assert(
    nonExistentLoginRes.status === 401,
    `رد درخواست ورود کاربر ناموجود با وضعیت HTTP 401 (کد واقعی: ${nonExistentLoginRes.status})`
  );

  // Test 15.8: Uniform Authentication Error for Wrong Password
  const wrongPasswordLoginReq = createApiRequest(
    "http://localhost:3000/api/auth/login",
    "POST",
    {
      identifier: adminUser.email,
      password: "DefinitelyWrongPassword123!",
    }
  );
  const wrongPasswordLoginRes = await loginRoute(wrongPasswordLoginReq);
  const wrongPasswordLoginBody = await wrongPasswordLoginRes.json();
  assert(
    wrongPasswordLoginRes.status === 401,
    `رد درخواست ورود با رمز عبور اشتباه با وضعیت HTTP 401 (کد واقعی: ${wrongPasswordLoginRes.status})`
  );
  assert(
    nonExistentLoginBody.error === wrongPasswordLoginBody.error,
    "یکسان‌سازی کامل پیام خطای لاگین جهت جلوگیری قطعی از User Enumeration"
  );

  // 16. Order price integrity and server-authoritative financial calculations
  console.log("\n--- ۱۶. آزمون‌های امنیت مالی سفارش و قیمت‌گذاری فقط در سرور ---");

  const priceSecurityProduct = await prisma.product.create({
    data: {
      code: `PROD-PRICE-SEC-${Date.now()}`,
      name: "فرش تست امنیت قیمت سفارش",
      pattern: "افشان",
      collection: "تست امنیت",
      shane: 1200,
      density: 3600,
      yarnMaterial: "اکریلیک",
      weavingMachine: "وندویل",
      style: "کلاسیک",
      primaryColor: "کرم",
      images: [],
      variants: {
        create: {
          sku: `SKU-PRICE-SEC-${Date.now()}`,
          size: "3x4",
          areaSquareMeters: 12,
          cashPrice: 10_000_000,
          installmentPrice: 12_000_000,
          stock: 5,
          reservedStock: 0,
          soldStock: 0,
          isActive: true,
        },
      },
    },
    include: { variants: true },
  });
  const priceSecurityVariant = priceSecurityProduct.variants[0];

  const countPriceSecurityOrders = () =>
    prisma.order.count({
      where: { items: { some: { variantId: priceSecurityVariant.id } } },
    });

  const tamperedUnitPriceRequest = createApiRequest(
    "http://localhost:3000/api/orders",
    "POST",
    {
      customerId: testCustomerId,
      items: [{ variantId: priceSecurityVariant.id, quantity: 1, unitPrice: 1 }],
      paymentMethod: "CASH",
    },
    adminToken
  );
  const tamperedUnitPriceResponse = await createOrderRoute(tamperedUnitPriceRequest);
  assert(
    tamperedUnitPriceResponse.status === 400,
    "رد دستکاری مثبت unitPrice توسط کلاینت"
  );
  assert(
    (await countPriceSecurityOrders()) === 0,
    "عدم ایجاد سفارش پس از تلاش برای دستکاری unitPrice"
  );

  const negativeUnitPriceRequest = createApiRequest(
    "http://localhost:3000/api/orders",
    "POST",
    {
      customerId: testCustomerId,
      items: [{ variantId: priceSecurityVariant.id, quantity: 1, unitPrice: -1 }],
      paymentMethod: "CASH",
    },
    adminToken
  );
  const negativeUnitPriceResponse = await createOrderRoute(negativeUnitPriceRequest);
  assert(negativeUnitPriceResponse.status === 400, "رد صریح unitPrice منفی ارسالی کلاینت");

  const negativeValueRequest = createApiRequest(
    "http://localhost:3000/api/orders",
    "POST",
    {
      customerId: testCustomerId,
      items: [{ variantId: priceSecurityVariant.id, quantity: -1 }],
      paymentMethod: "CASH",
    },
    adminToken
  );
  const negativeValueResponse = await createOrderRoute(negativeValueRequest);
  assert(negativeValueResponse.status === 400, "رد مقدار منفی در تعداد سفارش");

  const incorrectTotalsRequest = createApiRequest(
    "http://localhost:3000/api/orders",
    "POST",
    {
      customerId: testCustomerId,
      items: [{ variantId: priceSecurityVariant.id, quantity: 1 }],
      paymentMethod: "CASH",
      totalAmount: 1,
      discountAmount: 99_999_999,
      finalAmount: 1,
      initialPaidAmount: 1,
      remainingAmount: -1,
    },
    adminToken
  );
  const incorrectTotalsResponse = await createOrderRoute(incorrectTotalsRequest);
  assert(
    incorrectTotalsResponse.status === 400,
    "رد total، discount، paid و remainingAmount ارسالی کلاینت"
  );

  const zeroQuantityRequest = createApiRequest(
    "http://localhost:3000/api/orders",
    "POST",
    {
      customerId: testCustomerId,
      items: [{ variantId: priceSecurityVariant.id, quantity: 0 }],
      paymentMethod: "CASH",
    },
    adminToken
  );
  const zeroQuantityResponse = await createOrderRoute(zeroQuantityRequest);
  assert(zeroQuantityResponse.status === 400, "رد تعداد صفر در سفارش");

  const cashOrderRequest = createApiRequest(
    "http://localhost:3000/api/orders",
    "POST",
    {
      customerId: testCustomerId,
      items: [{ variantId: priceSecurityVariant.id, quantity: 2 }],
      paymentMethod: "CASH",
    },
    adminToken
  );
  const cashOrderResponse = await createOrderRoute(cashOrderRequest);
  const cashOrderBody = await cashOrderResponse.json();
  const cashOrder = cashOrderBody.order?.id
    ? await prisma.order.findUnique({
        where: { id: cashOrderBody.order.id },
        include: { items: true, payments: true },
      })
    : null;
  assert(cashOrderResponse.status === 200, "ثبت سفارش نقدی با payload فاقد قیمت");
  assert(
    cashOrder?.items[0]?.unitPrice === priceSecurityVariant.cashPrice &&
      cashOrder.items[0].totalPrice === 20_000_000,
    "انتخاب cashPrice دیتابیس و محاسبه line total در سرور"
  );
  assert(
    cashOrder?.totalAmount === 20_000_000 &&
      cashOrder.discountAmount === 0 &&
      cashOrder.finalAmount === 20_000_000,
    "محاسبه total، discount و final amount سفارش نقدی در سرور"
  );
  assert(
    cashOrder?.paidAmount === 0 &&
      cashOrder.remainingAmount === cashOrder.finalAmount &&
      cashOrder.payments.length === 0,
    "محاسبه مانده از پرداخت‌های تأییدشده و عدم اعتماد به پیش‌پرداخت کلاینت"
  );

  const installmentOrderRequest = createApiRequest(
    "http://localhost:3000/api/orders",
    "POST",
    {
      customerId: testCustomerId,
      items: [{ variantId: priceSecurityVariant.id, quantity: 1 }],
      paymentMethod: "INSTALLMENT",
      installmentCount: 3,
    },
    adminToken
  );
  const installmentOrderResponse = await createOrderRoute(installmentOrderRequest);
  const installmentOrderBody = await installmentOrderResponse.json();
  const installmentOrder = installmentOrderBody.order?.id
    ? await prisma.order.findUnique({
        where: { id: installmentOrderBody.order.id },
        include: { items: true, installments: true, payments: true },
      })
    : null;
  assert(installmentOrderResponse.status === 200, "ثبت سفارش اقساطی با payload فاقد قیمت");
  assert(
    installmentOrder?.items[0]?.unitPrice === priceSecurityVariant.installmentPrice &&
      installmentOrder.totalAmount === 12_000_000 &&
      installmentOrder.finalAmount === 12_000_000,
    "انتخاب installmentPrice دیتابیس و محاسبه مبلغ اقساطی در سرور"
  );
  assert(
    installmentOrder?.installments.length === 3 &&
      installmentOrder.installments.reduce((sum, installment) => sum + installment.amount, 0) ===
        installmentOrder.remainingAmount &&
      installmentOrder.payments.length === 0,
    "تولید اقساط دقیقاً برابر مانده server-side سفارش"
  );

  const stockBeforeOversell = await prisma.productVariant.findUnique({
    where: { id: priceSecurityVariant.id },
    select: { stock: true },
  });
  const ordersBeforeOversell = await countPriceSecurityOrders();
  const oversellOrderRequest = createApiRequest(
    "http://localhost:3000/api/orders",
    "POST",
    {
      customerId: testCustomerId,
      items: [{ variantId: priceSecurityVariant.id, quantity: 3 }],
      paymentMethod: "CASH",
    },
    adminToken
  );
  const oversellOrderResponse = await createOrderRoute(oversellOrderRequest);
  const stockAfterOversell = await prisma.productVariant.findUnique({
    where: { id: priceSecurityVariant.id },
    select: { stock: true },
  });
  assert(oversellOrderResponse.status === 400, "رد تعداد بیشتر از موجودی آزاد");
  assert(
    stockAfterOversell?.stock === stockBeforeOversell?.stock &&
      (await countPriceSecurityOrders()) === ordersBeforeOversell,
    "عدم تغییر موجودی و سفارش پس از رد oversell"
  );

  await prisma.productVariant.update({
    where: { id: priceSecurityVariant.id },
    data: { isActive: false },
  });
  const inactiveVariantRequest = createApiRequest(
    "http://localhost:3000/api/orders",
    "POST",
    {
      customerId: testCustomerId,
      items: [{ variantId: priceSecurityVariant.id, quantity: 1 }],
      paymentMethod: "CASH",
    },
    adminToken
  );
  const inactiveVariantResponse = await createOrderRoute(inactiveVariantRequest);
  assert(inactiveVariantResponse.status === 400, "رد تنوع کالای غیرفعال");

  const invalidVariantRequest = createApiRequest(
    "http://localhost:3000/api/orders",
    "POST",
    {
      customerId: testCustomerId,
      items: [{ variantId: "variant-does-not-exist", quantity: 1 }],
      paymentMethod: "CASH",
    },
    adminToken
  );
  const invalidVariantResponse = await createOrderRoute(invalidVariantRequest);
  assert(invalidVariantResponse.status === 400, "رد شناسه تنوع کالای نامعتبر");

  await prisma.order.deleteMany({
    where: { items: { some: { variantId: priceSecurityVariant.id } } },
  });
  await prisma.product.delete({ where: { id: priceSecurityProduct.id } });

  // 17. Authentication hardening and revocable sessions
  console.log("\n--- ۱۷. آزمون‌های سخت‌سازی احراز هویت و ابطال نشست ---");

  const authPassword = "AuthTestPassword!123";
  const authPasswordHash = await hashPassword(authPassword);
  const authUser = await prisma.user.create({
    data: {
      name: "کاربر تست امنیت احراز هویت",
      email: `auth-security-${Date.now()}@example.invalid`,
      phone: `0915${Math.floor(1_000_000 + Math.random() * 9_000_000)}`,
      passwordHash: authPasswordHash,
      role: "SALES_REP",
      isActive: true,
    },
  });

  assert(
    bcrypt.getRounds(authPasswordHash) === PASSWORD_HASH_ROUNDS,
    `هش رمز عبور با bcrypt و هزینه ${PASSWORD_HASH_ROUNDS}`
  );

  const authToken = await signSessionToken({
    userId: authUser.id,
    sessionVersion: authUser.sessionVersion,
  });

  const authTokenClaims = decodeJwt(authToken);
  assert(
    authTokenClaims.email === undefined &&
      authTokenClaims.phone === undefined &&
      authTokenClaims.name === undefined &&
      authTokenClaims.role === undefined,
    "عدم قرارگیری اطلاعات هویتی و نقش کاربر در payload قابل‌مشاهده JWT"
  );

  const validSessionResponse = await getCurrentUserRoute(
    createApiRequest("http://localhost:3000/api/auth/me", "GET", undefined, authToken)
  );
  assert(validSessionResponse.status === 200, "پذیرش JWT معتبر با نسخه نشست جاری");

  const expiredAt = Math.floor(Date.now() / 1000) - 60;
  const expiredToken = await new SignJWT({
    userId: authUser.id,
    sessionVersion: authUser.sessionVersion,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
    .setSubject(authUser.id)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(expiredAt - 3600)
    .setExpirationTime(expiredAt)
    .sign(getJwtSecret());
  const expiredSessionResponse = await getCurrentUserRoute(
    createApiRequest("http://localhost:3000/api/auth/me", "GET", undefined, expiredToken)
  );
  assert(expiredSessionResponse.status === 401, "رد JWT منقضی‌شده");

  const tokenParts = authToken.split(".");
  tokenParts[2] = `${tokenParts[2][0] === "a" ? "b" : "a"}${tokenParts[2].slice(1)}`;
  const tamperedSessionResponse = await getCurrentUserRoute(
    createApiRequest(
      "http://localhost:3000/api/auth/me",
      "GET",
      undefined,
      tokenParts.join(".")
    )
  );
  assert(tamperedSessionResponse.status === 401, "رد JWT دستکاری‌شده");

  const successfulLoginResponse = await loginRoute(
    createApiRequest(
      "http://localhost:3000/api/auth/login",
      "POST",
      { identifier: authUser.email, password: authPassword },
      undefined,
      { "x-forwarded-for": "198.51.100.10" }
    )
  );
  const loginCookie = successfulLoginResponse.headers.get("set-cookie") || "";
  assert(successfulLoginResponse.status === 200, "ورود موفق با رمز صحیح");
  assert(
    /HttpOnly/i.test(loginCookie) && /SameSite=Lax/i.test(loginCookie),
    "کوکی نشست دارای HttpOnly و SameSite=Lax"
  );
  assert(
    loginCookie.includes("Max-Age=43200") && getAuthCookieOptions(true).secure,
    "انقضای ۱۲ ساعته کوکی و فعال بودن Secure در تولید"
  );

  let weakProductionSecretRejected = false;
  try {
    getJwtSecret("short-secret", true);
  } catch {
    weakProductionSecretRejected = true;
  }
  assert(
    weakProductionSecretRejected && JWT_ALGORITHM === "HS256",
    "رد JWT_SECRET ضعیف در تولید و محدودسازی الگوریتم به HS256"
  );

  const disabledPassword = "DisabledPassword!123";
  const disabledUser = await prisma.user.create({
    data: {
      name: "کاربر غیرفعال تستی",
      email: `disabled-auth-${Date.now()}@example.invalid`,
      phone: `0916${Math.floor(1_000_000 + Math.random() * 9_000_000)}`,
      passwordHash: await hashPassword(disabledPassword),
      role: "SALES_REP",
      isActive: false,
    },
  });
  const disabledLoginResponse = await loginRoute(
    createApiRequest(
      "http://localhost:3000/api/auth/login",
      "POST",
      { identifier: disabledUser.email, password: disabledPassword },
      undefined,
      { "x-forwarded-for": "198.51.100.11" }
    )
  );
  const disabledLoginBody = await disabledLoginResponse.json();
  assert(disabledLoginResponse.status === 401, "رد ورود کاربر غیرفعال");
  assert(
    disabledLoginBody.error === wrongPasswordLoginBody.error,
    "یکسان بودن پاسخ کاربر غیرفعال، ناموجود و رمز اشتباه"
  );

  const disabledToken = await signSessionToken({
    userId: disabledUser.id,
    sessionVersion: disabledUser.sessionVersion,
  });
  const disabledSessionResponse = await getCurrentUserRoute(
    createApiRequest("http://localhost:3000/api/auth/me", "GET", undefined, disabledToken)
  );
  assert(disabledSessionResponse.status === 401, "رد نشست امضاشده متعلق به کاربر غیرفعال");

  const unauthenticatedProductsResponse = await getProductsRoute(
    createApiRequest("http://localhost:3000/api/products", "GET")
  );
  assert(
    unauthenticatedProductsResponse.status === 401,
    "رد GET /api/products بدون نشست معتبر"
  );

  const unauthenticatedRecommendationResponse = await createRecommendationRoute(
    createApiRequest("http://localhost:3000/api/recommendation", "POST", {})
  );
  assert(
    unauthenticatedRecommendationResponse.status === 401,
    "رد POST /api/recommendation بدون نشست معتبر"
  );

  const disabledProductsResponse = await getProductsRoute(
    createApiRequest("http://localhost:3000/api/products", "GET", undefined, disabledToken)
  );
  const expiredRecommendationResponse = await createRecommendationRoute(
    createApiRequest(
      "http://localhost:3000/api/recommendation",
      "POST",
      {},
      expiredToken
    )
  );
  assert(
    disabledProductsResponse.status === 401 &&
      expiredRecommendationResponse.status === 401,
    "اعمال resolver مرکزی برای کاربر غیرفعال و نشست منقضی در APIهای حساس"
  );

  const passwordChangeResponse = await updateTeamRoute(
    createApiRequest(
      "http://localhost:3000/api/team",
      "PUT",
      {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        phone: authUser.phone,
        role: authUser.role,
        password: "ChangedAuthPassword!456",
        isActive: true,
      },
      adminToken
    )
  );
  const authUserAfterPasswordChange = await prisma.user.findUniqueOrThrow({
    where: { id: authUser.id },
  });
  assert(
    passwordChangeResponse.status === 200 &&
      authUserAfterPasswordChange.sessionVersion === authUser.sessionVersion + 1,
    "افزایش نسخه نشست هم‌زمان با تغییر رمز عبور"
  );
  const oldSessionResponse = await getCurrentUserRoute(
    createApiRequest("http://localhost:3000/api/auth/me", "GET", undefined, authToken)
  );
  assert(oldSessionResponse.status === 401, "رد نشست قدیمی پس از افزایش sessionVersion");

  const currentAuthToken = await signSessionToken({
    userId: authUserAfterPasswordChange.id,
    sessionVersion: authUserAfterPasswordChange.sessionVersion,
  });
  const logoutResponse = await logoutRoute(
    createApiRequest("http://localhost:3000/api/auth/logout", "POST", undefined, currentAuthToken)
  );
  const authUserAfterLogout = await prisma.user.findUniqueOrThrow({ where: { id: authUser.id } });
  const loggedOutSessionResponse = await getCurrentUserRoute(
    createApiRequest("http://localhost:3000/api/auth/me", "GET", undefined, currentAuthToken)
  );
  assert(
    logoutResponse.status === 200 &&
      authUserAfterLogout.sessionVersion === authUserAfterPasswordChange.sessionVersion + 1,
    "خروج سراسری با افزایش نسخه نشست"
  );
  assert(
    loggedOutSessionResponse.status === 401 &&
      /Max-Age=0/i.test(logoutResponse.headers.get("set-cookie") || ""),
    "رد JWT پس از خروج و حذف فوری کوکی نشست"
  );

  for (let attempt = 1; attempt <= 5; attempt++) {
    const wrongAttemptResponse = await loginRoute(
      createApiRequest(
        "http://localhost:3000/api/auth/login",
        "POST",
        { identifier: authUser.email, password: `WrongAttemptPassword!${attempt}` },
        undefined,
        { "x-forwarded-for": "198.51.100.12" }
      )
    );
    assert(wrongAttemptResponse.status === 401, `ثبت تلاش ناموفق ورود شماره ${attempt}`);
  }
  const rateLimitedResponse = await loginRoute(
    createApiRequest(
      "http://localhost:3000/api/auth/login",
      "POST",
      { identifier: authUser.email, password: "ChangedAuthPassword!456" },
      undefined,
      { "x-forwarded-for": "198.51.100.12" }
    )
  );
  assert(
    rateLimitedResponse.status === 429 &&
      Number(rateLimitedResponse.headers.get("retry-after")) > 0,
    "مسدودسازی brute-force پس از پنج تلاش و ارسال Retry-After"
  );

  const concurrentRateLimitKey = createRateLimitKey(
    "auth-test-concurrent",
    `${Date.now()}-${Math.random()}`
  );
  const concurrentLimits = await Promise.all(
    Array.from({ length: 6 }, () => checkRateLimit(concurrentRateLimitKey, 5, 60_000))
  );
  assert(
    concurrentLimits.filter((result) => result.allowed).length === 5 &&
      concurrentLimits.filter((result) => !result.allowed).length === 1,
    "عدم عبور بیش از پنج تلاش هنگام درخواست‌های هم‌زمان"
  );
  await resetRateLimit(concurrentRateLimitKey);

  const deletedUser = await prisma.user.create({
    data: {
      name: "کاربر حذف‌شونده تست نشست",
      email: `deleted-session-${Date.now()}@example.invalid`,
      phone: `0917${Math.floor(1_000_000 + Math.random() * 9_000_000)}`,
      passwordHash: await hashPassword("DeletedUserPassword!123"),
      role: "SALES_REP",
      isActive: true,
    },
  });
  const deletedUserToken = await signSessionToken({
    userId: deletedUser.id,
    sessionVersion: deletedUser.sessionVersion,
  });
  await prisma.user.delete({ where: { id: deletedUser.id } });
  const deletedUserSessionResponse = await getCurrentUserRoute(
    createApiRequest(
      "http://localhost:3000/api/auth/me",
      "GET",
      undefined,
      deletedUserToken
    )
  );
  assert(
    deletedUserSessionResponse.status === 401,
    "رد JWT پس از حذف کاربر صادرشده برای آن"
  );

  const legacyPassword = "LegacyCostTenPassword!123";
  const legacyUser = await prisma.user.create({
    data: {
      name: "کاربر تست ارتقای bcrypt",
      email: `legacy-bcrypt-${Date.now()}@example.invalid`,
      phone: `0918${Math.floor(1_000_000 + Math.random() * 9_000_000)}`,
      passwordHash: await bcrypt.hash(legacyPassword, 10),
      role: "SALES_REP",
      isActive: true,
    },
  });
  const legacyLoginResponse = await loginRoute(
    createApiRequest("http://localhost:3000/api/auth/login", "POST", {
      identifier: legacyUser.email,
      password: legacyPassword,
    })
  );
  const upgradedLegacyUser = await prisma.user.findUniqueOrThrow({
    where: { id: legacyUser.id },
  });
  assert(
    legacyLoginResponse.status === 200 &&
      bcrypt.getRounds(upgradedLegacyUser.passwordHash) === PASSWORD_HASH_ROUNDS,
    "ورود موفق با bcrypt cost 10 و ارتقای شفاف هش به cost 12"
  );

  const malformedHashUser = await prisma.user.create({
    data: {
      name: "کاربر تست هش معیوب",
      email: `malformed-hash-${Date.now()}@example.invalid`,
      phone: `0919${Math.floor(1_000_000 + Math.random() * 9_000_000)}`,
      passwordHash: "not-a-valid-bcrypt-hash",
      role: "SALES_REP",
      isActive: true,
    },
  });
  const malformedHashLoginResponse = await loginRoute(
    createApiRequest("http://localhost:3000/api/auth/login", "POST", {
      identifier: malformedHashUser.email,
      password: "AnyPasswordWillFail!123",
    })
  );
  const malformedHashLoginBody = await malformedHashLoginResponse.json();
  assert(
    malformedHashLoginResponse.status === 401 &&
      malformedHashLoginBody.error === wrongPasswordLoginBody.error,
    "هش ذخیره‌شده معیوب بدون crash و با پاسخ عمومی ورود رد می‌شود"
  );

  const malformedKnownAccountResponse = await loginRoute(
    createApiRequest("http://localhost:3000/api/auth/login", "POST", {
      identifier: authUser.email,
    })
  );
  const malformedUnknownAccountResponse = await loginRoute(
    createApiRequest("http://localhost:3000/api/auth/login", "POST", {
      identifier: "unknown-malformed@example.invalid",
    })
  );
  const malformedKnownBody = await malformedKnownAccountResponse.json();
  const malformedUnknownBody = await malformedUnknownAccountResponse.json();
  assert(
    malformedKnownAccountResponse.status === 400 &&
      malformedUnknownAccountResponse.status === 400 &&
      malformedKnownBody.error === malformedUnknownBody.error,
    "یکسان بودن پاسخ ورودی malformed برای حساب موجود و ناموجود"
  );

  const rejectedProductionSecrets = [
    "a".repeat(32),
    "1".repeat(32),
    "passwordpasswordpasswordpassword",
    "secretsecretsecretsecretsecret12",
    "abcd1234".repeat(6),
    "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG",
  ].every((candidate) => {
    try {
      validateJwtSecret(candidate, true);
      return false;
    } catch {
      return true;
    }
  });
  assert(
    rejectedProductionSecrets,
    "رد secretهای طولانی اما تکراری، کم‌تنوع یا قابل‌پیش‌بینی در تولید"
  );

  let startupValidationRejectedWeakSecret = false;
  try {
    validateAuthEnvironment({
      NODE_ENV: "production",
      JWT_SECRET: "predictable-pattern-".repeat(4),
    });
  } catch {
    startupValidationRejectedWeakSecret = true;
  }
  let validProductionSecretAccepted = true;
  try {
    validateJwtSecret(process.env.JWT_SECRET, true);
  } catch {
    validProductionSecretAccepted = false;
  }
  assert(
    startupValidationRejectedWeakSecret && validProductionSecretAccepted,
    "اعتبارسنجی fail-fast تنظیمات تولید و پذیرش secret تصادفی معتبر"
  );

  const spoofedIpRequest = createApiRequest(
    "http://localhost:3000/api/auth/login",
    "POST",
    {},
    undefined,
    { "x-forwarded-for": "198.51.100.100" }
  );
  const malformedIpRequest = createApiRequest(
    "http://localhost:3000/api/auth/login",
    "POST",
    {},
    undefined,
    { "x-forwarded-for": "not-an-ip, 198.51.100.101" }
  );
  assert(
    getClientIp(spoofedIpRequest, {
      trustProxy: false,
      proxyHeader: "x-forwarded-for",
    }) === null &&
      getClientIp(spoofedIpRequest, {
        trustProxy: true,
        proxyHeader: "x-forwarded-for",
      }) === "198.51.100.100" &&
      getClientIp(malformedIpRequest, {
        trustProxy: true,
        proxyHeader: "x-forwarded-for",
      }) === null,
    "نادیده‌گرفتن header جعلی بدون trust proxy و رد IP malformed"
  );
  assert(
    getClientIpOptions({
      TRUST_PROXY: "false",
      TRUST_PROXY_HEADER: "x-forwarded-for",
    }).trustProxy === false,
    "غیرفعال بودن اعتماد به proxy به‌صورت پیش‌فرض و صریح"
  );

  const logoutCookie = logoutResponse.headers.get("set-cookie") || "";
  assert(
    /Path=\//i.test(loginCookie) &&
      /HttpOnly/i.test(logoutCookie) &&
      /SameSite=Lax/i.test(logoutCookie) &&
      /Path=\//i.test(logoutCookie) &&
      /Expires=Thu, 01 Jan 1970/i.test(logoutCookie),
    "یکسان بودن scope و ویژگی‌های امنیتی کوکی هنگام ایجاد و حذف"
  );

  const staleDashboardSession = await getSessionFromRequest(
    createApiRequest("http://localhost:3000/dashboard", "GET", undefined, authToken)
  );
  assert(
    getDashboardAuthRedirect(staleDashboardSession) === "/login" &&
      getDashboardAuthRedirect(null) === "/login",
    "هدایت سروری داشبورد برای sessionVersion قدیمی و درخواست بدون نشست"
  );

  // 18. Complete server-side authorization matrix and cross-rep IDOR tests
  console.log("\n--- ۱۸. آزمون جامع مجوزهای سرور، نقش فقط‌خواندنی و IDOR بین کارشناسان ---");

  type ProtectedRouteCall = {
    name: string;
    call: () => Promise<Response>;
  };

  const routeContext = { params: Promise.resolve({ id: "authorization-test-id" }) };
  const protectedRouteCalls: ProtectedRouteCall[] = [
    { name: "GET /api/audit-logs", call: () => getAuditLogsRoute(createApiRequest("/api/audit-logs", "GET")) },
    { name: "GET /api/auth/me", call: () => getCurrentUserRoute(createApiRequest("/api/auth/me", "GET")) },
    { name: "GET /api/customers", call: () => getCustomersRoute(createApiRequest("/api/customers", "GET")) },
    { name: "POST /api/customers", call: () => createCustomerRoute(createApiRequest("/api/customers", "POST", {})) },
    { name: "GET /api/customers/:id", call: () => getCustomerByIdRoute(createApiRequest("/api/customers/authorization-test-id", "GET"), routeContext) },
    { name: "PUT /api/customers/:id", call: () => updateCustomerRoute(createApiRequest("/api/customers/authorization-test-id", "PUT", {}), routeContext) },
    { name: "DELETE /api/customers/:id", call: () => deleteCustomerRoute(createApiRequest("/api/customers/authorization-test-id", "DELETE"), routeContext) },
    { name: "GET /api/dashboard", call: () => getDashboardRoute(createApiRequest("/api/dashboard", "GET")) },
    { name: "GET /api/excel/export", call: () => exportExcelRoute(createApiRequest("/api/excel/export", "GET")) },
    { name: "GET /api/followups", call: () => getFollowUpsRoute(createApiRequest("/api/followups", "GET")) },
    { name: "POST /api/followups", call: () => createFollowUpRoute(createApiRequest("/api/followups", "POST", {})) },
    { name: "PUT /api/followups", call: () => updateFollowUpRoute(createApiRequest("/api/followups", "PUT", {})) },
    { name: "DELETE /api/followups", call: () => deleteFollowUpRoute(createApiRequest("/api/followups?id=authorization-test-id", "DELETE")) },
    { name: "GET /api/installments", call: () => getInstallmentsRoute(createApiRequest("/api/installments", "GET")) },
    { name: "PUT /api/installments", call: () => updateInstallmentRoute(createApiRequest("/api/installments", "PUT", {})) },
    { name: "GET /api/inventory", call: () => getInventoryRoute(createApiRequest("/api/inventory", "GET")) },
    { name: "POST /api/inventory", call: () => inventoryMovementRoute(createApiRequest("/api/inventory", "POST", {})) },
    { name: "GET /api/leads", call: () => getLeadsRoute(createApiRequest("/api/leads", "GET")) },
    { name: "POST /api/leads", call: () => createLeadRoute(createApiRequest("/api/leads", "POST", {})) },
    { name: "GET /api/leads/:id", call: () => getLeadByIdRoute(createApiRequest("/api/leads/authorization-test-id", "GET"), routeContext) },
    { name: "PUT /api/leads/:id", call: () => updateLeadRoute(createApiRequest("/api/leads/authorization-test-id", "PUT", {}), routeContext) },
    { name: "DELETE /api/leads/:id", call: () => deleteLeadRoute(createApiRequest("/api/leads/authorization-test-id", "DELETE"), routeContext) },
    { name: "POST /api/leads/:id/convert", call: () => convertLeadRoute(createApiRequest("/api/leads/authorization-test-id/convert", "POST", {}), routeContext) },
    { name: "GET /api/notifications", call: () => getNotificationsRoute(createApiRequest("/api/notifications", "GET")) },
    { name: "PUT /api/notifications", call: () => updateNotificationsRoute(createApiRequest("/api/notifications", "PUT", {})) },
    { name: "GET /api/orders", call: () => getOrdersRoute(createApiRequest("/api/orders", "GET")) },
    { name: "POST /api/orders", call: () => createOrderRoute(createApiRequest("/api/orders", "POST", {})) },
    { name: "DELETE /api/orders", call: () => deleteOrderRoute(createApiRequest("/api/orders?id=authorization-test-id", "DELETE")) },
    { name: "GET /api/pipeline", call: () => getPipelineRoute(createApiRequest("/api/pipeline", "GET")) },
    { name: "POST /api/pipeline", call: () => createDealRoute(createApiRequest("/api/pipeline", "POST", {})) },
    { name: "PUT /api/pipeline", call: () => updateDealRoute(createApiRequest("/api/pipeline", "PUT", {})) },
    { name: "DELETE /api/pipeline", call: () => deleteDealRoute(createApiRequest("/api/pipeline?id=authorization-test-id", "DELETE")) },
    { name: "PUT /api/pipeline/:id/stage", call: () => updateDealStageRoute(createApiRequest("/api/pipeline/authorization-test-id/stage", "PUT", {}), routeContext) },
    { name: "GET /api/products", call: () => getProductsRoute(createApiRequest("/api/products", "GET")) },
    { name: "POST /api/products", call: () => createProductRoute(createApiRequest("/api/products", "POST", {})) },
    { name: "PUT /api/products", call: () => updateProductRoute(createApiRequest("/api/products", "PUT", {})) },
    { name: "DELETE /api/products", call: () => deleteProductRoute(createApiRequest("/api/products?id=authorization-test-id", "DELETE")) },
    { name: "POST /api/recommendation", call: () => createRecommendationRoute(createApiRequest("/api/recommendation", "POST", {})) },
    { name: "GET /api/reports", call: () => getReportsRoute(createApiRequest("/api/reports", "GET")) },
    { name: "GET /api/search", call: () => getSearchRoute(createApiRequest("/api/search?q=test", "GET")) },
    { name: "GET /api/team", call: () => getTeamRoute(createApiRequest("/api/team", "GET")) },
    { name: "POST /api/team", call: () => createTeamRoute(createApiRequest("/api/team", "POST", {})) },
    { name: "PUT /api/team", call: () => updateTeamRoute(createApiRequest("/api/team", "PUT", {})) },
    { name: "DELETE /api/team", call: () => deleteTeamRoute(createApiRequest("/api/team?id=authorization-test-id", "DELETE")) },
  ];

  const unauthenticatedFailures: string[] = [];
  for (const route of protectedRouteCalls) {
    const response = await route.call();
    if (response.status !== 401) {
      unauthenticatedFailures.push(`${route.name}: ${response.status}`);
    }
  }
  assert(
    unauthenticatedFailures.length === 0,
    `تمام ۴۴ متد محافظت‌شده بدون نشست HTTP 401 می‌دهند${
      unauthenticatedFailures.length ? ` (${unauthenticatedFailures.join(", ")})` : ""
    }`
  );

  const phase4Marker = `P4B${Date.now()}`;
  const phase4RepB = await prisma.user.create({
    data: {
      name: `کارشناس ب ${phase4Marker}`,
      email: `${phase4Marker.toLowerCase()}@example.invalid`,
      phone: `0901${Math.floor(1_000_000 + Math.random() * 9_000_000)}`,
      passwordHash: await hashPassword("Phase4RepBPassword!123"),
      role: "SALES_REP",
      isActive: true,
    },
  });

  const phase4OwnCustomer = await prisma.customer.create({
    data: {
      code: `CUST-A-${phase4Marker}`,
      firstName: "مشتری الف",
      lastName: "مالکیت مرحله چهار",
      phone: `0902${Math.floor(1_000_000 + Math.random() * 9_000_000)}`,
      province: "تهران",
      city: "تهران",
      assignedToId: salesUser.id,
    },
  });
  const phase4OtherCustomer = await prisma.customer.create({
    data: {
      code: `CUST-B-${phase4Marker}`,
      firstName: phase4Marker,
      lastName: "مشتری کارشناس ب",
      phone: `0903${Math.floor(1_000_000 + Math.random() * 9_000_000)}`,
      province: "اصفهان",
      city: "اصفهان",
      assignedToId: phase4RepB.id,
    },
  });
  const phase4OwnLead = await prisma.lead.create({
    data: {
      firstName: "سرنخ الف",
      lastName: "مالکیت مرحله چهار",
      phone: `0904${Math.floor(1_000_000 + Math.random() * 9_000_000)}`,
      province: "تهران",
      city: "تهران",
      assignedToId: salesUser.id,
    },
  });
  const phase4OtherLead = await prisma.lead.create({
    data: {
      firstName: phase4Marker,
      lastName: "سرنخ کارشناس ب",
      phone: `0905${Math.floor(1_000_000 + Math.random() * 9_000_000)}`,
      province: "اصفهان",
      city: "اصفهان",
      assignedToId: phase4RepB.id,
    },
  });

  const phase4Product = await prisma.product.create({
    data: {
      code: `PROD-${phase4Marker}`,
      name: `فرش ${phase4Marker}`,
      pattern: "افشان",
      collection: "تست مجوز",
      shane: 1200,
      density: 3600,
      yarnMaterial: "اکریلیک",
      weavingMachine: "وندویل",
      style: "کلاسیک",
      primaryColor: "کرم",
      images: [],
      variants: {
        create: {
          sku: `SKU-${phase4Marker}`,
          size: "3x4",
          areaSquareMeters: 12,
          cashPrice: 15_000_000,
          installmentPrice: 18_000_000,
          stock: 20,
          reservedStock: 0,
          soldStock: 0,
          isActive: true,
        },
      },
    },
    include: { variants: true },
  });
  const phase4Variant = phase4Product.variants[0];

  const phase4OtherDeal = await prisma.deal.create({
    data: {
      title: `معامله ب ${phase4Marker}`,
      value: 99_000_000,
      stage: "NEGOTIATION",
      priority: "HIGH",
      leadId: phase4OtherLead.id,
      customerId: phase4OtherCustomer.id,
      productId: phase4Product.id,
      variantId: phase4Variant.id,
      assignedToId: phase4RepB.id,
    },
  });
  const phase4CrossDeal = await prisma.deal.create({
    data: {
      title: `معامله توکار ب ${phase4Marker}`,
      value: 88_000_000,
      stage: "PROPOSAL_SENT",
      priority: "HIGH",
      leadId: phase4OwnLead.id,
      customerId: phase4OwnCustomer.id,
      assignedToId: phase4RepB.id,
    },
  });
  const phase4OwnDeal = await prisma.deal.create({
    data: {
      title: `معامله الف ${phase4Marker}`,
      value: 20_000_000,
      stage: "CONTACTED",
      priority: "MEDIUM",
      leadId: phase4OwnLead.id,
      customerId: phase4OwnCustomer.id,
      assignedToId: salesUser.id,
    },
  });
  const phase4OtherFollowUp = await prisma.followUp.create({
    data: {
      title: `پیگیری ب ${phase4Marker}`,
      type: "CALL",
      priority: "HIGH",
      status: "PENDING",
      scheduledAt: new Date(Date.now() + 86_400_000),
      leadId: phase4OtherLead.id,
      customerId: phase4OtherCustomer.id,
      dealId: phase4OtherDeal.id,
      assignedToId: phase4RepB.id,
    },
  });
  const phase4CrossFollowUp = await prisma.followUp.create({
    data: {
      title: `پیگیری توکار ب ${phase4Marker}`,
      type: "CALL",
      priority: "HIGH",
      status: "PENDING",
      scheduledAt: new Date(Date.now() + 86_400_000),
      leadId: phase4OwnLead.id,
      customerId: phase4OwnCustomer.id,
      dealId: phase4OwnDeal.id,
      assignedToId: phase4RepB.id,
    },
  });

  const phase4OtherOrder = await prisma.order.create({
    data: {
      orderNumber: `ORDER-B-${phase4Marker}`,
      customerId: phase4OtherCustomer.id,
      sellerId: phase4RepB.id,
      totalAmount: 15_000_000,
      finalAmount: 15_000_000,
      paidAmount: 0,
      remainingAmount: 15_000_000,
      paymentMethod: "INSTALLMENT",
      status: "CONFIRMED",
      items: {
        create: {
          variantId: phase4Variant.id,
          quantity: 1,
          unitPrice: 15_000_000,
          totalPrice: 15_000_000,
        },
      },
      installments: {
        create: {
          installmentNumber: 1,
          amount: 15_000_000,
          dueDate: new Date(Date.now() + 2 * 86_400_000),
          status: "PENDING",
        },
      },
    },
    include: { installments: true },
  });
  const phase4CrossOrder = await prisma.order.create({
    data: {
      orderNumber: `ORDER-CROSS-${phase4Marker}`,
      customerId: phase4OwnCustomer.id,
      sellerId: phase4RepB.id,
      totalAmount: 15_000_000,
      finalAmount: 15_000_000,
      paidAmount: 0,
      remainingAmount: 15_000_000,
      status: "CONFIRMED",
      items: {
        create: {
          variantId: phase4Variant.id,
          quantity: 1,
          unitPrice: 15_000_000,
          totalPrice: 15_000_000,
        },
      },
    },
  });
  const phase4OtherInstallment = phase4OtherOrder.installments[0];

  const customerReadByRepA = await getCustomerByIdRoute(
    createApiRequest(`/api/customers/${phase4OtherCustomer.id}`, "GET", undefined, salesToken),
    { params: Promise.resolve({ id: phase4OtherCustomer.id }) }
  );
  const customerUpdateByRepA = await updateCustomerRoute(
    createApiRequest(`/api/customers/${phase4OtherCustomer.id}`, "PUT", { notes: "تلاش غیرمجاز" }, salesToken),
    { params: Promise.resolve({ id: phase4OtherCustomer.id }) }
  );
  const customerDeleteByRepA = await deleteCustomerRoute(
    createApiRequest(`/api/customers/${phase4OtherCustomer.id}`, "DELETE", undefined, salesToken),
    { params: Promise.resolve({ id: phase4OtherCustomer.id }) }
  );
  assert(
    customerReadByRepA.status === 403 &&
      customerUpdateByRepA.status === 403 &&
      customerDeleteByRepA.status === 403,
    "Rep A نمی‌تواند مشتری Rep B را بخواند، ویرایش یا حذف کند"
  );

  const leadReadByRepA = await getLeadByIdRoute(
    createApiRequest(`/api/leads/${phase4OtherLead.id}`, "GET", undefined, salesToken),
    { params: Promise.resolve({ id: phase4OtherLead.id }) }
  );
  const leadUpdateByRepA = await updateLeadRoute(
    createApiRequest(`/api/leads/${phase4OtherLead.id}`, "PUT", { notes: "تلاش غیرمجاز" }, salesToken),
    { params: Promise.resolve({ id: phase4OtherLead.id }) }
  );
  const leadDeleteByRepA = await deleteLeadRoute(
    createApiRequest(`/api/leads/${phase4OtherLead.id}`, "DELETE", undefined, salesToken),
    { params: Promise.resolve({ id: phase4OtherLead.id }) }
  );
  const leadConvertByRepA = await convertLeadRoute(
    createApiRequest(`/api/leads/${phase4OtherLead.id}/convert`, "POST", {}, salesToken),
    { params: Promise.resolve({ id: phase4OtherLead.id }) }
  );
  assert(
    leadReadByRepA.status === 403 &&
      leadUpdateByRepA.status === 403 &&
      leadDeleteByRepA.status === 403 &&
      leadConvertByRepA.status === 403,
    "Rep A نمی‌تواند سرنخ Rep B را بخواند، ویرایش، حذف یا تبدیل کند"
  );

  const pipelineForRepAResponse = await getPipelineRoute(
    createApiRequest("/api/pipeline", "GET", undefined, salesToken)
  );
  const pipelineForRepA = await pipelineForRepAResponse.json();
  const dealUpdateByRepA = await updateDealRoute(
    createApiRequest("/api/pipeline", "PUT", { id: phase4OtherDeal.id, title: phase4OtherDeal.title }, salesToken)
  );
  const dealStageByRepA = await updateDealStageRoute(
    createApiRequest(`/api/pipeline/${phase4OtherDeal.id}/stage`, "PUT", { stage: "WON" }, salesToken),
    { params: Promise.resolve({ id: phase4OtherDeal.id }) }
  );
  const dealDeleteByRepA = await deleteDealRoute(
    createApiRequest(`/api/pipeline?id=${phase4OtherDeal.id}`, "DELETE", undefined, salesToken)
  );
  assert(
    pipelineForRepAResponse.status === 200 &&
      !pipelineForRepA.deals.some((deal: { id: string }) => deal.id === phase4OtherDeal.id) &&
      dealUpdateByRepA.status === 403 &&
      dealStageByRepA.status === 403 &&
      dealDeleteByRepA.status === 403,
    "Rep A نمی‌تواند معامله Rep B را فهرست، ویرایش، جابه‌جا یا حذف کند"
  );
  const ownDealInPipeline = pipelineForRepA.deals.find(
    (deal: { id: string }) => deal.id === phase4OwnDeal.id
  );
  assert(
    ownDealInPipeline &&
      !ownDealInPipeline.followUps.some(
        (followUp: { id: string }) => followUp.id === phase4CrossFollowUp.id
      ),
    "پیگیری Rep B از رابطه توکار معامله Rep A نشت نمی‌کند"
  );

  const followUpsForRepAResponse = await getFollowUpsRoute(
    createApiRequest("/api/followups", "GET", undefined, salesToken)
  );
  const followUpsForRepA = await followUpsForRepAResponse.json();
  const followUpUpdateByRepA = await updateFollowUpRoute(
    createApiRequest("/api/followups", "PUT", { id: phase4OtherFollowUp.id, status: "DONE" }, salesToken)
  );
  const followUpDeleteByRepA = await deleteFollowUpRoute(
    createApiRequest(`/api/followups?id=${phase4OtherFollowUp.id}`, "DELETE", undefined, salesToken)
  );
  assert(
    followUpsForRepAResponse.status === 200 &&
      !followUpsForRepA.followUps.some((followUp: { id: string }) => followUp.id === phase4OtherFollowUp.id) &&
      followUpUpdateByRepA.status === 403 &&
      followUpDeleteByRepA.status === 403,
    "Rep A نمی‌تواند پیگیری Rep B را فهرست، ویرایش یا حذف کند"
  );

  const ordersForRepAResponse = await getOrdersRoute(
    createApiRequest("/api/orders", "GET", undefined, salesToken)
  );
  const ordersForRepA = await ordersForRepAResponse.json();
  const orderCreateForOtherCustomer = await createOrderRoute(
    createApiRequest(
      "/api/orders",
      "POST",
      {
        customerId: phase4OtherCustomer.id,
        items: [{ variantId: phase4Variant.id, quantity: 1 }],
        paymentMethod: "CASH",
      },
      salesToken
    )
  );
  const orderDeleteByRepA = await deleteOrderRoute(
    createApiRequest(`/api/orders?id=${phase4OtherOrder.id}`, "DELETE", undefined, salesToken)
  );
  assert(
    ordersForRepAResponse.status === 200 &&
      !ordersForRepA.orders.some((order: { id: string }) => order.id === phase4OtherOrder.id) &&
      orderCreateForOtherCustomer.status === 403 &&
      orderDeleteByRepA.status === 403,
    "Rep A نمی‌تواند سفارش Rep B را ببیند، برای مشتری او سفارش بسازد یا سفارش را حذف کند"
  );

  const installmentsForRepAResponse = await getInstallmentsRoute(
    createApiRequest("/api/installments", "GET", undefined, salesToken)
  );
  const installmentsForRepA = await installmentsForRepAResponse.json();
  const installmentUpdateByRepA = await updateInstallmentRoute(
    createApiRequest(
      "/api/installments",
      "PUT",
      { id: phase4OtherInstallment.id, status: "PAID" },
      salesToken
    )
  );
  assert(
    installmentsForRepAResponse.status === 200 &&
      !installmentsForRepA.installments.some(
        (installment: { id: string }) => installment.id === phase4OtherInstallment.id
      ) &&
      installmentUpdateByRepA.status === 403,
    "اقساط سفارش Rep B برای Rep A مخفی و غیرقابل‌ویرایش است"
  );

  const forbiddenDealLink = await createDealRoute(
    createApiRequest(
      "/api/pipeline",
      "POST",
      {
        title: "تلاش اتصال به منابع کارشناس ب",
        value: 1_000_000,
        leadId: phase4OtherLead.id,
        customerId: phase4OtherCustomer.id,
      },
      salesToken
    )
  );
  const forbiddenFollowUpLink = await createFollowUpRoute(
    createApiRequest(
      "/api/followups",
      "POST",
      {
        title: "تلاش اتصال پیگیری به منابع کارشناس ب",
        type: "CALL",
        priority: "HIGH",
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
        leadId: phase4OtherLead.id,
        customerId: phase4OtherCustomer.id,
        dealId: phase4OtherDeal.id,
      },
      salesToken
    )
  );
  assert(
    forbiddenDealLink.status === 403 && forbiddenFollowUpLink.status === 403,
    "Rep A نمی‌تواند معامله یا پیگیری را به منابع متعلق به Rep B متصل کند"
  );

  const ownCustomerDetailResponse = await getCustomerByIdRoute(
    createApiRequest(`/api/customers/${phase4OwnCustomer.id}`, "GET", undefined, salesToken),
    { params: Promise.resolve({ id: phase4OwnCustomer.id }) }
  );
  const ownCustomerDetail = await ownCustomerDetailResponse.json();
  const ownLeadDetailResponse = await getLeadByIdRoute(
    createApiRequest(`/api/leads/${phase4OwnLead.id}`, "GET", undefined, salesToken),
    { params: Promise.resolve({ id: phase4OwnLead.id }) }
  );
  const ownLeadDetail = await ownLeadDetailResponse.json();
  assert(
    ownCustomerDetailResponse.status === 200 &&
      !ownCustomerDetail.customer.deals.some((deal: { id: string }) => deal.id === phase4CrossDeal.id) &&
      !ownCustomerDetail.customer.followUps.some(
        (followUp: { id: string }) => followUp.id === phase4CrossFollowUp.id
      ) &&
      !ownCustomerDetail.customer.orders.some((order: { id: string }) => order.id === phase4CrossOrder.id) &&
      ownLeadDetailResponse.status === 200 &&
      !ownLeadDetail.lead.deals.some((deal: { id: string }) => deal.id === phase4CrossDeal.id) &&
      !ownLeadDetail.lead.followUps.some(
        (followUp: { id: string }) => followUp.id === phase4CrossFollowUp.id
      ),
    "روابط توکار متعلق به Rep B از پرونده مشتری و سرنخ Rep A نشت نمی‌کنند"
  );

  const dashboardForRepAResponse = await getDashboardRoute(
    createApiRequest("/api/dashboard", "GET", undefined, salesToken)
  );
  const dashboardForRepA = await dashboardForRepAResponse.json();
  const searchForRepAResponse = await getSearchRoute(
    createApiRequest(`/api/search?q=${phase4Marker}`, "GET", undefined, salesToken)
  );
  const searchForRepA = await searchForRepAResponse.json();
  assert(
    dashboardForRepAResponse.status === 200 &&
      dashboardForRepA.leaderboard.every((row: { id: string }) => row.id === salesUser.id) &&
      !dashboardForRepA.highValueOpportunities.some(
        (deal: { id: string }) => deal.id === phase4OtherDeal.id || deal.id === phase4CrossDeal.id
      ),
    "dashboard کارشناس فقط آمار، فرصت‌ها و ردیف رتبه‌بندی مجاز همان Rep را برمی‌گرداند"
  );
  assert(
    searchForRepAResponse.status === 200 &&
      !searchForRepA.customers.some(
        (customer: { id: string }) => customer.id === phase4OtherCustomer.id
      ) &&
      !searchForRepA.leads.some((lead: { id: string }) => lead.id === phase4OtherLead.id),
    "جست‌وجوی Rep A مشتری و سرنخ Rep B را افشا نمی‌کند"
  );

  const excelForRepAResponse = await exportExcelRoute(
    createApiRequest("/api/excel/export?type=leads", "GET", undefined, salesToken)
  );
  const excelWorkbook = XLSX.read(await excelForRepAResponse.arrayBuffer(), { type: "array" });
  const excelSheet = excelWorkbook.Sheets[excelWorkbook.SheetNames[0]];
  const excelRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(excelSheet);
  assert(
    excelForRepAResponse.status === 200 && !JSON.stringify(excelRows).includes(phase4Marker),
    "خروجی Excel کارشناس فروش شامل سرنخ Rep دیگر نیست"
  );

  const viewerMutationCalls: ProtectedRouteCall[] = [
    { name: "POST /api/customers", call: () => createCustomerRoute(createApiRequest("/api/customers", "POST", {}, viewerToken)) },
    { name: "PUT /api/customers/:id", call: () => updateCustomerRoute(createApiRequest(`/api/customers/${phase4OtherCustomer.id}`, "PUT", {}, viewerToken), { params: Promise.resolve({ id: phase4OtherCustomer.id }) }) },
    { name: "DELETE /api/customers/:id", call: () => deleteCustomerRoute(createApiRequest(`/api/customers/${phase4OtherCustomer.id}`, "DELETE", undefined, viewerToken), { params: Promise.resolve({ id: phase4OtherCustomer.id }) }) },
    { name: "POST /api/leads", call: () => createLeadRoute(createApiRequest("/api/leads", "POST", {}, viewerToken)) },
    { name: "PUT /api/leads/:id", call: () => updateLeadRoute(createApiRequest(`/api/leads/${phase4OtherLead.id}`, "PUT", {}, viewerToken), { params: Promise.resolve({ id: phase4OtherLead.id }) }) },
    { name: "DELETE /api/leads/:id", call: () => deleteLeadRoute(createApiRequest(`/api/leads/${phase4OtherLead.id}`, "DELETE", undefined, viewerToken), { params: Promise.resolve({ id: phase4OtherLead.id }) }) },
    { name: "POST /api/leads/:id/convert", call: () => convertLeadRoute(createApiRequest(`/api/leads/${phase4OtherLead.id}/convert`, "POST", {}, viewerToken), { params: Promise.resolve({ id: phase4OtherLead.id }) }) },
    { name: "POST /api/followups", call: () => createFollowUpRoute(createApiRequest("/api/followups", "POST", {}, viewerToken)) },
    { name: "PUT /api/followups", call: () => updateFollowUpRoute(createApiRequest("/api/followups", "PUT", {}, viewerToken)) },
    { name: "DELETE /api/followups", call: () => deleteFollowUpRoute(createApiRequest(`/api/followups?id=${phase4OtherFollowUp.id}`, "DELETE", undefined, viewerToken)) },
    { name: "PUT /api/installments", call: () => updateInstallmentRoute(createApiRequest("/api/installments", "PUT", {}, viewerToken)) },
    { name: "POST /api/inventory", call: () => inventoryMovementRoute(createApiRequest("/api/inventory", "POST", {}, viewerToken)) },
    { name: "POST /api/orders", call: () => createOrderRoute(createApiRequest("/api/orders", "POST", {}, viewerToken)) },
    { name: "DELETE /api/orders", call: () => deleteOrderRoute(createApiRequest(`/api/orders?id=${phase4OtherOrder.id}`, "DELETE", undefined, viewerToken)) },
    { name: "POST /api/pipeline", call: () => createDealRoute(createApiRequest("/api/pipeline", "POST", {}, viewerToken)) },
    { name: "PUT /api/pipeline", call: () => updateDealRoute(createApiRequest("/api/pipeline", "PUT", {}, viewerToken)) },
    { name: "DELETE /api/pipeline", call: () => deleteDealRoute(createApiRequest(`/api/pipeline?id=${phase4OtherDeal.id}`, "DELETE", undefined, viewerToken)) },
    { name: "PUT /api/pipeline/:id/stage", call: () => updateDealStageRoute(createApiRequest(`/api/pipeline/${phase4OtherDeal.id}/stage`, "PUT", {}, viewerToken), { params: Promise.resolve({ id: phase4OtherDeal.id }) }) },
    { name: "POST /api/products", call: () => createProductRoute(createApiRequest("/api/products", "POST", {}, viewerToken)) },
    { name: "PUT /api/products", call: () => updateProductRoute(createApiRequest("/api/products", "PUT", {}, viewerToken)) },
    { name: "DELETE /api/products", call: () => deleteProductRoute(createApiRequest(`/api/products?id=${phase4Product.id}`, "DELETE", undefined, viewerToken)) },
    { name: "POST /api/team", call: () => createTeamRoute(createApiRequest("/api/team", "POST", {}, viewerToken)) },
    { name: "PUT /api/team", call: () => updateTeamRoute(createApiRequest("/api/team", "PUT", {}, viewerToken)) },
    { name: "DELETE /api/team", call: () => deleteTeamRoute(createApiRequest(`/api/team?id=${phase4RepB.id}`, "DELETE", undefined, viewerToken)) },
    { name: "PUT /api/notifications", call: () => updateNotificationsRoute(createApiRequest("/api/notifications", "PUT", {}, viewerToken)) },
  ];
  const viewerMutationFailures: string[] = [];
  for (const route of viewerMutationCalls) {
    const response = await route.call();
    if (response.status !== 403) {
      viewerMutationFailures.push(`${route.name}: ${response.status}`);
    }
  }
  assert(
    viewerMutationFailures.length === 0,
    `VIEWER در هر ۲۵ مسیر تغییر داده با HTTP 403 متوقف می‌شود${
      viewerMutationFailures.length ? ` (${viewerMutationFailures.join(", ")})` : ""
    }`
  );

  const viewerExportResponse = await exportExcelRoute(
    createApiRequest("/api/excel/export?type=customers", "GET", undefined, viewerToken)
  );
  const repTeamResponse = await getTeamRoute(
    createApiRequest("/api/team", "GET", undefined, salesToken)
  );
  const repAuditResponse = await getAuditLogsRoute(
    createApiRequest("/api/audit-logs", "GET", undefined, salesToken)
  );
  const viewerReportsResponse = await getReportsRoute(
    createApiRequest("/api/reports", "GET", undefined, viewerToken)
  );
  const managerTeamUpdateResponse = await updateTeamRoute(
    createApiRequest(
      "/api/team",
      "PUT",
      {
        id: phase4RepB.id,
        name: phase4RepB.name,
        email: phase4RepB.email,
        phone: phase4RepB.phone,
      },
      managerToken
    )
  );
  assert(
    viewerExportResponse.status === 403 &&
      repTeamResponse.status === 403 &&
      repAuditResponse.status === 403 &&
      viewerReportsResponse.status === 403 &&
      managerTeamUpdateResponse.status === 403,
    "منابع مدیریتی و خروجی انبوه طبق ماتریس برای نقش‌های غیرمجاز بسته‌اند"
  );

  console.log("\n==================================================");
  await testPublicUserResponses(assert);
  console.log(`📊 نتیجه نهایی آزمون‌ها: ${passedTests} قبولی | ${failedTests} رد`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log("🎉 تمامی آزمون‌های واقعی پایگاه داده، Route Handlerهای واقعی API، احراز هویت، RBAC، قیدهای یکتایی P2002، انبارداری و تراز مالی با موفقیت پاس شدند!");
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error("Critical error in test suite:", err);
  process.exit(1);
});
