import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "./prisma";

async function key() {
  const config = await prisma.appConfig.findUnique({ where: { key: "jwtSecret" } });
  if (!config?.value) throw new Error("Signing key is not configured");
  return config.value;
}

export async function signCapability(purpose: string, subject: string, seconds: number): Promise<string> {
  const body = Buffer.from(JSON.stringify({ subject, expires: Date.now() + seconds * 1000 })).toString("base64url");
  const signature = createHmac("sha256", await key())
    .update(`${purpose}:${body}`)
    .digest("base64url");
  return `${body}.${signature}`;
}

export async function verifyCapability(token: string | undefined, purpose: string, subject: string): Promise<boolean> {
  if (!token || token.length > 4096) return false;
  try {
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra) return false;
    const expected = createHmac("sha256", await key())
      .update(`${purpose}:${body}`)
      .digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    return data.subject === subject && Number.isFinite(data.expires) && data.expires > Date.now();
  } catch {
    return false;
  }
}
