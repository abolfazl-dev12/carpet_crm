"use strict";

const { randomBytes } = require("node:crypto");
const {
  databaseUrlForPublicSchema,
  databaseUrlForRuntimeTest,
  loadBaseDatabaseUrl,
  prismaCli,
  requireSuccessfulResult,
  resetDisposablePublicSchemaWithRetry,
  runNodeCli,
  tsxCli,
} = require("./postgresql-test-utils.cjs");

async function main() {
  const baseUrl = loadBaseDatabaseUrl();
  const runtimeUrl = databaseUrlForRuntimeTest(baseUrl);
  const environment = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: runtimeUrl,
    JWT_SECRET: randomBytes(48).toString("base64url"),
    TRUST_PROXY: "false",
  };

  await resetDisposablePublicSchemaWithRetry(baseUrl);
  try {
    const setupResult = runNodeCli(
      prismaCli,
      [
        "db",
        "execute",
        "--schema",
        "prisma/postgresql/schema.prisma",
        "--file",
        "prisma/postgresql/migrations/20260904000000_postgresql_init/migration.sql",
      ],
      {
        ...environment,
        DATABASE_URL: databaseUrlForPublicSchema(baseUrl),
      },
      false,
      true,
    );
    requireSuccessfulResult(setupResult, "PostgreSQL behavior-test schema setup");

    const result = runNodeCli(
      tsxCli,
      ["scripts/verify-postgresql-behavior.ts"],
      environment,
      true,
    );
    requireSuccessfulResult(result, "PostgreSQL behavior tests");
  } finally {
    await resetDisposablePublicSchemaWithRetry(baseUrl);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
