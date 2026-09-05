/**
 * Transitional reader for JSON columns. It accepts legacy JSON strings so the
 * application can be rolled out before the SQLite compatibility migration,
 * while PostgreSQL and migrated SQLite rows are returned as native values.
 */
export function readStringArray(value: unknown): string[] {
  let parsed: unknown = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }

  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}

export function formatJsonValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return "-";
  }
}
