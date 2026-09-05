import type { NextConfig } from "next";
import { validateAuthEnvironment } from "./src/lib/auth-config";
import { validateProductionDatabaseEnvironment } from "./src/lib/database-config";

// Next loads this configuration before production build/start. Keeping the
// validation here prevents a server from reporting ready with an unsafe key.
validateAuthEnvironment();
validateProductionDatabaseEnvironment();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
