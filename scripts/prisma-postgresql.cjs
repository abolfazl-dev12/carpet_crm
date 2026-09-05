"use strict";

const { spawnSync } = require("node:child_process");
const { join, resolve } = require("node:path");

const projectRoot = resolve(__dirname, "..");
const prismaCli = join(projectRoot, "node_modules", "prisma", "build", "index.js");
const schemaPath = join(projectRoot, "prisma", "postgresql", "schema.prisma");
const rawArgs = process.argv.slice(2);
const offlineSchemaOnly = rawArgs[0] === "--offline-schema-only";
const args = offlineSchemaOnly ? rawArgs.slice(1) : rawArgs;

if (args.length === 0 || !["generate", "validate"].includes(args[0])) {
  throw new Error("Only schema-only Prisma generate/validate commands are supported by this wrapper.");
}

const environment = { ...process.env };
if (offlineSchemaOnly) {
  // This explicitly named local workflow is limited to Prisma commands that do
  // not connect. Normal production commands never receive a fallback URL.
  environment.DATABASE_URL =
    "postgresql://schema_validation:unused@127.0.0.1:5432/carpet_crm?schema=public";
}

const result = spawnSync(process.execPath, [prismaCli, ...args, "--schema", schemaPath], {
  cwd: projectRoot,
  env: environment,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
