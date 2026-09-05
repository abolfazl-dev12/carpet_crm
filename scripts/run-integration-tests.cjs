const { spawnSync } = require("node:child_process");
const { randomBytes, randomUUID } = require("node:crypto");
const { rmSync, writeFileSync } = require("node:fs");
const { basename, dirname, join, resolve } = require("node:path");

const TEST_DATABASE_PREFIX = "integration-test-";
const projectRoot = resolve(__dirname, "..");
const prismaDirectory = join(projectRoot, "prisma");
const databaseFileName = `${TEST_DATABASE_PREFIX}${randomUUID()}.db`;
const databasePath = join(prismaDirectory, databaseFileName);
const databaseUrl = `file:./${databaseFileName}`;

const childEnvironment = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: databaseUrl,
  JWT_SECRET: randomBytes(48).toString("base64url"),
  TRUST_PROXY: "false",
  TRUST_PROXY_HEADER: "x-forwarded-for",
  SEED_DEFAULT_PASSWORD: `T1!${randomBytes(24).toString("base64url")}`,
  ALLOW_PRODUCTION_SEED: "false",
};

const prismaCli = join(projectRoot, "node_modules", "prisma", "build", "index.js");
const tsxCli = join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");

function runNodeCli(cliPath, args, patchWindowsUserInfo = false) {
  // Node 24 can fail inside os.userInfo() on some Windows hosts. tsx only needs
  // geteuid() to name its temporary directory. Loading tsx in-process keeps this
  // workaround scoped to the isolated test runner and avoids an unpatched child.
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
    env: childEnvironment,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status ?? "unknown"}`);
  }
}

function removeTestDatabase() {
  if (
    resolve(dirname(databasePath)) !== resolve(prismaDirectory) ||
    !basename(databasePath).startsWith(TEST_DATABASE_PREFIX)
  ) {
    throw new Error(`Refusing to remove unexpected path: ${databasePath}`);
  }

  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-journal`, { force: true });
}

try {
  console.log(`Preparing isolated integration database: ${databasePath}`);
  writeFileSync(databasePath, "", { flag: "wx" });
  runNodeCli(prismaCli, ["generate", "--schema", "prisma/schema.prisma"]);
  runNodeCli(prismaCli, ["migrate", "deploy", "--schema", "prisma/schema.prisma"]);
  runNodeCli(tsxCli, ["prisma/seed.ts"], true);
  runNodeCli(tsxCli, ["scripts/verify-all.ts"], true);
} finally {
  removeTestDatabase();
}
