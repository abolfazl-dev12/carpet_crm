"use strict";

const { spawnSync } = require("node:child_process");
const { join, resolve } = require("node:path");

const projectRoot = resolve(__dirname, "..");
const prismaCli = join(projectRoot, "node_modules", "prisma", "build", "index.js");
const schemaPath = join(projectRoot, "prisma", "schema.prisma");
const command = process.argv[2];

if (command !== "validate") {
  throw new Error("Only offline SQLite schema validation is supported by this wrapper");
}

const result = spawnSync(
  process.execPath,
  [prismaCli, command, "--schema", schemaPath],
  {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: "file:./offline-validation.db" },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
