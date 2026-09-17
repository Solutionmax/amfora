import { createHash, randomBytes } from "node:crypto";

import { prisma } from "../../shared/prisma";

export function credentialFingerprint(user: { password: string | null; twoFactorSecret: string | null }) {
  return createHash("sha256")
    .update(JSON.stringify([user.password, user.twoFactorSecret]))
    .digest("hex");
}
export const challengeHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function validLoginChallenge(
  challenge: { userId: string; fingerprint: string; expiresAt: Date; attempts: number } | null,
  userId: string,
  fingerprint: string
): boolean {
  return (
    !!challenge &&
    challenge.userId === userId &&
    challenge.fingerprint === fingerprint &&
    challenge.expiresAt > new Date() &&
    challenge.attempts < 5
  );
}
export async function createLoginChallenge(user: {
  id: string;
  password: string | null;
  twoFactorSecret: string | null;
}) {
  const token = randomBytes(32).toString("hex");
  await prisma.loginChallenge.deleteMany({ where: { OR: [{ userId: user.id }, { expiresAt: { lte: new Date() } }] } });
  await prisma.loginChallenge.create({
    data: {
      id: challengeHash(token),
      userId: user.id,
      fingerprint: credentialFingerprint(user),
      expiresAt: new Date(Date.now() + 300000),
    },
  });
  return token;
}
