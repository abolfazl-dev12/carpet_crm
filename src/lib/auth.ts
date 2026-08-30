import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const AUTH_COOKIE_NAME = "carpet_crm_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "SALES_MANAGER" | "SALES_REP" | "VIEWER";
  phone: string;
  avatar?: string | null;
}

/**
 * Returns JWT secret key safely from environment variable.
 * Throws a clear error if missing without any hard-coded fallback.
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      "CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing or empty. Please define it in your .env file."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Hash plain password with bcrypt salt = 10
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare plain password with stored hash
 */
export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/**
 * Encrypt and sign JWT token
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const secretKey = getJwtSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

/**
 * Verify and decode JWT token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getJwtSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Server-side session extractor from cookies
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload?.userId) return null;

  // Verify user exists and is active in database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isActive: true, role: true },
  });

  if (!user || !user.isActive) return null;
  return { ...payload, role: user.role };
}

/**
 * Extract session from NextRequest (for route handlers)
 */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload?.userId) return null;

  // Active User Verification against Database (Instant revocation if disabled)
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isActive: true, role: true },
  });

  if (!user || !user.isActive) return null;
  return { ...payload, role: user.role };
}

/**
 * Permission checks for RBAC
 */
export function hasPermission(
  userRole: string | undefined,
  allowedRoles: Array<"ADMIN" | "SALES_MANAGER" | "SALES_REP" | "VIEWER">
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole as any);
}
