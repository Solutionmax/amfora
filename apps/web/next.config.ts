import { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Hosts whose images may be optimised by Next. Empty by default: the app serves its own
 * assets and renders the configured logo with a plain img tag, so a wildcard here would
 * only turn the image optimiser into an open proxy into the host's network.
 */
const remoteImageHosts = (process.env.IMAGE_REMOTE_HOSTS || "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

/** HSTS belongs on an HTTPS deployment only, so it follows the existing SECURE_SITE flag. */
const isSecureSite = process.env.SECURE_SITE === "true";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  ...(isSecureSite
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: remoteImageHosts.flatMap((hostname) => [
      { protocol: "https" as const, hostname },
      { protocol: "http" as const, hostname },
    ]),
  },
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: `${process.env.WEB_BODY_LIMIT_MB || 32}mb` as `${number}mb`,
    },
  },
  async headers() {
    return [
      {
        // Everything except the embed endpoint, which needs its own framing rules below.
        source: "/((?!e/).*)",
        headers: securityHeaders,
      },
      {
        // The embed endpoint exists to be put in someone else's page, so it stays framable.
        source: "/e/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
