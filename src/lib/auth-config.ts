const KNOWN_WEAK_JWT_SECRETS = new Set([
  "secret",
  "changeme",
  "password",
  "your-secret-key",
  "your-secure-random-32-char-jwt-secret",
]);

const PREDICTABLE_SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
  "9876543210",
  "qwertyuiop",
];

interface AuthEnvironment {
  NODE_ENV?: string;
  JWT_SECRET?: string;
}

function isRepeatedPattern(value: string): boolean {
  for (let patternLength = 1; patternLength <= Math.floor(value.length / 2); patternLength++) {
    if (value.length % patternLength !== 0) continue;
    const pattern = value.slice(0, patternLength);
    if (pattern.repeat(value.length / patternLength) === value) return true;
  }
  return false;
}

function isObviouslyPredictable(value: string): boolean {
  const normalized = value.toLowerCase();
  const distinctCharacters = new Set(value).size;

  return (
    distinctCharacters < 12 ||
    isRepeatedPattern(normalized) ||
    PREDICTABLE_SEQUENCES.some((sequence) => normalized.includes(sequence))
  );
}

export function validateJwtSecret(
  secret: string | undefined,
  isProduction: boolean
): string {
  const normalizedSecret = secret?.trim();
  if (!normalizedSecret) {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET is missing or empty.");
  }

  const normalizedLowerCase = normalizedSecret.toLowerCase();
  if (KNOWN_WEAK_JWT_SECRETS.has(normalizedLowerCase)) {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET uses a known unsafe value.");
  }

  if (isProduction) {
    const secretBytes = new TextEncoder().encode(normalizedSecret);
    const isRandomHex = /^[0-9a-f]{64,}$/i.test(normalizedSecret);
    const hasRecommendedEncodedLength = normalizedSecret.length >= 43;

    if (
      secretBytes.byteLength < 32 ||
      (!isRandomHex && !hasRecommendedEncodedLength) ||
      isObviouslyPredictable(normalizedSecret)
    ) {
      throw new Error(
        "CRITICAL SECURITY ERROR: production JWT_SECRET must be a high-entropy random value (preferably 32 random bytes encoded as at least 43 base64/base64url characters)."
      );
    }
  }

  return normalizedSecret;
}

export function validateAuthEnvironment(
  environment: AuthEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
  }
): void {
  if (environment.NODE_ENV === "production") {
    validateJwtSecret(environment.JWT_SECRET, true);
  }
}
