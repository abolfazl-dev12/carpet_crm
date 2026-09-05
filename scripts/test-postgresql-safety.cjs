"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, createHash } = require("node:crypto");
const { resetDisposablePublicSchema, DisposableDatabaseSafetyError } = require("./postgresql-test-safety.cjs");

function fixture() {
  const token = randomBytes(32).toString("base64url");
  const environment = {
    NODE_ENV: "test", ALLOW_DESTRUCTIVE_POSTGRES_TESTS: "I_ACCEPT_DISPOSABLE_DATA_LOSS",
    POSTGRES_TEST_DATABASE_URL: "postgresql://localhost/disposable", POSTGRES_TEST_TOKEN: token,
  };
  const metadata = { database_name: "disposable", database_oid: "123", role_name: "test_operator", in_recovery: false };
  const markers = [{ ...metadata, purpose: "carpet-crm-disposable-test",
    token_hash: createHash("sha256").update(token).digest("hex"), expires_at: new Date(Date.now() + 60_000) }];
  const sql = [];
  let transactions = 0;
  const client = {
    $transaction: async (fn) => { transactions++; return fn(client); },
    $queryRawUnsafe: async (query) => { sql.push(query); return query.includes("current_database()") ? [metadata] : markers; },
    $executeRawUnsafe: async (query) => { sql.push(query); },
  };
  return { environment, metadata, markers, sql, client, transactions: () => transactions };
}

for (const [name, invalidate] of [
  ["no opt-in", f => { delete f.environment.ALLOW_DESTRUCTIVE_POSTGRES_TESTS; }],
  ["ordinary DATABASE_URL is insufficient", f => { f.environment.DATABASE_URL = f.environment.POSTGRES_TEST_DATABASE_URL; delete f.environment.POSTGRES_TEST_DATABASE_URL; }],
  ["production environment", f => { f.environment.NODE_ENV = "production"; }],
  ["staging deployment", f => { f.environment.DEPLOYMENT_ENV = "staging"; }],
  ["wrong token", f => { f.environment.POSTGRES_TEST_TOKEN = randomBytes(32).toString("base64url"); }],
  ["wrong database identity", f => { f.metadata.database_oid = "999"; }],
  ["wrong role identity", f => { f.metadata.role_name = "another_role"; }],
  ["production-like database", f => { f.metadata.database_name = "carpet_prod"; }],
  ["missing marker", f => { f.markers.length = 0; }],
  ["ambiguous marker", f => { f.markers.push({ ...f.markers[0] }); }],
  ["expired marker", f => { f.markers[0].expires_at = new Date(0); }],
  ["replica", f => { f.metadata.in_recovery = true; }],
]) {
  test(`${name}: aborts before destructive SQL`, async () => {
    const f = fixture(); invalidate(f);
    await assert.rejects(() => resetDisposablePublicSchema(f.client, f.environment), DisposableDatabaseSafetyError);
    assert.equal(f.sql.some(sql => /DROP|CREATE SCHEMA/.test(sql)), false);
    if (name === "no opt-in") assert.equal(f.transactions(), 0);
  });
}

test("matching live metadata and independently provisioned marker authorize reset", async () => {
  const f = fixture(); await resetDisposablePublicSchema(f.client, f.environment);
  assert.equal(f.transactions(), 1);
  assert.equal(f.sql.length, 4);
  assert.match(f.sql[0], /current_database/);
  assert.match(f.sql[1], /FOR SHARE/);
  assert.match(f.sql[2], /DROP SCHEMA/);
});

test("cleanup reuses guard and cannot reuse stale setup authorization", async () => {
  const f = fixture(); await resetDisposablePublicSchema(f.client, f.environment);
  f.sql.length = 0; f.markers.length = 0;
  await assert.rejects(() => resetDisposablePublicSchema(f.client, f.environment), DisposableDatabaseSafetyError);
  assert.equal(f.sql.some(sql => /DROP/.test(sql)), false);
});

test("metadata failure denies and never leaks credentials", async () => {
  const f = fixture(); f.client.$queryRawUnsafe = async () => { throw new Error(f.environment.POSTGRES_TEST_TOKEN); };
  await assert.rejects(() => resetDisposablePublicSchema(f.client, f.environment), error => {
    assert.equal(error.message.includes(f.environment.POSTGRES_TEST_TOKEN), false); return true;
  });
  assert.equal(f.sql.length, 0);
});
