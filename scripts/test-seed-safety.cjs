"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const { randomBytes, createHash } = require("node:crypto");
const ts = require("typescript");

const root = resolve(__dirname, "..");
const source = name => readFileSync(resolve(root, name), "utf8");
const seedCode = ts.transpileModule(source("prisma/seed.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture() {
  const token = randomBytes(32).toString("base64url");
  const env = {
    NODE_ENV: "test", SEED_DEFAULT_PASSWORD: "synthetic-seed-password",
    DATABASE_URL: "postgresql://example.invalid/application-production",
    POSTGRES_TEST_DATABASE_URL: "postgresql://example.invalid/disposable",
    POSTGRES_TEST_TOKEN: token,
    ALLOW_DESTRUCTIVE_POSTGRES_TESTS: "I_ACCEPT_DISPOSABLE_DATA_LOSS",
    ALLOW_DESTRUCTIVE_POSTGRES_SEED: "I_ACCEPT_DISPOSABLE_DATA_LOSS",
  };
  const metadata = { database_name: "disposable", database_oid: "123", role_name: "test_operator", in_recovery: false };
  const markers = [{ ...metadata, purpose: "carpet-crm-disposable-test",
    token_hash: createHash("sha256").update(token).digest("hex"), expires_at: new Date(Date.now() + 60_000) }];
  return { env, metadata, markers, calls: [], urls: [], messages: [], failMetadata: false };
}

function guardFor(env) {
  const guardModule = { exports: {} };
  // Real policy and real crypto; only the database transport is simulated.
  runInNewContext(source("scripts/postgresql-test-safety.cjs"), { module: guardModule, exports: guardModule.exports, require, process: { env }, URL, Buffer });
  return guardModule.exports;
}

async function runSeed(f) {
  const processStub = { env: f.env, exitCode: 0 };
  const query = async sql => {
    f.calls.push(sql);
    if (f.failMetadata) throw new Error(f.env.POSTGRES_TEST_TOKEN);
    if (sql === "PRAGMA database_list") return [];
    return sql.includes("current_database()") ? [f.metadata] : f.markers;
  };
  function modelClient(inTransaction) {
    return new Proxy({ $queryRawUnsafe: query }, { get(target, key) {
      if (key in target) return target[key];
      return { deleteMany: async () => {
        f.calls.push(`${String(key)}.deleteMany:${inTransaction ? "tx" : "local"}`);
      } };
    } });
  }
  class FakePrismaClient {
    constructor(options) {
      f.urls.push(options.datasourceUrl);
      const local = modelClient(false);
      for (const name of ["auditLog", "notification", "automationRule", "installment", "payment", "orderItem", "order", "followUp", "deal", "inventoryMovement", "productVariant", "product", "carpetNeedProfile", "lead", "customer", "user"]) this[name] = local[name];
    }
    $queryRawUnsafe(sql) { return query(sql); }
    async $transaction(fn) { f.calls.push("BEGIN"); await fn(modelClient(true)); f.calls.push("COMMIT"); }
    async $disconnect() { f.calls.push("disconnect"); }
  }
  await runInNewContext(seedCode, {
    exports: {}, process: processStub,
    console: { log: () => {}, error: (...args) => f.messages.push(args.join(" ")) },
    require(name) {
      if (name === "@prisma/client") return { PrismaClient: FakePrismaClient };
      if (name === "../scripts/postgresql-test-safety.cjs") return guardFor(f.env);
      if (name === "../src/lib/password") return { hashPassword: async () => {
        f.calls.push("fixture creation reached"); throw new Error("Stop after observing authorized cleanup");
      } };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return processStub.exitCode;
}

for (const [name, invalidate] of [
  ["missing seed opt-in", f => { delete f.env.ALLOW_DESTRUCTIVE_POSTGRES_SEED; }],
  ["missing general opt-in", f => { delete f.env.ALLOW_DESTRUCTIVE_POSTGRES_TESTS; }],
  ["application DATABASE_URL only", f => { delete f.env.POSTGRES_TEST_DATABASE_URL; }],
  ["missing marker", f => { f.markers.length = 0; }],
  ["wrong database identity", f => { f.metadata.database_oid = "456"; }],
  ["wrong token", f => { f.env.POSTGRES_TEST_TOKEN = randomBytes(32).toString("base64url"); }],
  ["expired marker", f => { f.markers[0].expires_at = new Date(0); }],
  ["ambiguous marker", f => { f.markers.push({ ...f.markers[0] }); }],
  ["production NODE_ENV despite legacy override", f => { f.env.NODE_ENV = "production"; f.env.ALLOW_PRODUCTION_SEED = "true"; }],
  ["staging deployment", f => { f.env.APP_ENV = "staging"; }],
  ["production-like identity even with matching marker", f => { f.metadata.database_name = f.markers[0].database_name = "carpet_production"; }],
  ["shared identity", f => { f.metadata.database_name = f.markers[0].database_name = "carpet_shared"; }],
  ["metadata failure", f => { f.failMetadata = true; }],
]) {
  test(`real direct seed: ${name} rejects before first deleteMany`, async () => {
    const f = fixture(); invalidate(f);
    assert.equal(await runSeed(f), 1);
    assert.equal(f.calls.some(call => call.includes("deleteMany")), false);
    assert.equal(f.calls.includes("fixture creation reached"), false);
    assert.equal(f.messages.join().includes(f.env.POSTGRES_TEST_TOKEN), false);
  });
}

test("real direct seed: marked target uses explicit connection and guards cleanup in same transaction", async () => {
  const f = fixture(); await runSeed(f);
  assert.deepEqual(f.urls, [f.env.POSTGRES_TEST_DATABASE_URL]);
  assert.equal(f.calls[0], "BEGIN");
  assert.match(f.calls[1], /current_database/);
  assert.match(f.calls[2], /FOR SHARE/);
  assert.equal(f.calls[3], "auditLog.deleteMany:tx");
  assert.equal(f.calls.filter(call => call.endsWith("deleteMany:tx")).length, 16);
  assert.ok(f.calls.indexOf("COMMIT") > f.calls.indexOf("user.deleteMany:tx"));
  assert.ok(f.calls.includes("fixture creation reached"));
});

test("local SQLite seed remains separate and checks provider before cleanup", async () => {
  const f = fixture(); f.env = { NODE_ENV: "development", DATABASE_URL: "file:./disposable.db", SEED_DEFAULT_PASSWORD: "synthetic-seed-password" };
  await runSeed(f);
  assert.equal(f.calls[0], "PRAGMA database_list");
  assert.equal(f.calls[1], "auditLog.deleteMany:local");
});

test("claiming a SQLite URL with a mismatched client fails before cleanup", async () => {
  const f = fixture(); f.env = { NODE_ENV: "development", DATABASE_URL: "file:./disposable.db", SEED_DEFAULT_PASSWORD: "synthetic-seed-password" }; f.failMetadata = true;
  assert.equal(await runSeed(f), 1);
  assert.equal(f.calls.some(call => call.includes("deleteMany")), false);
});

async function runRunner(f) {
  const invocations = [];
  const guard = guardFor(f.env);
  const utilities = {
    loadBaseDatabaseUrl: () => guard.readSafetyConfig().url,
    databaseUrlForRuntimeTest: url => url, databaseUrlForPublicSchema: url => url,
    resetDisposablePublicSchemaWithRetry: async () => { f.calls.push("runner reset"); },
    runNodeCli: (cli, args, env) => { invocations.push({ args, env }); return { status: 0 }; },
    requireSuccessfulResult: result => assert.equal(result.status, 0),
    prismaCli: "prisma", tsxCli: "tsx",
  };
  await runInNewContext(source("scripts/run-postgresql-integration-tests.cjs"), {
    process: { env: f.env }, console: { log() {}, error() {} },
    require(name) {
      if (name === "./postgresql-test-safety.cjs") return guard;
      if (name === "./postgresql-test-utils.cjs") return utilities;
      return require(name);
    },
  });
  return invocations;
}

test("normal PostgreSQL runner requires seed opt-in before even resetting its database", async () => {
  const f = fixture(); delete f.env.ALLOW_DESTRUCTIVE_POSTGRES_SEED;
  assert.deepEqual(await runRunner(f), []);
  assert.equal(f.calls.includes("runner reset"), false);
});

test("normal runner invokes real seed with the same identity policy, not cached authorization", async () => {
  const f = fixture(); const invocations = await runRunner(f);
  const seed = invocations.find(call => call.args[0] === "prisma/seed.ts"); assert.ok(seed);
  f.env = seed.env; f.calls.length = 0; f.markers.length = 0;
  assert.equal(await runSeed(f), 1);
  assert.equal(f.calls.some(call => call.includes("deleteMany")), false);
});
