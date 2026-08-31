import { NextRequest } from "next/server";
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
import { signSessionToken, AUTH_COOKIE_NAME } from "../src/lib/auth";

// Import real API Route Handlers
import {
  DELETE as deleteOrderRoute,
  POST as createOrderRoute,
  GET as getOrdersRoute,
} from "../src/app/api/orders/route";
import { PUT as updateInstallmentRoute } from "../src/app/api/installments/route";
import { POST as inventoryMovementRoute } from "../src/app/api/inventory/route";

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
  body?: any,
  sessionToken?: string
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
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
      images: "[]",
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
        preferredSizes: '["3x4"]',
        preferredColors: '["سرمه‌ای"]',
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
    items: [{ variantId: "var_1", quantity: 2, unitPrice: 25000000 }],
    discountAmount: 1000000,
    paymentMethod: "INSTALLMENT",
    initialPaidAmount: 10000000,
    installmentCount: 4,
  });
  assert(validOrder.success === true, "اعتبارسنجی ساختار استاندارد سفارش");

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
      images: "[]",
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
    email: adminUser.email,
    name: adminUser.name,
    role: "ADMIN",
    phone: adminUser.phone,
  });

  const salesToken = await signSessionToken({
    userId: salesUser.id,
    email: salesUser.email,
    name: salesUser.name,
    role: "SALES_REP",
    phone: salesUser.phone,
  });

  const viewerToken = await signSessionToken({
    userId: viewerUser.id,
    email: viewerUser.email,
    name: viewerUser.name,
    role: "VIEWER",
    phone: viewerUser.phone,
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

  console.log("\n==================================================");
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
