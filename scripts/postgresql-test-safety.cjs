"use strict";

const { createHash, timingSafeEqual } = require("node:crypto");

class DisposableDatabaseSafetyError extends Error {}
const deny = () => { throw new DisposableDatabaseSafetyError("Disposable PostgreSQL safety check failed; no destructive operation authorized (details redacted)"); };

function readSafetyConfig(environment = process.env) {
  if (environment.NODE_ENV !== "test" ||
      environment.ALLOW_DESTRUCTIVE_POSTGRES_TESTS !== "I_ACCEPT_DISPOSABLE_DATA_LOSS") deny();
  for (const key of ["APP_ENV", "DEPLOYMENT_ENV", "ENVIRONMENT", "VERCEL_ENV"]) {
    if (environment[key] && !["test", "local", "development", "disposable"].includes(environment[key])) deny();
  }
  const token = environment.POSTGRES_TEST_TOKEN;
  if (!token || !/^[A-Za-z0-9_-]{43,}$/.test(token)) deny();
  const url = environment.POSTGRES_TEST_DATABASE_URL;
  validateTestUrl(url);
  return { url, tokenHash: createHash("sha256").update(token).digest("hex") };
}

function validateTestUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { deny(); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname ||
      !parsed.pathname.slice(1) || (parsed.searchParams.get("schema") || "public") !== "public") deny();
  return value;
}

function readSeedSafetyConfig(environment = process.env) {
  if (environment.ALLOW_DESTRUCTIVE_POSTGRES_SEED !== "I_ACCEPT_DISPOSABLE_DATA_LOSS") deny();
  return readSafetyConfig(environment);
}

async function assertDisposableDatabase(client, environment = process.env) {
  const { tokenHash } = readSafetyConfig(environment);
  try {
    const metadata = await client.$queryRawUnsafe(
      "SELECT current_database() AS database_name, current_user AS role_name, (SELECT oid::text FROM pg_database WHERE datname = current_database()) AS database_oid, pg_is_in_recovery() AS in_recovery"
    );
    if (metadata.length !== 1 || metadata[0].in_recovery !== false) deny();
    const actual = metadata[0];
    // Additional tripwire, never the primary identity proof.
    if (/(^|[-_])(prod(?:uction)?|stag(?:e|ing)?|shared)([-_]|$)/i.test(actual.database_name + "_" + actual.role_name)) deny();
    const markers = await client.$queryRawUnsafe(
      'SELECT purpose, token_hash, database_name, database_oid, role_name, expires_at FROM carpet_crm_test_guard.disposable_identity FOR SHARE'
    );
    if (markers.length !== 1) deny();
    const marker = markers[0];
    if (marker.purpose !== "carpet-crm-disposable-test" ||
        marker.database_name !== actual.database_name ||
        marker.database_oid !== actual.database_oid || marker.role_name !== actual.role_name ||
        !Number.isFinite(new Date(marker.expires_at).getTime()) ||
        new Date(marker.expires_at).getTime() <= Date.now() ||
        !/^[a-f0-9]{64}$/.test(marker.token_hash) ||
        !timingSafeEqual(Buffer.from(marker.token_hash, "hex"), Buffer.from(tokenHash, "hex"))) deny();
  } catch {
    deny();
  }
}

async function resetDisposablePublicSchema(client, environment = process.env) {
  // Reject configuration before opening a transaction, then verify the *actual*
  // connection inside the same transaction that executes DROP. No URL-only proof.
  readSafetyConfig(environment);
  await client.$transaction(async (tx) => {
    await assertDisposableDatabase(tx, environment);
    await tx.$executeRawUnsafe('DROP SCHEMA IF EXISTS "public" CASCADE');
    await tx.$executeRawUnsafe('CREATE SCHEMA "public"');
  }, { maxWait: 30_000, timeout: 60_000 });
}

module.exports = { DisposableDatabaseSafetyError, readSafetyConfig, readSeedSafetyConfig, validateTestUrl, assertDisposableDatabase, resetDisposablePublicSchema };
