const TRUSTED_PROXY_HEADERS = [
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
] as const;

export type TrustedProxyHeader = (typeof TRUSTED_PROXY_HEADERS)[number];

export interface ClientIpOptions {
  trustProxy: boolean;
  proxyHeader: TrustedProxyHeader;
}

interface ProxyEnvironment {
  TRUST_PROXY?: string;
  TRUST_PROXY_HEADER?: string;
}

export function getClientIpOptions(
  environment: ProxyEnvironment = {
    TRUST_PROXY: process.env.TRUST_PROXY,
    TRUST_PROXY_HEADER: process.env.TRUST_PROXY_HEADER,
  }
): ClientIpOptions {
  const trustProxyValue = environment.TRUST_PROXY?.trim().toLowerCase() || "false";
  if (trustProxyValue !== "true" && trustProxyValue !== "false") {
    throw new Error("TRUST_PROXY must be either true or false.");
  }

  const proxyHeaderValue =
    environment.TRUST_PROXY_HEADER?.trim().toLowerCase() || "x-forwarded-for";
  if (!TRUSTED_PROXY_HEADERS.includes(proxyHeaderValue as TrustedProxyHeader)) {
    throw new Error(
      `TRUST_PROXY_HEADER must be one of: ${TRUSTED_PROXY_HEADERS.join(", ")}.`
    );
  }

  return {
    trustProxy: trustProxyValue === "true",
    proxyHeader: proxyHeaderValue as TrustedProxyHeader,
  };
}

export function validateProxyEnvironment(): void {
  getClientIpOptions();
}
