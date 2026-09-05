"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { rmSync, writeFileSync } = require("node:fs");
const { basename, dirname, join, resolve } = require("node:path");
const { PrismaClient: PostgresClient } = require("@prisma/client");
const {
  PrismaClient: SqliteClient,
} = require("../prisma/generated/sqlite-source-client");
const {
  databaseUrlForPublicSchema,
  databaseUrlForRuntimeTest,
  loadBaseDatabaseUrl,
  verifyDisposableTarget,
  prismaCli,
  projectRoot,
  requireSuccessfulResult,
  resetDisposablePublicSchemaWithRetry,
  runNodeCli,
} = require("./postgresql-test-utils.cjs");

const sourcePrefix = "phase5-transfer-source-";
const transferTool = join(projectRoot, "scripts", "migrate-sqlite-to-postgres.cjs");
const previousMigrations = [
  "20260831000000_init",
  "20260903000000_add_product_variant_is_active",
  "20260903010000_auth_hardening",
];

function createSource(label) {
  const fileName = `${sourcePrefix}${label}-${randomUUID()}.db`;
  const path = join(projectRoot, "prisma", fileName);
  const url = `file:${path.replaceAll("\\", "/")}`;
  writeFileSync(path, "", { flag: "wx" });

  for (const migrationName of previousMigrations) {
    const result = runNodeCli(
      prismaCli,
      [
        "db",
        "execute",
        "--url",
        url,
        "--file",
        `prisma/migrations/${migrationName}/migration.sql`,
      ],
      { ...process.env, NODE_ENV: "test" },
      false,
      true,
    );
    requireSuccessfulResult(result, `SQLite source migration ${migrationName}`);
  }

  return { path, url };
}

function removeSource(source) {
  const prismaDirectory = resolve(projectRoot, "prisma");
  if (
    resolve(dirname(source.path)) !== prismaDirectory ||
    !basename(source.path).startsWith(sourcePrefix)
  ) {
    throw new Error("Refusing to remove an unexpected SQLite source path");
  }
  rmSync(source.path, { force: true });
  rmSync(`${source.path}-journal`, { force: true });
  rmSync(`${source.path}-wal`, { force: true });
  rmSync(`${source.path}-shm`, { force: true });
}

async function insertFixture(source, options = {}) {
  const createdAt = new Date("2025-01-02T03:04:05.678Z");
  const updatedAt = new Date("2025-06-07T08:09:10.111Z");
  const client = new SqliteClient({ datasourceUrl: source.url });
  try {
    await client.user.create({
      data: {
        id: "transfer-user",
        name: "کاربر انتقال",
        email: "transfer@example.invalid",
        phone: "09120000001",
        passwordHash: "$2a$12$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuu",
        sessionVersion: 9,
        role: "SALES_REP",
        createdAt,
        updatedAt,
      },
    });
    await client.customer.create({
      data: {
        id: "transfer-customer",
        code: "C-TRANSFER",
        firstName: "زهرا",
        lastName: "محمدی",
        phone: "09121111112",
        province: "اصفهان",
        city: "کاشان",
        notes: options.nulCustomerNote ? "invalid\u0000postgres" : "مشتری قدیمی",
        assignedToId: "transfer-user",
        createdAt,
        updatedAt,
      },
    });
    await client.carpetNeedProfile.create({
      data: {
        id: "transfer-profile",
        preferredSizes: '["3x4","2x3"]',
        preferredColors: '["سرمه‌ای","کرم"]',
        budgetMin: 100_000_000,
        budgetMax: 700_000_000,
        quantity: 2,
        paymentPreference: "INSTALLMENT",
        customerId: "transfer-customer",
        createdAt,
        updatedAt,
      },
    });
    await client.product.create({
      data: {
        id: "transfer-product",
        code: "P-TRANSFER",
        name: "فرش انتقالی",
        pattern: "افشان",
        collection: "کاشان",
        shane: 1200,
        density: 3600,
        yarnMaterial: "اکریلیک",
        weavingMachine: "وندویل",
        style: "کلاسیک",
        primaryColor: "سرمه‌ای",
        images: options.invalidJson ? "not-json" : '["/images/legacy.webp"]',
        createdAt,
        updatedAt,
      },
    });
    await client.productVariant.create({
      data: {
        id: "transfer-variant",
        productId: "transfer-product",
        sku: "SKU-TRANSFER",
        size: "3x4",
        areaSquareMeters: 12,
        cashPrice: 300_000_000,
        installmentPrice: 360_000_000,
        stock: 8,
        reservedStock: 1,
        soldStock: 3,
        createdAt,
        updatedAt,
      },
    });
    await client.inventoryMovement.create({
      data: {
        id: "transfer-movement",
        variantId: "transfer-variant",
        type: "SALE",
        quantity: 2,
        previousStock: 10,
        newStock: 8,
        reason: "فروش قدیمی",
        userId: "transfer-user",
        createdAt,
      },
    });
    await client.order.create({
      data: {
        id: "transfer-order",
        orderNumber: "ORD-TRANSFER",
        totalAmount: 600_000_000,
        discountAmount: 20_000_000,
        finalAmount: 580_000_000,
        paymentMethod: "INSTALLMENT",
        paidAmount: 180_000_000,
        remainingAmount: 400_000_000,
        customerId: "transfer-customer",
        sellerId: "transfer-user",
        createdAt,
        updatedAt,
      },
    });
    await client.orderItem.create({
      data: {
        id: "transfer-item",
        orderId: "transfer-order",
        variantId: "transfer-variant",
        quantity: 2,
        unitPrice: 300_000_000,
        totalPrice: 600_000_000,
      },
    });
    await client.payment.create({
      data: {
        id: "transfer-payment",
        idempotencyKey: "transfer-payment-key",
        orderId: "transfer-order",
        amount: 180_000_000,
        method: "POS",
        paidAt: createdAt,
        createdAt,
      },
    });
    await client.installment.create({
      data: {
        id: "transfer-installment",
        orderId: "transfer-order",
        installmentNumber: 1,
        amount: 400_000_000,
        dueDate: updatedAt,
        createdAt,
        updatedAt,
      },
    });
    await client.automationRule.create({
      data: {
        id: "transfer-rule",
        name: "قانون انتقال",
        triggerType: "HOT_LEAD",
        conditions: '{"scoreMin":60}',
        actions: '{"notify":true}',
        createdAt,
        updatedAt,
      },
    });
    await client.auditLog.create({
      data: {
        id: "transfer-audit",
        userId: "transfer-user",
        action: "CREATE",
        entity: "Order",
        entityId: "transfer-order",
        details: '{"amount":580000000,"note":"فارسی"}',
        createdAt,
      },
    });
  } finally {
    await client.$disconnect();
  }
}

function runTransfer(source, runtimeUrl, directUrl, expectSuccess) {
  const result = spawnSync(process.execPath, [transferTool, "--apply"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: "test",
      SQLITE_DATABASE_URL: source.url,
      DATABASE_URL: runtimeUrl,
      DIRECT_URL: directUrl,
    },
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (expectSuccess && result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "SQLite to PostgreSQL transfer failed");
  }
  if (!expectSuccess && result.status === 0) {
    throw new Error("SQLite to PostgreSQL transfer unexpectedly succeeded");
  }
  return `${result.stderr}\n${result.stdout}`;
}

function setupDestination(baseUrl) {
  const migrationUrl = databaseUrlForPublicSchema(baseUrl);
  const result = runNodeCli(
    prismaCli,
    [
      "db",
      "execute",
      "--schema",
      "prisma/postgresql/schema.prisma",
      "--file",
      "prisma/postgresql/migrations/20260904000000_postgresql_init/migration.sql",
    ],
    { ...process.env, NODE_ENV: "test", DATABASE_URL: migrationUrl },
    false,
    true,
  );
  requireSuccessfulResult(result, "Disposable PostgreSQL transfer destination setup");
}

async function assertDestinationEmpty(client) {
  for (const model of [
    "user",
    "customer",
    "carpetNeedProfile",
    "product",
    "productVariant",
    "inventoryMovement",
    "order",
    "orderItem",
    "payment",
    "installment",
    "automationRule",
    "auditLog",
  ]) {
    assert.equal(await client[model].count(), 0, `${model} must remain empty`);
  }
}

async function main() {
  const baseUrl = loadBaseDatabaseUrl();
  const runtimeUrl = databaseUrlForRuntimeTest(baseUrl);
  if (!process.env.POSTGRES_TEST_DIRECT_URL) throw new Error("POSTGRES_TEST_DIRECT_URL is required");
  const directUrl = new URL(process.env.POSTGRES_TEST_DIRECT_URL);
  const transferUrl = databaseUrlForPublicSchema(directUrl.toString());
  await verifyDisposableTarget(transferUrl);
  const sources = [];

  try {
    const validSource = createSource("valid");
    sources.push(validSource);
    await insertFixture(validSource);

    await resetDisposablePublicSchemaWithRetry(baseUrl);
    setupDestination(baseUrl);
    runTransfer(validSource, runtimeUrl, transferUrl, true);
    let destination = new PostgresClient({ datasourceUrl: runtimeUrl });
    try {
      const order = await destination.order.findUniqueOrThrow({
        where: { id: "transfer-order" },
        include: { customer: true, items: true, payments: true, installments: true },
      });
      const user = await destination.user.findUniqueOrThrow({ where: { id: "transfer-user" } });
      const profile = await destination.carpetNeedProfile.findUniqueOrThrow({
        where: { id: "transfer-profile" },
      });
      const product = await destination.product.findUniqueOrThrow({
        where: { id: "transfer-product" },
        include: { variants: { include: { inventoryLogs: true } } },
      });
      const rule = await destination.automationRule.findUniqueOrThrow({
        where: { id: "transfer-rule" },
      });
      const audit = await destination.auditLog.findUniqueOrThrow({
        where: { id: "transfer-audit" },
      });

      assert.equal(user.sessionVersion, 9);
      assert.match(user.passwordHash, /^\$2a\$12\$/);
      assert.equal(user.createdAt.toISOString(), "2025-01-02T03:04:05.678Z");
      assert.deepEqual(profile.preferredSizes, ["3x4", "2x3"]);
      assert.deepEqual(profile.preferredColors, ["سرمه‌ای", "کرم"]);
      assert.deepEqual(product.images, ["/images/legacy.webp"]);
      assert.deepEqual(rule.conditions, { scoreMin: 60 });
      assert.deepEqual(rule.actions, { notify: true });
      assert.deepEqual(audit.details, { amount: 580_000_000, note: "فارسی" });
      assert.equal(order.customer.id, "transfer-customer");
      assert.equal(order.items[0].variantId, "transfer-variant");
      assert.equal(order.payments[0].amount, 180_000_000);
      assert.equal(order.installments[0].amount, 400_000_000);
      assert.equal(order.finalAmount, 580_000_000);
      assert.equal(order.remainingAmount, 400_000_000);
      assert.equal(product.variants[0].stock, 8);
      assert.equal(product.variants[0].reservedStock, 1);
      assert.equal(product.variants[0].inventoryLogs[0].newStock, 8);
    } finally {
      await destination.$disconnect();
    }

    await resetDisposablePublicSchemaWithRetry(baseUrl);
    setupDestination(baseUrl);
    destination = new PostgresClient({ datasourceUrl: runtimeUrl });
    try {
      await destination.user.create({
        data: {
          id: "destination-sentinel",
          name: "sentinel",
          email: "sentinel@example.invalid",
          phone: "09000000000",
          passwordHash: "sentinel",
          updatedAt: new Date(),
        },
      });
    } finally {
      await destination.$disconnect();
    }
    const nonEmptyOutput = runTransfer(validSource, runtimeUrl, transferUrl, false);
    assert.match(nonEmptyOutput, /not empty; refusing to overwrite data/i);
    destination = new PostgresClient({ datasourceUrl: runtimeUrl });
    try {
      assert.equal(await destination.user.count(), 1);
      assert.equal(await destination.user.findUnique({ where: { id: "transfer-user" } }), null);
    } finally {
      await destination.$disconnect();
    }

    const atomicSource = createSource("atomic");
    sources.push(atomicSource);
    await insertFixture(atomicSource, { nulCustomerNote: true });
    await resetDisposablePublicSchemaWithRetry(baseUrl);
    setupDestination(baseUrl);
    const atomicOutput = runTransfer(atomicSource, runtimeUrl, transferUrl, false);
    assert.match(atomicOutput, /null|0x00|invalid byte sequence|unsupported/i);
    destination = new PostgresClient({ datasourceUrl: runtimeUrl });
    try {
      await assertDestinationEmpty(destination);
    } finally {
      await destination.$disconnect();
    }

    const invalidJsonSource = createSource("invalid_json");
    sources.push(invalidJsonSource);
    await insertFixture(invalidJsonSource, { invalidJson: true });
    await resetDisposablePublicSchemaWithRetry(baseUrl);
    setupDestination(baseUrl);
    const invalidJsonOutput = runTransfer(
      invalidJsonSource,
      runtimeUrl,
      transferUrl,
      false,
    );
    assert.match(invalidJsonOutput, /contains invalid JSON/i);
    destination = new PostgresClient({ datasourceUrl: runtimeUrl });
    try {
      await assertDestinationEmpty(destination);
    } finally {
      await destination.$disconnect();
    }

    console.log(
      "SQLite -> PostgreSQL transfer: apply, non-empty guard, atomic rollback, and invalid JSON passed",
    );
  } finally {
    await resetDisposablePublicSchemaWithRetry(baseUrl);
    for (const source of sources) removeSource(source);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
