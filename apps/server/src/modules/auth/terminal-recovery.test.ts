import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
let prisma: typeof import("../../shared/prisma").prisma;
let app: Awaited<ReturnType<typeof import("../../app").buildApp>>;
before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  const { buildApp } = await import("../../app");
  const { registerRoutes } = await import("../../routes");
  app = await buildApp();
  registerRoutes(app);
  await app.ready();
  await prisma.user.create({
    data: {
      id: "recovery-member",
      firstName: "Recovery",
      lastName: "Member",
      username: "recovery-member",
      email: "recovery@example.test",
      password: await bcrypt.hash("old-recovery-password", 4),
    },
  });
});
after(async () => {
  await app.close();
  await prisma.$disconnect();
  database.cleanup();
});
test("SEC-04: real terminal password recovery revokes saved JWT and other recovery credentials", async () => {
  const { sessionClaims, createCredentialProof } = await import("./session");
  const claims = await sessionClaims("recovery-member");
  const token = app.jwt.sign(claims);
  await createCredentialProof(claims);
  await prisma.trustedDevice.create({
    data: { userId: claims.userId, deviceHash: "old-device", expiresAt: new Date(Date.now() + 60000) },
  });
  await prisma.passwordReset.create({
    data: { userId: claims.userId, token: "other-recovery", expiresAt: new Date(Date.now() + 60000) },
  });
  await prisma.loginChallenge.create({
    data: {
      id: "old-challenge",
      userId: claims.userId,
      fingerprint: "old-credential",
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  const prompts = [
    "Enter user email:",
    "Do you want to reset the password for this user?",
    "Enter new password:",
    "Confirm new password:",
  ];
  const answers = ["recovery@example.test", "y", "terminal-recovered-password", "terminal-recovered-password"];
  const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/scripts/reset-password.ts"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "",
      step = 0;
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Terminal recovery timed out"));
    }, 15000);
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      if (step < prompts.length && output.includes(prompts[step])) child.stdin.write(`${answers[step++]}\n`);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /Password reset successful/);
  assert.equal((await app.inject({ url: "/files", cookies: { token } })).statusCode, 401);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: claims.userId } });
  assert.equal(await bcrypt.compare("terminal-recovered-password", user.password!), true);
  assert.equal(await prisma.trustedDevice.count({ where: { userId: claims.userId } }), 0);
  assert.equal(await prisma.loginChallenge.count({ where: { userId: claims.userId } }), 0);
  assert.equal(await prisma.credentialProof.count({ where: { userId: claims.userId } }), 0);
  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { emailOrUsername: "recovery-member", password: "terminal-recovered-password" },
  });
  assert.equal(login.statusCode, 200, login.body);
});
