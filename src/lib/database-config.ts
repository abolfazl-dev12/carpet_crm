const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

/**
 * Validates the database URL without opening a connection or exposing it in an
 * error. This is intentionally strict for the production PostgreSQL artifact.
 */
export function assertPostgresDatabaseUrl(value: string | undefined): void {
  const candidate = value?.trim();

  if (!candidate) {
    throw new Error("DATABASE_URL is required in production");
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (!POSTGRES_PROTOCOLS.has(parsed.protocol)) {
    throw new Error("DATABASE_URL must use the PostgreSQL provider in production");
  }

  const databaseName = parsed.pathname.replace(/^\/+/, "");
  if (!parsed.hostname || !databaseName) {
    throw new Error("DATABASE_URL must identify a PostgreSQL host and database");
  }
}

/**
 * Next loads its configuration during `next build`/`next start`; server
 * instrumentation repeats this check when an application instance initializes.
 */
export function validateProductionDatabaseEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): void {
  if (environment.NODE_ENV !== "production") {
    return;
  }

  assertPostgresDatabaseUrl(environment.DATABASE_URL);
}
