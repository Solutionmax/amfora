/**
 * Rate limits for endpoints that an anonymous caller can reach.
 *
 * The global ceiling in app.ts stops crude flooding. These tighter limits exist because
 * the endpoints below accept a secret (a share password, a login, a reset token) and would
 * otherwise be brute forceable at whatever rate the network allows.
 */

/** Endpoints that verify a share or reverse share password. */
export const sharePasswordRateLimit = {
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_SHARE_PASSWORD || 10),
    timeWindow: "1 minute",
  },
};

/** Endpoints that verify a credential: login, two factor, password reset. */
export const credentialRateLimit = {
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_CREDENTIALS || 10),
    timeWindow: "1 minute",
  },
};

/** Public upload endpoints. Generous, because one upload makes many part requests. */
export const publicUploadRateLimit = {
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_PUBLIC_UPLOAD || 120),
    timeWindow: "1 minute",
  },
};
