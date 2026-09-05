import assert from "node:assert/strict";
import {
  assertPostgresDatabaseUrl,
  validateProductionDatabaseEnvironment,
} from "../src/lib/database-config";

const invalidProductionValues: Array<[string, string | undefined]> = [
  ["missing", undefined],
  ["empty", ""],
  ["whitespace", "   "],
  ["SQLite", "file:./dev.db"],
  ["malformed", "postgresql://"],
  ["non-PostgreSQL", "mysql://user:pass@localhost/carpet_crm"],
  ["missing host", "postgresql:///carpet_crm"],
  ["missing database", "postgresql://user:pass@localhost"],
];

let assertions = 0;

for (const [name, databaseUrl] of invalidProductionValues) {
  assert.throws(
    () =>
      validateProductionDatabaseEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: databaseUrl,
      }),
    Error,
    `${name} DATABASE_URL must fail in production`,
  );
  assertions += 1;
}

for (const value of [
  "postgresql://app:password@db.internal:5432/carpet_crm?schema=public",
  "postgres://app:password@db.internal/carpet_crm",
]) {
  assert.doesNotThrow(() => assertPostgresDatabaseUrl(value));
  assertions += 1;
}

assert.doesNotThrow(() =>
  validateProductionDatabaseEnvironment({ NODE_ENV: "development" }),
);
assertions += 1;

console.log(`Production DATABASE_URL validation: ${assertions}/${assertions} passed`);
