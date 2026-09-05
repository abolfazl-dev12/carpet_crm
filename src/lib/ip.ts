import { isIP } from "node:net";
import { NextRequest } from "next/server";
import {
  getClientIpOptions,
  type ClientIpOptions,
} from "@/lib/proxy-config";

export { getClientIpOptions } from "@/lib/proxy-config";
export type { ClientIpOptions, TrustedProxyHeader } from "@/lib/proxy-config";

function parseIp(value: string | null): string | null {
  const candidate = value?.trim();
  return candidate && isIP(candidate) !== 0 ? candidate : null;
}

export function getClientIp(
  req: NextRequest,
  options: ClientIpOptions = getClientIpOptions()
): string | null {
  if (!options.trustProxy) return null;

  const rawHeader = req.headers.get(options.proxyHeader);
  if (!rawHeader) return null;

  const candidate =
    options.proxyHeader === "x-forwarded-for" ? rawHeader.split(",", 1)[0] : rawHeader;
  return parseIp(candidate);
}
