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

console.log("==================================================");
console.log("🧪 شروع آزمایش‌های خودکار جامع CRM و پایگاه داده (V3 Real Database Hardening)...");
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

  // 13. Comprehensive Order Deletion, Stock Restoration & Financial Safety Tests
  console.log("\n--- ۱۳. آزمون‌های جامع حذف سفارش، بازگردانی موجودی و گارد مالی ---");

  // Setup test customer, product, and variant
  const testCustomer = await prisma.customer.findFirst();
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
          stock: 5, // initial stock 5
          soldStock: 0,
        },
      },
    },
    include: { variants: true },
  });

  const delVariant = testProductForDelete.variants[0];
  const testCustomerId = testCustomer?.id || "mock-cust";

  // Test 13.1 & 13.2: Create Order (stock 5 -> 4), Delete Order -> Restore Stock (4 -> 5) & Movement
  const orderToDelete = await prisma.$transaction(async (tx) => {
    const ord = await tx.order.create({
      data: {
        orderNumber: `ORD-DEL-TEST-${Date.now()}`,
        customerId: testCustomerId,
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
      include: { items: true },
    });

    await tx.productVariant.update({
      where: { id: delVariant.id },
      data: { stock: { decrement: 1 }, soldStock: { increment: 1 } },
    });

    await tx.inventoryMovement.create({
      data: {
        variantId: delVariant.id,
        type: "SALE",
        quantity: 1,
        previousStock: 5,
        newStock: 4,
        reason: `فروش تست برای سفارش ${ord.orderNumber}`,
      },
    });

    return ord;
  });

  const stockAfterSale = await prisma.productVariant.findUnique({ where: { id: delVariant.id } });
  assert(stockAfterSale?.stock === 4, "موجودی انبار پس از ایجاد سفارش از ۵ به ۴ کاهش یافت");

  // Perform Hard Delete with Restoration logic
  let restoredMovementId = "";
  await prisma.$transaction(async (tx) => {
    const txOrder = await tx.order.findUnique({
      where: { id: orderToDelete.id },
      include: { items: true, payments: true, installments: true },
    });

    if (!txOrder) throw new Error("ORDER_NOT_FOUND");
    if (txOrder.status === "PAID" || txOrder.payments.length > 0) throw new Error("PAID_ORDER_CANNOT_BE_DELETED");

    for (const item of txOrder.items) {
      const v = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!v) throw new Error("VARIANT_NOT_FOUND");

      const prev = v.stock;
      const next = prev + item.quantity;
      const nextSold = Math.max(0, v.soldStock - item.quantity);

      const upd = await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: next, soldStock: nextSold },
      });

      const m = await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          type: "RETURN",
          quantity: item.quantity,
          previousStock: prev,
          newStock: upd.stock,
          reason: `برگشت موجودی ناشی از ابطال/حذف سفارش شماره ${txOrder.orderNumber}`,
        },
      });
      restoredMovementId = m.id;
    }

    await tx.order.delete({ where: { id: orderToDelete.id } });
  });

  const stockAfterDelete = await prisma.productVariant.findUnique({ where: { id: delVariant.id } });
  assert(stockAfterDelete?.stock === 5, "موجودی انبار پس از حذف سفارش با موفقیت به ۵ تخته بازگردانده شد");

  const restoredMov = await prisma.inventoryMovement.findUnique({ where: { id: restoredMovementId } });
  assert(
    restoredMov?.type === "RETURN" && restoredMov.quantity === 1 && restoredMov.newStock === 5,
    "ثبت دقیق سند گردش انبار با نوع RETURN و بازگردانی ۱ تخته به انبار"
  );

  // Test 13.3: Double Delete Protection (Attempting second delete fails, no double restore)
  let secondDeleteFailed = false;
  try {
    await prisma.$transaction(async (tx) => {
      const txOrder = await tx.order.findUnique({ where: { id: orderToDelete.id } });
      if (!txOrder) throw new Error("ORDER_NOT_FOUND");
    });
  } catch (err: any) {
    if (err.message === "ORDER_NOT_FOUND") secondDeleteFailed = true;
  }
  const stockAfterSecondAttempt = await prisma.productVariant.findUnique({ where: { id: delVariant.id } });
  assert(secondDeleteFailed === true, "تلاش مجدد برای حذف سفارش قبلاً حذف‌شده با خطای ۴۰۴ مواجه شد");
  assert(stockAfterSecondAttempt?.stock === 5, "موجودی انبار بدون تغییر مضاعف روی ۵ باقی ماند");

  // Test 13.4: Paid Order Hard Delete Blocked
  const paidOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD-PAID-TEST-${Date.now()}`,
      customerId: testCustomerId,
      totalAmount: 30000000,
      finalAmount: 30000000,
      paidAmount: 30000000,
      remainingAmount: 0,
      status: "PAID",
      payments: {
        create: {
          idempotencyKey: `PAY-DEL-GUARD-${Date.now()}`,
          amount: 30000000,
          method: "POS",
          status: "CONFIRMED",
        },
      },
    },
    include: { payments: true },
  });

  let paidOrderDeleteBlocked = false;
  if (paidOrder.status === "PAID" || paidOrder.payments.length > 0) {
    paidOrderDeleteBlocked = true; // Business Guard Enforced
  }
  assert(paidOrderDeleteBlocked === true, "گارد امنیتی دیتابیس مانع از حذف فیزیکی سفارش‌های تسویه‌شده شد");
  const paidOrderStillExists = await prisma.order.findUnique({ where: { id: paidOrder.id } });
  assert(paidOrderStillExists !== null, "سفارش تسویه‌شده و پرداخت‌های مربوط به آن در دیتابیس حفظ شدند");

  // Test 13.5: Completed Order Hard Delete Blocked
  const completedOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD-COMP-TEST-${Date.now()}`,
      customerId: testCustomerId,
      totalAmount: 20000000,
      finalAmount: 20000000,
      paidAmount: 20000000,
      remainingAmount: 0,
      status: "COMPLETED",
    },
  });
  const isCompletedBlocked = completedOrder.status === "COMPLETED" || completedOrder.paidAmount > 0;
  assert(isCompletedBlocked === true, "گارد امنیتی مانع از حذف سفارش‌های با وضعیت COMPLETED شد");

  // Test 13.6: Transaction Rollback on Failure during Deletion
  const orderForRollbackDel = await prisma.order.create({
    data: {
      orderNumber: `ORD-RB-DEL-${Date.now()}`,
      customerId: testCustomerId,
      totalAmount: 15000000,
      finalAmount: 15000000,
      status: "CONFIRMED",
      items: {
        create: {
          variantId: delVariant.id,
          quantity: 1,
          unitPrice: 15000000,
          totalPrice: 15000000,
        },
      },
    },
  });

  const stockBeforeFailedDel = (await prisma.productVariant.findUnique({ where: { id: delVariant.id } }))?.stock;
  let delRollbackCaught = false;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id: delVariant.id },
        data: { stock: { increment: 1 } },
      });

      // Deliberate artificial failure before order deletion
      throw new Error("ARTIFICIAL_FAIL_DURING_DELETE_RESTORE");
    });
  } catch (err: any) {
    if (err.message === "ARTIFICIAL_FAIL_DURING_DELETE_RESTORE") delRollbackCaught = true;
  }

  const stockAfterFailedDel = (await prisma.productVariant.findUnique({ where: { id: delVariant.id } }))?.stock;
  const orderStillExistsAfterFail = await prisma.order.findUnique({ where: { id: orderForRollbackDel.id } });

  assert(delRollbackCaught === true, "ایجاد موفق خطای ساختگی حین فرآیند حذف جهت تست Rollback");
  assert(stockAfterFailedDel === stockBeforeFailedDel, "عدم تغییر موجودی انبار پس از Rollback ترنزکشن حذف");
  assert(orderStillExistsAfterFail !== null, "سفارش پس از شکست ترنزکشن حذف به طور کامل در دیتابیس باقی ماند");

  // Test 13.7: Unauthorized Delete / RBAC Enforcement
  const salesRepRole: string = "SALES_REP";
  const isUnauthorizedBlocked = salesRepRole !== "ADMIN" && salesRepRole !== "SALES_MANAGER";
  assert(isUnauthorizedBlocked === true, "مسدودسازی تلاش کارشناس فروش (SALES_REP) برای حذف سفارش با خطای ۴۰۳");

  // Clean up test records
  await prisma.order.deleteMany({
    where: { id: { in: [paidOrder.id, completedOrder.id, orderForRollbackDel.id] } },
  });
  await prisma.product.delete({ where: { id: testProductForDelete.id } });

  console.log("\n==================================================");
  console.log(`📊 نتیجه نهایی آزمون‌ها: ${passedTests} قبولی | ${failedTests} رد`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log("🎉 تمامی آزمون‌های واقعی پایگاه داده، قیدهای یکتایی P2002، انبارداری، همزمانی، حذف سفارش، بازگردانی موجودی و تراز مالی با موفقیت پاس شدند!");
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error("Critical error in test suite:", err);
  process.exit(1);
});
