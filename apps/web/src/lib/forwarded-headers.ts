/**
 * A request that passed through more than one reverse proxy arrives with comma separated
 * forwarded headers, for example `x-forwarded-proto: https,http`. Using that value whole
 * produces URLs like `https,http://example.com`, which is where OIDC redirects and share
 * metadata URLs break behind a proxy chain.
 */
export function firstForwardedValue(value: string | null | undefined): string | undefined {
  const first = value?.split(",")[0]?.trim();
  return first ? first : undefined;
}

/** The forwarded protocol, accepted only when it is actually a protocol we can build a URL with. */
export function forwardedProtocol(value: string | null | undefined, fallback: string): string {
  const first = firstForwardedValue(value);
  return first === "http" || first === "https" ? first : fallback;
}
