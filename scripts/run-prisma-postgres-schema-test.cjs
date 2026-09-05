"use strict";

const { spawnSync } = require("node:child_process");
const { loadEnvConfig } = require("@next/env");
const { resolve } = require("node:path");

const projectRoot = resolve(__dirname, "..");
loadEnvConfig(projectRoot);

const { loadBaseDatabaseUrl } = require("./postgresql-test-utils.cjs");
loadBaseDatabaseUrl();
if (!process.env.POSTGRES_TEST_DIRECT_URL) throw new Error("POSTGRES_TEST_DIRECT_URL is required");

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is unavailable");

const result = spawnSync(process.execPath, [npmCli, "run", "test:schema:postgresql"], {
  cwd: projectRoot,
  env: { ...process.env },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
