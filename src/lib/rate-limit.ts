import { createHash } from "node:crypto";
import prisma from "./prisma";

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanupAt = 0;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export function createRateLimitKey(scope: string, value: string): string {
  const digest = createHash("sha256").update(`${scope}\0${value}`).digest("hex");
  return `${scope}:${digest}`;
}

async function cleanupExpiredEntries(now: Date): Promise<void> {
  if (now.getTime() - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now.getTime();
  await prisma.authRateLimit.deleteMany({ where: { resetAt: { lte: now } } });
}

/**
 * Atomically consumes one attempt from a database-backed fixed window.
 * Only the hash of the supplied identifier is persisted.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): Promise<RateLimitResult> {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || windowMs < 1) {
    throw new Error("Invalid rate-limit configuration.");
  }

  const now = new Date();
  await cleanupExpiredEntries(now);
  const newResetAt = new Date(now.getTime() + windowMs);

  const incremented = await prisma.authRateLimit.updateManyAndReturn({
    where: { key, resetAt: { gt: now } },
    data: { attempts: { increment: 1 } },
    select: { attempts: true, resetAt: true },
  });

  let bucket = incremented[0];
  if (!bucket) {
    await prisma.authRateLimit.deleteMany({
      where: { key, resetAt: { lte: now } },
    });

    bucket = await prisma.authRateLimit.upsert({
      where: { key },
      create: { key, attempts: 1, resetAt: newResetAt },
      update: { attempts: { increment: 1 } },
      select: { attempts: true, resetAt: true },
    });
  }

  return {
    allowed: bucket.attempts <= maxAttempts,
    remaining: Math.max(0, maxAttempts - bucket.attempts),
    resetInSeconds: Math.max(
      1,
      Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000)
    ),
  };
}

export async function resetRateLimit(key: string): Promise<void> {
  await prisma.authRateLimit.deleteMany({ where: { key } });
}
