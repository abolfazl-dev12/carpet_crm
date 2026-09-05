"use strict";

const { spawnSync } = require("node:child_process");
const { join, resolve } = require("node:path");
const { loadEnvConfig } = require("@next/env");

const projectRoot = resolve(__dirname, "..");
const prismaCli = join(projectRoot, "node_modules", "prisma", "build", "index.js");
const schemaPath = join(projectRoot, "prisma", "postgresql", "schema.prisma");
const command = process.argv[2];

if (!new Set(["deploy", "status"]).has(command)) {
  throw new Error("Usage: node scripts/prisma-postgresql-migrate.cjs [deploy|status]");
}

loadEnvConfig(projectRoot);

function parsePostgresUrl(value, variableName) {
  const candidate = value?.trim();
  if (!candidate) throw new Error(`${variableName} is required`);

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL`);
  }

  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) {
    throw new Error(`${variableName} must use PostgreSQL`);
  }
  return { candidate, parsed };
}

const runtime = parsePostgresUrl(process.env.DATABASE_URL, "DATABASE_URL");
const runtimeUsesPrismaPool = runtime.parsed.hostname.toLowerCase() === "pooled.db.prisma.io";
const directValue = process.env.DIRECT_URL?.trim();

if (runtimeUsesPrismaPool && !directValue) {
  throw new Error(
    "DIRECT_URL is required for Prisma Postgres migrations; pooled DATABASE_URL is runtime-only",
  );
}

const migration = directValue
  ? parsePostgresUrl(directValue, "DIRECT_URL")
  : runtime;

if (migration.parsed.hostname.toLowerCase() === "pooled.db.prisma.io") {
  throw new Error("PostgreSQL migrations require a direct, non-pooled connection URL");
}

const result = spawnSync(
  process.execPath,
  [prismaCli, "migrate", command, "--schema", schemaPath],
  {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: migration.candidate },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
