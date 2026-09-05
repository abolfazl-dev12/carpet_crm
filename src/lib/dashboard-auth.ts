import type { SessionPayload } from "@/lib/auth";

export function getDashboardAuthRedirect(
  session: SessionPayload | null
): "/login" | null {
  return session ? null : "/login";
}
