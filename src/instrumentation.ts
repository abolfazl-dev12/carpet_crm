import { validateAuthEnvironment } from "@/lib/auth-config";
import { validateProductionDatabaseEnvironment } from "@/lib/database-config";
import { validateProxyEnvironment } from "@/lib/proxy-config";

/**
 * Next.js invokes register once when a server instance is initialized.
 * Production configuration therefore fails before the instance serves traffic.
 */
export function register(): void {
  validateAuthEnvironment();
  validateProductionDatabaseEnvironment();
  validateProxyEnvironment();
}
