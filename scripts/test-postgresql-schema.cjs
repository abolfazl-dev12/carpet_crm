"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PrismaClient } = require("@prisma/client");
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

const migrationFile = join(
  projectRoot,
  "prisma",
  "postgresql",
  "migrations",
  "20260904000000_postgresql_init",
  "migration.sql",
);
const productionMigrationWrapper = join(
  projectRoot,
  "scripts",
  "prisma-postgresql-migrate.cjs",
);

function quotedNames(sql, pattern) {
  return [...sql.matchAll(pattern)].map((match) => match[1]).sort();
}

async function main() {
  const baseUrl = loadBaseDatabaseUrl();
  const runtimeUrl = databaseUrlForRuntimeTest(baseUrl);
  const directUrl = process.env.POSTGRES_TEST_DIRECT_URL?.trim();
  if (!directUrl) {
    throw new Error("POSTGRES_TEST_DIRECT_URL is required for PostgreSQL migration verification");
  }
  const migrationUrl = databaseUrlForPublicSchema(directUrl);
  await verifyDisposableTarget(migrationUrl);
  const environment = { ...process.env, NODE_ENV: "test", DATABASE_URL: migrationUrl };
  const productionMigrationEnvironment = {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: baseUrl,
    DIRECT_URL: migrationUrl,
  };
  const migrationSql = readFileSync(migrationFile, "utf8");
  const expectedTables = quotedNames(migrationSql, /CREATE TABLE "([^"]+)"/g);
  const expectedIndexes = quotedNames(migrationSql, /CREATE (?:UNIQUE )?INDEX "([^"]+)"/g);
  const expectedForeignKeys = quotedNames(
    migrationSql,
    /ADD CONSTRAINT "([^"]+)" FOREIGN KEY/g,
  );

  await resetDisposablePublicSchemaWithRetry(baseUrl);
  try {
    let result = runNodeCli(
      productionMigrationWrapper,
      ["deploy"],
      productionMigrationEnvironment,
      false,
      true,
    );
    requireSuccessfulResult(result, "PostgreSQL migrate deploy");

    result = runNodeCli(
      productionMigrationWrapper,
      ["status"],
      productionMigrationEnvironment,
      false,
      true,
    );
    requireSuccessfulResult(result, "PostgreSQL migrate status");

    result = runNodeCli(
      prismaCli,
      [
        "migrate",
        "diff",
        "--from-schema-datasource",
        "prisma/postgresql/schema.prisma",
        "--to-schema-datamodel",
        "prisma/postgresql/schema.prisma",
        "--exit-code",
      ],
      environment,
      false,
      true,
    );
    requireSuccessfulResult(result, "PostgreSQL drift check");

    const client = new PrismaClient({ datasourceUrl: runtimeUrl });
    try {
      const tables = await client.$queryRawUnsafe(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations' ORDER BY table_name",
      );
      assert.deepEqual(
        tables.map((row) => row.table_name).sort(),
        expectedTables,
        "PostgreSQL table set differs from migration",
      );

      const indexes = await client.$queryRawUnsafe(
        "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname",
      );
      const actualIndexNames = new Set(indexes.map((row) => row.indexname));
      for (const indexName of expectedIndexes) {
        assert.ok(actualIndexNames.has(indexName), `Missing PostgreSQL index ${indexName}`);
      }

      const foreignKeys = await client.$queryRawUnsafe(
        "SELECT conname FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public' AND c.contype = 'f' ORDER BY conname",
      );
      assert.deepEqual(
        foreignKeys.map((row) => row.conname).sort(),
        expectedForeignKeys,
        "PostgreSQL foreign-key set differs from migration",
      );

      const primaryKeys = await client.$queryRawUnsafe(
        "SELECT COUNT(*)::int AS count FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace JOIN pg_class r ON r.oid = c.conrelid WHERE n.nspname = 'public' AND c.contype = 'p' AND r.relname <> '_prisma_migrations'",
      );
      assert.equal(primaryKeys[0].count, expectedTables.length);

      const jsonColumns = await client.$queryRawUnsafe(
        "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'jsonb' ORDER BY table_name, column_name",
      );
      assert.deepEqual(
        jsonColumns.map((row) => `${row.table_name}.${row.column_name}:${row.data_type}`),
        [
          "AuditLog.details:jsonb",
          "AutomationRule.actions:jsonb",
          "AutomationRule.conditions:jsonb",
          "CarpetNeedProfile.preferredColors:jsonb",
          "CarpetNeedProfile.preferredSizes:jsonb",
          "Product.images:jsonb",
        ],
      );

      const migrationHistory = await client.$queryRawUnsafe(
        'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"',
      );
      assert.equal(migrationHistory.length, 1);
      assert.equal(migrationHistory[0].migration_name, "20260904000000_postgresql_init");
      assert.notEqual(migrationHistory[0].finished_at, null);
      assert.equal(migrationHistory[0].rolled_back_at, null);

    } finally {
      await client.$disconnect();
    }

    console.log(
      `PostgreSQL migration verification: deploy/status PASS; ${expectedTables.length} tables, ${expectedIndexes.length} indexes, ${expectedForeignKeys.length} foreign keys; no schema drift`,
    );
  } finally {
    await resetDisposablePublicSchemaWithRetry(baseUrl);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
