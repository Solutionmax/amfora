import { z } from "zod";

const base64url = z.string().min(1).max(20_000);

/** The JSON a browser hands back after navigator.credentials.create(), as @simplewebauthn/browser makes it. */
export const RegistrationResponseSchema = z.object({
  id: base64url,
  rawId: base64url,
  type: z.literal("public-key"),
  response: z
    .object({
      clientDataJSON: base64url,
      attestationObject: base64url,
      transports: z.array(z.string().max(30)).max(10).optional(),
    })
    .passthrough(),
  authenticatorAttachment: z.string().optional(),
  clientExtensionResults: z.record(z.string(), z.unknown()),
});

/** The JSON a browser hands back after navigator.credentials.get(). */
export const AuthenticationResponseSchema = z.object({
  id: base64url,
  rawId: base64url,
  type: z.literal("public-key"),
  response: z
    .object({
      clientDataJSON: base64url,
      authenticatorData: base64url,
      signature: base64url,
      userHandle: base64url.optional(),
    })
    .passthrough(),
  authenticatorAttachment: z.string().optional(),
  clientExtensionResults: z.record(z.string(), z.unknown()),
});

export const PasswordProofSchema = z.object({ password: z.string().min(1).max(500) });

export const RegisterVerifySchema = z.object({
  response: RegistrationResponseSchema,
  name: z.string().trim().max(60).optional(),
});

export const LoginVerifySchema = z.object({ response: AuthenticationResponseSchema });
