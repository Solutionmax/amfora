import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";

import { useTestDatabase } from "../../../test-support/test-db";

const database = useTestDatabase();
let prisma: typeof import("../../shared/prisma").prisma;
let AuthService: typeof import("./service").AuthService;
let InviteService: typeof import("../invite/service").InviteService;
let TwoFactorService: typeof import("../two-factor/service").TwoFactorService;
before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ AuthService } = await import("./service"));
  ({ InviteService } = await import("../invite/service"));
  ({ TwoFactorService } = await import("../two-factor/service"));
  await prisma.user.create({
    data: {
      id: "member",
      firstName: "Member",
      lastName: "Test",
      username: "member",
      email: "member@example.test",
      password: await bcrypt.hash("original-password", 4),
      twoFactorEnabled: true,
      twoFactorSecret: "JBSWY3DPEHPK3PXP",
      twoFactorBackupCodes: JSON.stringify([{ code: "ABCD-EFGH", used: false }]),
    },
  });
});
after(async () => {
  await prisma.$disconnect();
  database.cleanup();
});
test("SEC-07: two parallel invite uses create exactly one account", async () => {
  const service = new InviteService();
  const { token } = await service.generateInviteToken("member");
  const results = await Promise.allSettled(
    [1, 2].map((n) =>
      service.registerWithInvite({
        token,
        firstName: "Invite",
        lastName: "Test",
        username: `invite${n}`,
        email: `invite${n}@example.test`,
        password: "correct-invite-password",
      })
    )
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await prisma.user.count({ where: { username: { startsWith: "invite" } } }), 1);
});
test("SEC-08: parallel backup verification consumes one code once", async () => {
  const results = await Promise.allSettled([1, 2].map(() => new TwoFactorService().verifyToken("member", "ABCD-EFGH")));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});
test("SEC-09: parallel reset uses succeed once with winner's final password", async () => {
  await prisma.passwordReset.create({
    data: { userId: "member", token: "reset", expiresAt: new Date(Date.now() + 60_000) },
  });
  const passwords = ["first-reset-password", "second-reset-password"];
  const results = await Promise.allSettled(passwords.map((p) => new AuthService().resetPassword("reset", p)));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const winner = results.findIndex((r) => r.status === "fulfilled");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: "member" } });
  assert.equal(await bcrypt.compare(passwords[winner], user.password!), true);
});
