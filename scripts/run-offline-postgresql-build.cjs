"use strict";

const { spawnSync } = require("node:child_process");
const { join, resolve } = require("node:path");

if (process.env.CI || process.env.NODE_ENV === "production") {
  console.error(
    "build:offline-validation is a local, non-deployment check and is disabled in CI/production.",
  );
  process.exit(1);
}

const projectRoot = resolve(__dirname, "..");
const npmCli = process.env.npm_execpath ||
  join(resolve(process.execPath, ".."), "node_modules", "npm", "bin", "npm-cli.js");
const result = spawnSync(process.execPath, [npmCli, "run", "build"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    DATABASE_URL:
      "postgresql://offline_validation:unused@127.0.0.1:5432/carpet_crm?schema=public",
  },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
