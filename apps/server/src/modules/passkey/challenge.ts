import { randomBytes } from "node:crypto";

import { prisma } from "../../shared/prisma";

export type ChallengePurpose = "register" | "login";

/** How long a challenge may be answered. */
const CHALLENGE_LIFETIME_MS = 5 * 60 * 1000;

/** A fresh challenge for one ceremony. A registration is tied to the user it was made for. */
export async function createChallenge(purpose: ChallengePurpose, userId: string | null): Promise<string> {
  const challenge = randomBytes(32).toString("base64url");
  await prisma.passkeyChallenge.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await prisma.passkeyChallenge.create({
    data: { id: challenge, purpose, userId, expiresAt: new Date(Date.now() + CHALLENGE_LIFETIME_MS) },
  });
  return challenge;
}

/**
 * Uses a challenge up. True once, and only for the purpose (and user) it was made for: the
 * delete decides, so two answers racing for one challenge cannot both win.
 */
export async function consumeChallenge(
  challenge: string,
  purpose: ChallengePurpose,
  userId: string | null
): Promise<boolean> {
  const { count } = await prisma.passkeyChallenge.deleteMany({
    where: { id: challenge, purpose, userId, expiresAt: { gt: new Date() } },
  });
  return count === 1;
}

/** The challenge the browser signed, read from the client data of its answer. Null when unreadable. */
export function challengeOf(clientDataJSON: unknown): string | null {
  if (typeof clientDataJSON !== "string") return null;
  try {
    const { challenge } = JSON.parse(Buffer.from(clientDataJSON, "base64url").toString("utf8"));
    return typeof challenge === "string" ? challenge : null;
  } catch {
    return null;
  }
}
