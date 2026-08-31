import prisma from "./prisma";

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
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const SENSITIVE_KEY_REGEX = /password|token|secret|jwt|hash|creditcard|cheque.*number|cvv|auth/i;

/**
 * Recursively sanitize sensitive keys from details before writing to audit log
 */
function sanitizeAuditDetails(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeAuditDetails(item));
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeAuditDetails(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Record an audit log entry safely in the database (supports optional transaction client)
 */
export async function logAuditEvent(params: CreateAuditLogParams, tx?: any) {
  try {
    const client = tx || prisma;
    const cleanDetails = params.details ? sanitizeAuditDetails(params.details) : undefined;

    await client.auditLog.create({
      data: {
        userId: params.userId || undefined,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || undefined,
        details: cleanDetails ? JSON.stringify(cleanDetails) : undefined,
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
