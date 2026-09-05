import type { Prisma } from "@prisma/client";
import prisma from "./prisma";

type AuditDetailValue =
  | string
  | number
  | boolean
  | null
  | AuditDetailValue[]
  | { [key: string]: AuditDetailValue };

export interface CreateAuditLogParams {
  userId?: string | null;
  action:
    | "LOGIN"
    | "LOGOUT"
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "STATUS_CHANGE"
    | "ASSIGNMENT"
    | "EXPORT";
  entity: string;
  entityId?: string | null;
  details?: Record<string, AuditDetailValue> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const SENSITIVE_KEY_REGEX = /password|token|secret|jwt|hash|creditcard|cheque.*number|cvv|auth/i;

/**
 * Recursively sanitize sensitive keys from details before writing to audit log
 */
function sanitizeAuditDetails(value: AuditDetailValue): AuditDetailValue {
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditDetails(item));
  }

  const clean: Record<string, AuditDetailValue> = {};
  for (const [key, childValue] of Object.entries(value)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      clean[key] = "[REDACTED]";
    } else {
      clean[key] = sanitizeAuditDetails(childValue);
    }
  }
  return clean;
}

/**
 * Record an audit log entry safely in the database (supports optional transaction client)
 */
export async function logAuditEvent(
  params: CreateAuditLogParams,
  tx?: Prisma.TransactionClient
) {
  try {
    const client = tx || prisma;
    const cleanDetails = params.details ? sanitizeAuditDetails(params.details) : undefined;

    await client.auditLog.create({
      data: {
        userId: params.userId || undefined,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || undefined,
        details: cleanDetails ?? undefined,
        ipAddress: params.ipAddress || undefined,
        userAgent: params.userAgent || undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    if (tx) {
      // Re-throw in transaction to ensure atomicity
      throw error;
    }
  }
}
