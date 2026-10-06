import { prisma } from "../../shared/prisma";
import { ConfigService } from "../config/service";

const configService = new ConfigService();

/** Is this user locked out by too many failures? The rule every proof of the password and every passkey sign in shares. */
export async function isBlocked(userId: string): Promise<boolean> {
  const attempt = await prisma.loginAttempt.findUnique({ where: { userId } });
  if (!attempt) return false;
  const max = Number(await configService.getValue("maxLoginAttempts"));
  const blockMs = Number(await configService.getValue("loginBlockDuration")) * 1000;
  return attempt.attempts >= max && Date.now() - attempt.lastAttempt.getTime() < blockMs;
}

/** A failed attempt counts like a wrong password at sign in: the same row, the same limit. */
export async function countFailure(userId: string) {
  const blockMs = Number(await configService.getValue("loginBlockDuration")) * 1000;
  const attempt = await prisma.loginAttempt.findUnique({ where: { userId } });
  const expired = attempt && Date.now() - attempt.lastAttempt.getTime() >= blockMs;
  await prisma.loginAttempt.upsert({
    where: { userId },
    create: { userId, attempts: 1, lastAttempt: new Date() },
    update: { attempts: expired ? 1 : { increment: 1 }, lastAttempt: new Date() },
  });
}

export const BLOCKED_MESSAGE = "Too many failed attempts. Please try again later.";
