"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { copyFileSync, mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { basename, dirname, join, resolve } = require("node:path");
const { PrismaClient: TargetClient } = require("@prisma/client");
const {
  PrismaClient: LegacyClient,
} = require("../prisma/generated/sqlite-source-client");

const DATABASE_PREFIX = "phase5-migration-test-";
const PROJECT_PREFIX = "phase5-migration-project-";
const projectRoot = resolve(__dirname, "..");
const prismaDirectory = join(projectRoot, "prisma");
const prismaCli = join(projectRoot, "node_modules", "prisma", "build", "index.js");
const jsonMigration = join(
  projectRoot,
  "prisma",
  "migrations",
  "20260904000000_json_fields",
  "migration.sql",
);
const dataMigrationTool = join(projectRoot, "scripts", "migrate-sqlite-to-postgres.cjs");
const previousMigrations = [
  "20260831000000_init",
  "20260903000000_add_product_variant_is_active",
  "20260903010000_auth_hardening",
];

function createDatabaseTarget(label) {
  const uniqueId = randomUUID();
  const fileName = `${DATABASE_PREFIX}${label}-${uniqueId}.db`;
  const path = join(prismaDirectory, fileName);
  const url = `file:${path.replaceAll("\\", "/")}`;
  const migrationProject = join(prismaDirectory, `${PROJECT_PREFIX}${label}-${uniqueId}`);
  const migrationsDirectory = join(migrationProject, "migrations");
  const schemaPath = join(migrationProject, "schema.prisma");

  writeFileSync(path, "", { flag: "wx" });
  mkdirSync(migrationsDirectory, { recursive: true });
  copyFileSync(join(prismaDirectory, "schema.prisma"), schemaPath);
  copyFileSync(
    join(prismaDirectory, "migrations", "migration_lock.toml"),
    join(migrationsDirectory, "migration_lock.toml"),
  );
  for (const migrationName of previousMigrations) {
    const targetDirectory = join(migrationsDirectory, migrationName);
    mkdirSync(targetDirectory);
    copyFileSync(
      join(prismaDirectory, "migrations", migrationName, "migration.sql"),
      join(targetDirectory, "migration.sql"),
    );
  }

  return { path, url, migrationProject, migrationsDirectory, schemaPath };
}

function removeDatabase(database) {
  if (
    resolve(dirname(database.path)) !== resolve(prismaDirectory) ||
    !basename(database.path).startsWith(DATABASE_PREFIX) ||
    resolve(dirname(database.migrationProject)) !== resolve(prismaDirectory) ||
    !basename(database.migrationProject).startsWith(PROJECT_PREFIX)
  ) {
    throw new Error("Refusing to remove an unexpected migration-test path");
  }

  rmSync(database.path, { force: true });
  rmSync(`${database.path}-journal`, { force: true });
  rmSync(`${database.path}-wal`, { force: true });
  rmSync(`${database.path}-shm`, { force: true });
  rmSync(database.migrationProject, { force: true, recursive: true });
}

function migrateDeploy(database, expectSuccess = true) {
  const result = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "deploy", "--schema", database.schemaPath],
    {
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: "test", DATABASE_URL: database.url },
      encoding: "utf8",
    },
  );

  if (result.error) throw result.error;
  if (expectSuccess && result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Prisma migrate deploy failed");
  }
  if (!expectSuccess && result.status === 0) {
    throw new Error("Malformed legacy JSON unexpectedly passed the migration guard");
  }

  return result;
}

function runDataMigrationPreflight(database, expectSuccess = true) {
  const result = spawnSync(process.execPath, [dataMigrationTool, "--check"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: "test",
      SQLITE_DATABASE_URL: database.url,
    },
    encoding: "utf8",
  });

  if (result.error) throw result.error;
  if (expectSuccess && result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Data-migration preflight failed");
  }
  if (!expectSuccess && result.status === 0) {
    throw new Error("Data-migration preflight accepted malformed JSON");
  }

  return result;
}

function addJsonMigration(database) {
  const targetDirectory = join(database.migrationsDirectory, "20260904000000_json_fields");
  mkdirSync(targetDirectory);
  copyFileSync(jsonMigration, join(targetDirectory, "migration.sql"));
}

function comparableRecord(record) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ]),
  );
}

async function insertRepresentativeLegacyData(client) {
  const createdAt = new Date("2025-01-02T03:04:05.678Z");
  const updatedAt = new Date("2025-06-07T08:09:10.111Z");
  const paidAt = new Date("2025-02-03T04:05:06.789Z");

  await client.user.create({
    data: {
      id: "legacy-user",
      name: "فروشنده قدیمی",
      email: "legacy@example.invalid",
      phone: "09120000000",
      passwordHash: "$2a$12$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuu",
      sessionVersion: 7,
      role: "SALES_REP",
      isActive: true,
      createdAt,
      updatedAt,
    },
  });
  await client.customer.create({
    data: {
      id: "legacy-customer",
      code: "C-LEGACY-1",
      firstName: "مریم",
      lastName: "احمدی",
      phone: "09121111111",
      province: "اصفهان",
      city: "کاشان",
      assignedToId: "legacy-user",
      createdAt,
      updatedAt,
    },
  });
  await client.lead.create({
    data: {
      id: "legacy-lead",
      firstName: "علی",
      lastName: "رضایی",
      phone: "09122222222",
      province: "تهران",
      city: "تهران",
      score: 63,
      estimatedBudget: 987_654_321,
      assignedToId: "legacy-user",
      createdAt,
      updatedAt,
      lastActivityAt: paidAt,
    },
  });
  await client.carpetNeedProfile.createMany({
    data: [
      {
        id: "legacy-profile-customer",
        preferredSizes: '["3x4","2.5x3.5"]',
        preferredColors: ' [ "سرمه‌ای", "کرم" ] ',
        budgetMin: 120_000_000,
        budgetMax: 420_000_000,
        quantity: 2,
        paymentPreference: "HYBRID",
        customerId: "legacy-customer",
        createdAt,
        updatedAt,
      },
      {
        id: "legacy-profile-lead",
        preferredSizes: "[]",
        preferredColors: '["لاکی"]',
        quantity: 1,
        paymentPreference: "CASH",
        leadId: "legacy-lead",
        createdAt,
        updatedAt,
      },
    ],
  });
  await client.product.create({
    data: {
      id: "legacy-product",
      code: "P-LEGACY-1",
      name: "فرش افشان",
      pattern: "افشان",
      collection: "کاشان",
      shane: 1200,
      density: 3600,
      yarnMaterial: "اکریلیک",
      weavingMachine: "وندویل",
      style: "کلاسیک",
      primaryColor: "سرمه‌ای",
      images: "[]",
      createdAt,
      updatedAt,
    },
  });
  await client.productVariant.create({
    data: {
      id: "legacy-variant",
      productId: "legacy-product",
      sku: "SKU-LEGACY-1",
      size: "3x4",
      areaSquareMeters: 12,
      cashPrice: 345_678_901,
      installmentPrice: 399_999_999,
      stock: 11,
      reservedStock: 2,
      soldStock: 5,
      createdAt,
      updatedAt,
    },
  });
  await client.inventoryMovement.create({
    data: {
      id: "legacy-inventory",
      variantId: "legacy-variant",
      type: "SALE",
      quantity: -2,
      previousStock: 13,
      newStock: 11,
      reason: "سفارش قدیمی",
      userId: "legacy-user",
      createdAt: paidAt,
    },
  });
  await client.order.create({
    data: {
      id: "legacy-order",
      orderNumber: "ORD-LEGACY-1",
      totalAmount: 691_357_802,
      discountAmount: 11_357_802,
      taxAmount: 0,
      finalAmount: 680_000_000,
      paymentMethod: "INSTALLMENT",
      paidAmount: 180_000_000,
      remainingAmount: 500_000_000,
      customerId: "legacy-customer",
      sellerId: "legacy-user",
      createdAt,
      updatedAt,
    },
  });
  await client.orderItem.create({
    data: {
      id: "legacy-order-item",
      orderId: "legacy-order",
      variantId: "legacy-variant",
      quantity: 2,
      unitPrice: 345_678_901,
      totalPrice: 691_357_802,
    },
  });
  await client.payment.create({
    data: {
      id: "legacy-payment",
      idempotencyKey: "legacy-payment-key",
      orderId: "legacy-order",
      amount: 180_000_000,
      method: "POS",
      paidAt,
      createdAt: paidAt,
    },
  });
  await client.installment.create({
    data: {
      id: "legacy-installment",
      orderId: "legacy-order",
      installmentNumber: 1,
      amount: 500_000_000,
      dueDate: new Date("2025-08-09T10:11:12.345Z"),
      createdAt,
      updatedAt,
    },
  });
  await client.automationRule.create({
    data: {
      id: "legacy-rule",
      name: "قانون نمونه",
      triggerType: "HOT_LEAD",
      conditions: '{"scoreMin":55,"nested":{"enabled":true}}',
      actions: ' { "notify": true, "channels": ["dashboard"] } ',
      createdAt,
      updatedAt,
    },
  });
  await client.auditLog.createMany({
    data: [
      {
        id: "legacy-audit-details",
        userId: "legacy-user",
        action: "CREATE",
        entity: "Order",
        entityId: "legacy-order",
        details: '{"amount":680000000,"note":"متن فارسی"}',
        createdAt: paidAt,
      },
      {
        id: "legacy-audit-null",
        userId: "legacy-user",
        action: "LOGIN",
        entity: "User",
        entityId: "legacy-user",
        details: null,
        createdAt,
      },
    ],
  });
}

async function verifySuccessfulMigration(databaseUrl) {
  const target = new TargetClient({ datasourceUrl: databaseUrl });
  try {
    const [user, profiles, product, rule, audits, order, movement] = await Promise.all([
      target.user.findUniqueOrThrow({ where: { id: "legacy-user" } }),
      target.carpetNeedProfile.findMany({ orderBy: { id: "asc" } }),
      target.product.findUniqueOrThrow({
        where: { id: "legacy-product" },
        include: { variants: { include: { inventoryLogs: true } } },
      }),
      target.automationRule.findUniqueOrThrow({ where: { id: "legacy-rule" } }),
      target.auditLog.findMany({ orderBy: { id: "asc" } }),
      target.order.findUniqueOrThrow({
        where: { id: "legacy-order" },
        include: { customer: true, items: true, payments: true, installments: true },
      }),
      target.inventoryMovement.findUniqueOrThrow({ where: { id: "legacy-inventory" } }),
    ]);

    assert.equal(user.sessionVersion, 7);
    assert.equal(user.passwordHash, "$2a$12$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuu");
    assert.deepEqual(profiles[0].preferredColors, ["سرمه‌ای", "کرم"]);
    assert.deepEqual(profiles[0].preferredSizes, ["3x4", "2.5x3.5"]);
    assert.deepEqual(profiles[1].preferredColors, ["لاکی"]);
    assert.deepEqual(profiles[1].preferredSizes, []);
    assert.deepEqual(product.images, []);
    assert.deepEqual(rule.conditions, { scoreMin: 55, nested: { enabled: true } });
    assert.deepEqual(rule.actions, { notify: true, channels: ["dashboard"] });
    assert.deepEqual(audits[0].details, { amount: 680_000_000, note: "متن فارسی" });
    assert.equal(audits[1].details, null);

    assert.equal(order.customer.id, "legacy-customer");
    assert.equal(order.items[0].variantId, "legacy-variant");
    assert.equal(order.payments[0].id, "legacy-payment");
    assert.equal(order.installments[0].id, "legacy-installment");
    assert.equal(product.variants[0].inventoryLogs[0].id, "legacy-inventory");

    assert.deepEqual(
      comparableRecord({
        id: order.id,
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount,
        finalAmount: order.finalAmount,
        paidAmount: order.paidAmount,
        remainingAmount: order.remainingAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }),
      {
        id: "legacy-order",
        totalAmount: 691_357_802,
        discountAmount: 11_357_802,
        finalAmount: 680_000_000,
        paidAmount: 180_000_000,
        remainingAmount: 500_000_000,
        createdAt: "2025-01-02T03:04:05.678Z",
        updatedAt: "2025-06-07T08:09:10.111Z",
      },
    );
    assert.deepEqual(
      comparableRecord(movement),
      {
        id: "legacy-inventory",
        variantId: "legacy-variant",
        type: "SALE",
        quantity: -2,
        previousStock: 13,
        newStock: 11,
        reason: "سفارش قدیمی",
        userId: "legacy-user",
        createdAt: "2025-02-03T04:05:06.789Z",
      },
    );

    const expectedIds = [
      ["User", "legacy-user"],
      ["Customer", "legacy-customer"],
      ["Lead", "legacy-lead"],
      ["Product", "legacy-product"],
      ["ProductVariant", "legacy-variant"],
      ["InventoryMovement", "legacy-inventory"],
      ["Order", "legacy-order"],
      ["OrderItem", "legacy-order-item"],
      ["Payment", "legacy-payment"],
      ["Installment", "legacy-installment"],
      ["AutomationRule", "legacy-rule"],
    ];
    for (const [table, id] of expectedIds) {
      const rows = await target.$queryRawUnsafe(`SELECT "id" FROM "${table}" WHERE "id" = ?`, id);
      assert.equal(rows.length, 1, `${table} primary key was not preserved`);
    }

    const jsonColumns = await target.$queryRawUnsafe('PRAGMA table_info("Product")');
    assert.equal(jsonColumns.find((column) => column.name === "images")?.type, "JSONB");
    const migrationHistory = await target.$queryRawUnsafe(
      'SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations" ORDER BY "migration_name"',
    );
    assert.equal(migrationHistory.length, 4);
    assert.ok(migrationHistory.every((migration) => migration.finished_at !== null));
    assert.ok(migrationHistory.every((migration) => migration.rolled_back_at === null));
  } finally {
    await target.$disconnect();
  }
}

async function runValidScenario() {
  const database = createDatabaseTarget("valid");
  try {
    migrateDeploy(database);
    const legacy = new LegacyClient({ datasourceUrl: database.url });
    try {
      await insertRepresentativeLegacyData(legacy);
    } finally {
      await legacy.$disconnect();
    }
    runDataMigrationPreflight(database);
    addJsonMigration(database);
    migrateDeploy(database);
    await verifySuccessfulMigration(database.url);
  } finally {
    removeDatabase(database);
  }
}

async function runMalformedScenario() {
  const database = createDatabaseTarget("malformed");
  try {
    migrateDeploy(database);
    let legacy = new LegacyClient({ datasourceUrl: database.url });
    try {
      await legacy.product.create({
        data: {
          id: "malformed-product",
          code: "P-MALFORMED",
          name: "داده خراب",
          pattern: "افشان",
          collection: "کاشان",
          shane: 700,
          density: 2550,
          yarnMaterial: "اکریلیک",
          weavingMachine: "وندویل",
          style: "کلاسیک",
          primaryColor: "کرم",
          images: "not-json",
        },
      });
    } finally {
      await legacy.$disconnect();
    }

    const preflightResult = runDataMigrationPreflight(database, false);
    assert.match(`${preflightResult.stderr}\n${preflightResult.stdout}`, /invalid JSON/i);

    addJsonMigration(database);
    const result = migrateDeploy(database, false);
    assert.match(`${result.stderr}\n${result.stdout}`, /constraint|phase5_json_guard/i);

    legacy = new LegacyClient({ datasourceUrl: database.url });
    try {
      const sourceRecord = await legacy.product.findUniqueOrThrow({
        where: { id: "malformed-product" },
      });
      assert.equal(sourceRecord.images, "not-json");
      const replacementTables = await legacy.$queryRawUnsafe(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'new_%'",
      );
      assert.deepEqual(replacementTables, []);
    } finally {
      await legacy.$disconnect();
    }
  } finally {
    removeDatabase(database);
  }
}

async function main() {
  await runValidScenario();
  await runMalformedScenario();
  console.log("Populated SQLite JSON migration: 2/2 scenarios passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
