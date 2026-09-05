"use strict";

const { spawnSync } = require("node:child_process");
const { join, resolve } = require("node:path");
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");
const { readSafetyConfig, assertDisposableDatabase, resetDisposablePublicSchema } = require("./postgresql-test-safety.cjs");

const projectRoot = resolve(__dirname, "..");
const prismaCli = join(projectRoot, "node_modules", "prisma", "build", "index.js");
const tsxCli = join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");

function loadBaseDatabaseUrl() {
  loadEnvConfig(projectRoot);
  // Never fall back to the application's DATABASE_URL or DIRECT_URL.
  return readSafetyConfig().url;
}

function databaseUrlForPublicSchema(baseUrl) {
  const parsed = new URL(baseUrl);
  parsed.searchParams.set("schema", "public");
  parsed.searchParams.set("connect_timeout", "60");
  return parsed.toString();
}

function databaseUrlForRuntimeTest(baseUrl) {
  const parsed = new URL(baseUrl);
  parsed.searchParams.set("connect_timeout", "60");
  parsed.searchParams.set("pool_timeout", "60");
  parsed.searchParams.set("connection_limit", "2");
  return parsed.toString();
}

async function verifyDisposableTarget(baseUrl) {
  readSafetyConfig();
  const client = createAdminClient(baseUrl);
  try {
    await assertDisposableDatabase(client);
  } finally {
    await client.$disconnect();
  }
}

async function resetDisposablePublicSchemaWithRetry(baseUrl) {
  // Keep the caller interface; never retry an ambiguous destructive outcome.
  readSafetyConfig();
  const client = createAdminClient(baseUrl);
  try {
    await resetDisposablePublicSchema(client);
  } finally {
    await client.$disconnect();
  }
}

function createAdminClient(baseUrl) {
  // Use the same bounded connection timeout as the test setup/runtime clients;
  // remote disposable instances can take longer than Prisma's default to wake.
  const parsed = new URL(baseUrl);
  parsed.searchParams.set("connect_timeout", "60");
  return new PrismaClient({ datasourceUrl: parsed.toString() });
}

function runNodeCli(cliPath, args, environment, patchWindowsUserInfo = false, capture = false) {
  const nodeArgs =
    patchWindowsUserInfo && process.platform === "win32"
      ? [
          "--eval",
          "process.geteuid ??= () => 0; import('tsx').then(() => import(require('node:url').pathToFileURL(process.argv[1]).href))",
          resolve(projectRoot, args[0]),
        ]
      : [cliPath, ...args];

  const result = spawnSync(process.execPath, nodeArgs, {
    cwd: projectRoot,
    env: environment,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? "pipe" : "inherit",
  });

  if (result.error) throw result.error;
  return result;
}

function requireSuccessfulResult(result, label) {
  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join("\n");
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}${details ? `\n${details}` : ""}`);
  }
}

module.exports = {
  createAdminClient,
  databaseUrlForPublicSchema,
  databaseUrlForRuntimeTest,
  verifyDisposableTarget,
  loadBaseDatabaseUrl,
  prismaCli,
  projectRoot,
  resetDisposablePublicSchema,
  resetDisposablePublicSchemaWithRetry,
  requireSuccessfulResult,
  runNodeCli,
  tsxCli,
};
