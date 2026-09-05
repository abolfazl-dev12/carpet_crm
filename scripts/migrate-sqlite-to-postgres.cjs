"use strict";

const { existsSync } = require("node:fs");
const { isAbsolute, resolve } = require("node:path");
const { PrismaClient: PostgresClient } = require("@prisma/client");
const {
  PrismaClient: SqliteClient,
} = require("../prisma/generated/sqlite-source-client");

const projectRoot = resolve(__dirname, "..");
const sqliteSchemaDirectory = resolve(projectRoot, "prisma", "sqlite-source");
const mode = process.argv[2] || "--check";

if (mode !== "--check" && mode !== "--apply") {
  throw new Error("Usage: node scripts/migrate-sqlite-to-postgres.cjs [--check|--apply]");
}

function requireEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parsePostgresUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL connection URI.`);
  }
  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) {
    throw new Error(`${label} must be a PostgreSQL connection URI.`);
  }
  return parsed;
}

function resolveDestinationUrl() {
  const runtimeUrl = requireEnvironment("DATABASE_URL");
  const runtime = parsePostgresUrl(runtimeUrl, "DATABASE_URL");
  const directUrl = process.env.DIRECT_URL?.trim();

  if (runtime.hostname.toLowerCase() === "pooled.db.prisma.io" && !directUrl) {
    throw new Error(
      "DIRECT_URL is required for SQLite transfer when DATABASE_URL uses Prisma Postgres pooling."
    );
  }

  const destinationUrl = directUrl || runtimeUrl;
  const destination = parsePostgresUrl(
    destinationUrl,
    directUrl ? "DIRECT_URL" : "DATABASE_URL"
  );
  if (destination.hostname.toLowerCase() === "pooled.db.prisma.io") {
    throw new Error("SQLite transfer requires a direct, non-pooled PostgreSQL connection.");
  }
  return destinationUrl;
}

function assertSourceFileExists(sourceUrl) {
  if (!sourceUrl.startsWith("file:")) {
    throw new Error("SQLITE_DATABASE_URL must use Prisma's file: URL format.");
  }

  const rawPath = decodeURIComponent(sourceUrl.slice("file:".length).split("?", 1)[0]);
  const sourcePath = isAbsolute(rawPath)
    ? rawPath
    : resolve(sqliteSchemaDirectory, rawPath);

  if (!existsSync(sourcePath)) {
    throw new Error("The SQLite source file does not exist; refusing to create a new empty file.");
  }
}

function parseStoredJson(value, label) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} contains invalid JSON.`);
  }
}

function assertStringArray(value, label) {
  const parsed = parseStoredJson(value, label);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings.`);
  }
}

function assertJsonObject(value, label) {
  const parsed = parseStoredJson(value, label);
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`${label} must be a JSON object.`);
  }
}

async function validateJsonColumns(source) {
  const needProfiles = await source.$queryRawUnsafe(
    'SELECT "id", "preferredSizes", "preferredColors" FROM "CarpetNeedProfile"'
  );
  for (const row of needProfiles) {
    assertStringArray(row.preferredSizes, `CarpetNeedProfile(${row.id}).preferredSizes`);
    assertStringArray(row.preferredColors, `CarpetNeedProfile(${row.id}).preferredColors`);
  }

  const products = await source.$queryRawUnsafe('SELECT "id", "images" FROM "Product"');
  for (const row of products) {
    assertStringArray(row.images, `Product(${row.id}).images`);
  }

  const rules = await source.$queryRawUnsafe(
    'SELECT "id", "conditions", "actions" FROM "AutomationRule"'
  );
  for (const row of rules) {
    assertJsonObject(row.conditions, `AutomationRule(${row.id}).conditions`);
    assertJsonObject(row.actions, `AutomationRule(${row.id}).actions`);
  }

  const auditLogs = await source.$queryRawUnsafe(
    'SELECT "id", "details" FROM "AuditLog" WHERE "details" IS NOT NULL'
  );
  for (const row of auditLogs) {
    assertJsonObject(row.details, `AuditLog(${row.id}).details`);
  }
}

async function readSnapshot(source) {
  const [
    users,
    customers,
    leads,
    needProfiles,
    products,
    variants,
    inventoryMovements,
    deals,
    followUps,
    orders,
    orderItems,
    payments,
    installments,
    notifications,
    automationRules,
    auditLogs,
    authRateLimits,
  ] = await Promise.all([
    source.user.findMany(),
    source.customer.findMany(),
    source.lead.findMany(),
    source.carpetNeedProfile.findMany(),
    source.product.findMany(),
    source.productVariant.findMany(),
    source.inventoryMovement.findMany(),
    source.deal.findMany(),
    source.followUp.findMany(),
    source.order.findMany(),
    source.orderItem.findMany(),
    source.payment.findMany(),
    source.installment.findMany(),
    source.notification.findMany(),
    source.automationRule.findMany(),
    source.auditLog.findMany(),
    source.authRateLimit.findMany(),
  ]);

  return {
    users,
    customers,
    leads,
    needProfiles: needProfiles.map((row) => ({
      ...row,
      preferredSizes: parseStoredJson(
        row.preferredSizes,
        `CarpetNeedProfile(${row.id}).preferredSizes`
      ),
      preferredColors: parseStoredJson(
        row.preferredColors,
        `CarpetNeedProfile(${row.id}).preferredColors`
      ),
    })),
    products: products.map((row) => ({
      ...row,
      images: parseStoredJson(row.images, `Product(${row.id}).images`),
    })),
    variants,
    inventoryMovements,
    deals,
    followUps,
    orders,
    orderItems,
    payments,
    installments,
    notifications,
    automationRules: automationRules.map((row) => ({
      ...row,
      conditions: parseStoredJson(
        row.conditions,
        `AutomationRule(${row.id}).conditions`
      ),
      actions: parseStoredJson(row.actions, `AutomationRule(${row.id}).actions`),
    })),
    auditLogs: auditLogs.map((row) => ({
      ...row,
      details:
        row.details === null
          ? null
          : parseStoredJson(row.details, `AuditLog(${row.id}).details`),
    })),
    authRateLimits,
  };
}

const destinationModels = [
  ["User", "user", "users", "id"],
  ["Customer", "customer", "customers", "id"],
  ["Lead", "lead", "leads", "id"],
  ["CarpetNeedProfile", "carpetNeedProfile", "needProfiles", "id"],
  ["Product", "product", "products", "id"],
  ["ProductVariant", "productVariant", "variants", "id"],
  ["InventoryMovement", "inventoryMovement", "inventoryMovements", "id"],
  ["Deal", "deal", "deals", "id"],
  ["FollowUp", "followUp", "followUps", "id"],
  ["Order", "order", "orders", "id"],
  ["OrderItem", "orderItem", "orderItems", "id"],
  ["Payment", "payment", "payments", "id"],
  ["Installment", "installment", "installments", "id"],
  ["Notification", "notification", "notifications", "id"],
  ["AutomationRule", "automationRule", "automationRules", "id"],
  ["AuditLog", "auditLog", "auditLogs", "id"],
  ["AuthRateLimit", "authRateLimit", "authRateLimits", "key"],
];

async function assertDestinationEmpty(client) {
  for (const [label, model] of destinationModels) {
    const count = await client[model].count();
    if (count !== 0) {
      throw new Error(`Destination table ${label} is not empty; refusing to overwrite data.`);
    }
  }
}

function snapshotCounts(snapshot) {
  return Object.fromEntries(
    Object.entries(snapshot).map(([name, rows]) => [name, rows.length])
  );
}

async function insertSnapshot(destination, snapshot) {
  await destination.$transaction(
    async (tx) => {
      await assertDestinationEmpty(tx);

      await tx.user.createMany({ data: snapshot.users });
      await tx.customer.createMany({ data: snapshot.customers });
      await tx.lead.createMany({ data: snapshot.leads });
      await tx.carpetNeedProfile.createMany({ data: snapshot.needProfiles });
      await tx.product.createMany({ data: snapshot.products });
      await tx.productVariant.createMany({ data: snapshot.variants });
      await tx.inventoryMovement.createMany({ data: snapshot.inventoryMovements });
      await tx.deal.createMany({ data: snapshot.deals });
      await tx.followUp.createMany({ data: snapshot.followUps });
      await tx.order.createMany({ data: snapshot.orders });
      await tx.orderItem.createMany({ data: snapshot.orderItems });
      await tx.payment.createMany({ data: snapshot.payments });
      await tx.installment.createMany({ data: snapshot.installments });
      await tx.notification.createMany({ data: snapshot.notifications });
      await tx.automationRule.createMany({ data: snapshot.automationRules });
      await tx.auditLog.createMany({
        data: snapshot.auditLogs.map((row) =>
          row.details === null ? { ...row, details: undefined } : row
        ),
      });
      await tx.authRateLimit.createMany({ data: snapshot.authRateLimits });
      await verifyDestination(tx, snapshot);
    },
    { maxWait: 30_000, timeout: 600_000 }
  );
}

function sumFields(rows, fields) {
  return Object.fromEntries(
    fields.map((field) => [
      field,
      rows.reduce((sum, row) => sum + BigInt(row[field]), 0n).toString(),
    ])
  );
}

async function verifyDestination(destination, snapshot) {
  for (const [label, model, snapshotKey, primaryKey] of destinationModels) {
    const expectedKeys = snapshot[snapshotKey]
      .map((row) => row[primaryKey])
      .sort();
    const actualRows = await destination[model].findMany({
      select: { [primaryKey]: true },
    });
    const actualKeys = actualRows.map((row) => row[primaryKey]).sort();

    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      throw new Error(`Primary-key mismatch for ${label}.`);
    }
  }

  const criticalChecks = [
    [
      "order",
      "orders",
      ["totalAmount", "discountAmount", "taxAmount", "finalAmount", "paidAmount", "remainingAmount"],
    ],
    ["orderItem", "orderItems", ["quantity", "unitPrice", "totalPrice"]],
    ["payment", "payments", ["amount"]],
    ["installment", "installments", ["amount"]],
    [
      "productVariant",
      "variants",
      ["cashPrice", "installmentPrice", "stock", "reservedStock", "soldStock"],
    ],
    ["inventoryMovement", "inventoryMovements", ["quantity", "previousStock", "newStock"]],
  ];

  for (const [model, snapshotKey, fields] of criticalChecks) {
    const actualRows = await destination[model].findMany({
      select: Object.fromEntries(fields.map((field) => [field, true])),
    });
    const expectedSums = sumFields(snapshot[snapshotKey], fields);
    const actualSums = sumFields(actualRows, fields);
    if (JSON.stringify(actualSums) !== JSON.stringify(expectedSums)) {
      throw new Error(`Critical numeric totals do not match for ${model}.`);
    }
  }
}

async function main() {
  const sourceUrl = requireEnvironment("SQLITE_DATABASE_URL");
  assertSourceFileExists(sourceUrl);

  const source = new SqliteClient({ datasourceUrl: sourceUrl });
  let destination;

  try {
    const snapshot = await source.$transaction(
      async (tx) => {
        await validateJsonColumns(tx);
        return readSnapshot(tx);
      },
      { maxWait: 30_000, timeout: 600_000 }
    );
    const counts = snapshotCounts(snapshot);

    console.log("SQLite preflight passed. Row counts:", counts);

    if (mode === "--check") {
      console.log("Check-only mode: PostgreSQL was not connected to or modified.");
      return;
    }

    const destinationUrl = resolveDestinationUrl();

    destination = new PostgresClient({ datasourceUrl: destinationUrl });
    await assertDestinationEmpty(destination);
    await insertSnapshot(destination, snapshot);
    console.log(
      "Migration completed atomically; all primary keys and critical financial/inventory totals match."
    );
  } finally {
    await source.$disconnect();
    if (destination) await destination.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown migration error.");
  process.exitCode = 1;
});
