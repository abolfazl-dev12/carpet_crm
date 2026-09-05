import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { validateJwtSecret } from "@/lib/auth-config";
import { comparePassword, hashPassword } from "@/lib/password";

export { comparePassword, hashPassword } from "@/lib/password";

export const AUTH_COOKIE_NAME = "carpet_crm_session";
export const JWT_ALGORITHM = "HS256" as const;
export const JWT_ISSUER = "carpet-crm";
export const JWT_AUDIENCE = "carpet-crm-web";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

const USER_ROLES: readonly Role[] = ["ADMIN", "SALES_MANAGER", "SALES_REP", "VIEWER"];
export interface SessionTokenPayload {
  userId: string;
  sessionVersion: number;
}

export interface SessionPayload extends SessionTokenPayload {
  email: string;
  name: string;
  role: Role;
  phone: string;
  avatar?: string | null;
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && USER_ROLES.includes(value as Role);
}

function isSessionTokenPayload(
  payload: JWTPayload
): payload is JWTPayload & SessionTokenPayload {
  return (
    typeof payload.userId === "string" &&
    payload.sub === payload.userId &&
    typeof payload.sessionVersion === "number" &&
    Number.isSafeInteger(payload.sessionVersion) &&
    payload.sessionVersion >= 0
  );
}

export function getJwtSecret(
  secret: string | undefined = process.env.JWT_SECRET,
  isProduction: boolean = process.env.NODE_ENV === "production"
): Uint8Array {
  return new TextEncoder().encode(validateJwtSecret(secret, isProduction));
}

export function getAuthCookieOptions(
  isProduction: boolean = process.env.NODE_ENV === "production",
  now: number = Date.now()
) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: SESSION_TTL_SECONDS,
    expires: new Date(now + SESSION_TTL_SECONDS * 1000),
    path: "/",
    priority: "high" as const,
  };
}

export async function signSessionToken(payload: SessionTokenPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    userId: payload.userId,
    sessionVersion: payload.sessionVersion,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  const secretKey = getJwtSecret();

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      clockTolerance: 5,
    });
    return isSessionTokenPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

async function resolveCurrentSession(token: string): Promise<SessionPayload | null> {
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      avatar: true,
      isActive: true,
      sessionVersion: true,
    },
  });

  if (!user || !user.isActive || user.sessionVersion !== payload.sessionVersion) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    sessionVersion: user.sessionVersion,
  };
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return token ? resolveCurrentSession(token) : null;
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  return token ? resolveCurrentSession(token) : null;
}

export function hasPermission(
  userRole: string | undefined,
  allowedRoles: Role[]
): boolean {
  return isRole(userRole) && allowedRoles.includes(userRole);
}
