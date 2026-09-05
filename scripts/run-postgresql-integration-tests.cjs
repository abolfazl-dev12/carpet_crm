"use strict";

const { randomBytes } = require("node:crypto");
const { readSeedSafetyConfig } = require("./postgresql-test-safety.cjs");
const {
  databaseUrlForPublicSchema,
  databaseUrlForRuntimeTest,
  loadBaseDatabaseUrl,
  prismaCli,
  resetDisposablePublicSchemaWithRetry,
  requireSuccessfulResult,
  runNodeCli,
  tsxCli,
} = require("./postgresql-test-utils.cjs");

async function main() {
  const baseUrl = loadBaseDatabaseUrl();
  // Refuse before resetting anything if the seed's own opt-in is absent.
  readSeedSafetyConfig();
  const databaseUrl = databaseUrlForRuntimeTest(baseUrl);
  const environment = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    POSTGRES_TEST_DATABASE_URL: databaseUrl,
    JWT_SECRET: randomBytes(48).toString("base64url"),
    TRUST_PROXY: "false",
    TRUST_PROXY_HEADER: "x-forwarded-for",
    SEED_DEFAULT_PASSWORD: `T1!${randomBytes(24).toString("base64url")}`,
    ALLOW_PRODUCTION_SEED: "false",
  };
  const setupEnvironment = {
    ...environment,
    DATABASE_URL: databaseUrlForPublicSchema(baseUrl),
  };

  try {
    await resetDisposablePublicSchemaWithRetry(baseUrl);
    console.log("Preparing confirmed disposable PostgreSQL schema (identifiers redacted)");

    let result = runNodeCli(
      prismaCli,
      [
        "db",
        "execute",
        "--schema",
        "prisma/postgresql/schema.prisma",
        "--file",
        "prisma/postgresql/migrations/20260904000000_postgresql_init/migration.sql",
      ],
      setupEnvironment,
    );
    requireSuccessfulResult(result, "Disposable PostgreSQL schema setup");

    result = runNodeCli(tsxCli, ["prisma/seed.ts"], environment, true);
    requireSuccessfulResult(result, "PostgreSQL seed");

    result = runNodeCli(tsxCli, ["scripts/verify-all.ts"], environment, true);
    requireSuccessfulResult(result, "PostgreSQL integration suite");
  } finally {
    await resetDisposablePublicSchemaWithRetry(baseUrl);
    console.log("Disposable PostgreSQL schema returned to an empty state");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
