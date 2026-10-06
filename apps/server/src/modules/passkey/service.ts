import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import bcrypt from "bcryptjs";
import type { z } from "zod";

import { prisma } from "../../shared/prisma";
import { BLOCKED_MESSAGE, countFailure, isBlocked } from "../auth/login-attempts";
import { ConfigService } from "../config/service";
import { UserResponseSchema } from "../user/dto";
import { challengeOf, consumeChallenge, createChallenge } from "./challenge";
import type { AuthenticationResponseSchema, RegistrationResponseSchema } from "./dto";
import { PASSKEYS_UNAVAILABLE, relyingParty } from "./relying-party";

export class PasskeyError extends Error {
  constructor(
    readonly status: 400 | 404,
    message: string,
    /** The user the failed attempt was aimed at, when the credential is known. */
    readonly userId: string | null = null,
    /** False when the refusal came from a block that is already running: it must not renew it. */
    readonly countsAsFailure = true
  ) {
    super(message);
  }
}

/** The one thing a visitor is told about a failed passkey sign in: no hint what was wrong. */
export const SIGN_IN_FAILED = "Passkey sign in failed";
const CHALLENGE_INVALID = "The passkey request is invalid or expired. Try again.";
const MAX_PASSKEYS_PER_USER = 10;

const configService = new ConfigService();

function requireRelyingParty() {
  const party = relyingParty();
  if (!party) throw new PasskeyError(400, PASSKEYS_UNAVAILABLE);
  return party;
}

/**
 * The same fresh proof switching two step sign in off asks for: the password. It is a way to
 * guess the password with a stolen session, so it uses the sign in's failure counter and block.
 * A right password does not clear the counter: only a real sign in does.
 */
async function requirePassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true, isActive: true } });
  if (!user?.isActive) throw new PasskeyError(404, "User not found");
  if (!user.password) throw new PasskeyError(400, "Password verification required");
  if (await isBlocked(userId)) throw new PasskeyError(400, BLOCKED_MESSAGE);
  if (!(await bcrypt.compare(password, user.password))) {
    await countFailure(userId);
    throw new PasskeyError(400, "Invalid password");
  }
}

/** Passkeys belong to local accounts: with password sign in switched off they are refused, with the generic answer. */
async function requirePasswordSignIn() {
  if ((await configService.getValue("passwordAuthEnabled")) === "false") throw new PasskeyError(400, SIGN_IN_FAILED);
}

export async function registrationOptions(userId: string, password: string) {
  const party = requireRelyingParty();
  await requirePassword(userId, password);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, username: true, firstName: true, lastName: true, passkeys: { select: { credentialId: true } } },
  });
  if (user.passkeys.length >= MAX_PASSKEYS_PER_USER)
    throw new PasskeyError(400, "Too many passkeys. Remove one first.");

  const challenge = await createChallenge("register", userId);
  return generateRegistrationOptions({
    rpName: (await configService.getValue("appName")) || "Amfora",
    rpID: party.rpID,
    userName: user.username,
    userDisplayName: `${user.firstName} ${user.lastName}`.trim(),
    userID: new TextEncoder().encode(user.id),
    challenge: new Uint8Array(Buffer.from(challenge, "base64url")),
    attestationType: "none",
    excludeCredentials: user.passkeys.map((key) => ({ id: key.credentialId })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
}

export async function verifyRegistration(
  userId: string,
  response: z.infer<typeof RegistrationResponseSchema>,
  name: string | undefined
) {
  const party = requireRelyingParty();
  const challenge = challengeOf(response.response.clientDataJSON);
  // The challenge is spent before anything else is checked, and only for the user it was made for.
  if (!challenge || !(await consumeChallenge(challenge, "register", userId))) {
    throw new PasskeyError(400, CHALLENGE_INVALID);
  }
  const verification = await verifyRegistrationResponse({
    response: response as never,
    expectedChallenge: challenge,
    expectedOrigin: party.origin,
    expectedRPID: party.rpID,
    requireUserVerification: true,
  }).catch(() => null);
  if (!verification?.verified) throw new PasskeyError(400, "The passkey could not be verified");

  const { credential } = verification.registrationInfo;
  const transports = response.response.transports;
  try {
    const passkey = await prisma.passkey.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: transports?.length ? JSON.stringify(transports) : null,
        name: name || "Passkey",
      },
    });
    return { id: passkey.id, name: passkey.name };
  } catch {
    throw new PasskeyError(400, "This passkey is already registered");
  }
}

export async function listPasskeys(userId: string) {
  return prisma.passkey.findMany({
    where: { userId },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function removePasskey(userId: string, id: string, password: string) {
  await requirePassword(userId, password);
  const { count } = await prisma.passkey.deleteMany({ where: { id, userId } });
  if (count !== 1) throw new PasskeyError(404, "Passkey not found");
}

/** Options for a sign in without a user name: the authenticator offers the keys it holds for this site. */
export async function loginOptions() {
  const party = requireRelyingParty();
  await requirePasswordSignIn();
  const challenge = await createChallenge("login", null);
  return generateAuthenticationOptions({
    rpID: party.rpID,
    challenge: new Uint8Array(Buffer.from(challenge, "base64url")),
    userVerification: "required",
  });
}

/** Signs in with a passkey. Every refusal is the same sentence; the caller counts and logs it. */
export async function verifyLogin(response: z.infer<typeof AuthenticationResponseSchema>) {
  const party = requireRelyingParty();
  await requirePasswordSignIn();
  const challenge = challengeOf(response.response.clientDataJSON);
  if (!challenge || !(await consumeChallenge(challenge, "login", null))) throw new PasskeyError(400, SIGN_IN_FAILED);

  const passkey = await prisma.passkey.findUnique({ where: { credentialId: response.id }, include: { user: true } });
  if (!passkey) throw new PasskeyError(400, SIGN_IN_FAILED);
  const { user } = passkey;
  const fail = () => new PasskeyError(400, SIGN_IN_FAILED, user.id);

  if (!user.isActive) throw fail();
  if (await isBlocked(user.id)) throw new PasskeyError(400, SIGN_IN_FAILED, user.id, false);
  const handle = response.response.userHandle;
  if (handle && Buffer.from(handle, "base64url").toString("utf8") !== user.id) throw fail();

  const verification = await verifyAuthenticationResponse({
    response: response as never,
    expectedChallenge: challenge,
    expectedOrigin: party.origin,
    expectedRPID: party.rpID,
    requireUserVerification: true,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(passkey.publicKey),
      counter: Number(passkey.counter),
      transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
    },
  }).catch(() => null);
  if (!verification?.verified) throw fail();

  // Compare and set: of two answers racing with the same counter only one moves it forward.
  const moved = await prisma.passkey.updateMany({
    where: { id: passkey.id, counter: passkey.counter },
    data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
  });
  if (moved.count !== 1) throw fail();

  await prisma.loginAttempt.deleteMany({ where: { userId: user.id } });
  return UserResponseSchema.parse(user);
}
