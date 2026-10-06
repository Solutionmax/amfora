import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

import { useTestDatabase } from "../../../test-support/test-db";
import { EmailService } from "../email/service";
import type { InfectedFile } from "./infected";

const database = useTestDatabase();

let prisma: typeof import("../../shared/prisma").prisma;
let announceInfected: typeof import("./infected").announceInfected;
let recordInfectedLine: typeof import("./infected").recordInfectedLine;
const original = EmailService.prototype.sendNotice;
const mails: Array<{ to: string; subject: string; text: string; rows: string[] }> = [];

before(async () => {
  EmailService.prototype.sendNotice = async (to, notice) => {
    mails.push({ to, subject: notice.subject, text: notice.text, rows: (notice.rows ?? []).map((row) => row[1]) });
    return true;
  };
  ({ prisma } = await import("../../shared/prisma"));
  ({ announceInfected, recordInfectedLine } = await import("./infected"));
  for (const [id, isAdmin] of [
    ["a", false],
    ["b", false],
    ["boss", true],
    ["boss2", true],
  ] as const) {
    await prisma.user.create({
      data: { id, firstName: id, lastName: "T", username: id, email: `${id}@example.test`, isAdmin },
    });
  }
});

after(async () => {
  EmailService.prototype.sendNotice = original;
  await prisma.$disconnect();
  database.cleanup();
});

beforeEach(async () => {
  mails.length = 0;
  await prisma.activityEvent.deleteMany();
});

const found = (ownerId: string, count: number, from = 0): InfectedFile[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${ownerId}${from + i}`,
    name: `bad${from + i}.exe`,
    finding: "Win.Test",
    ownerId,
    where: "a receive link" as const,
  }));
const lines = (ownerId: string) => prisma.activityEvent.count({ where: { action: "file.infected", ownerId } });

test("a flood is one mail to the owner and one to the administrators, with a count and the first five names", async () => {
  await announceInfected(found("a", 30));
  assert.equal(mails.length, 3, mails.map((mail) => mail.to).join());
  const owner = mails.find((mail) => mail.to === "a@example.test")!;
  assert.match(owner.text, /30 files/);
  assert.equal(owner.rows.length, 6);
  assert.ok(owner.rows[0].startsWith("bad0.exe"));
  assert.ok(owner.rows[4].startsWith("bad4.exe"));
  assert.match(owner.rows[5], /25 others/);
  for (const to of ["boss@example.test", "boss2@example.test"]) {
    assert.match(mails.find((mail) => mail.to === to)!.text, /30 files/);
  }
});

test("one infected file is the plain notice, to the owner and to each administrator", async () => {
  await announceInfected(found("a", 1));
  assert.equal(mails.length, 3);
  assert.match(mails[0].subject, /^File blocked: bad0\.exe$/);
});

test("two owners get a mail each, the administrators one mail about both", async () => {
  await announceInfected([...found("a", 2), ...found("b", 3)]);
  assert.equal(mails.length, 4);
  assert.match(mails.find((mail) => mail.to === "a@example.test")!.text, /2 files/);
  assert.match(mails.find((mail) => mail.to === "b@example.test")!.text, /3 files/);
  assert.match(mails.find((mail) => mail.to === "boss@example.test")!.text, /5 files/);
});

test("an owner who is an administrator gets only the one mail", async () => {
  await announceInfected(found("boss", 2));
  assert.equal(mails.filter((mail) => mail.to === "boss@example.test").length, 1);
  assert.equal(mails.filter((mail) => mail.to === "boss2@example.test").length, 1);
});

test("at most 20 lines per owner per hour in the log, the rest only counted in the mail", async () => {
  for (const file of found("a", 30)) await recordInfectedLine(file);
  assert.equal(await lines("a"), 20);
  for (const file of found("a", 5, 100)) await recordInfectedLine(file);
  assert.equal(await lines("a"), 20);
  assert.equal(await lines("b"), 0);
  await prisma.activityEvent.updateMany({ data: { createdAt: new Date(Date.now() - 2 * 3600_000) } });
  for (const file of found("a", 3, 200)) await recordInfectedLine(file);
  assert.equal(await lines("a"), 23);
});

test("announcing writes no lines: the lines are written when the file is settled", async () => {
  await announceInfected(found("a", 2));
  assert.equal(await lines("a"), 0);
});

test("a failing mail server is survived", async () => {
  EmailService.prototype.sendNotice = async () => {
    throw new Error("smtp down");
  };
  try {
    await announceInfected(found("a", 2));
  } finally {
    EmailService.prototype.sendNotice = async (to, notice) => {
      mails.push({ to, subject: notice.subject, text: notice.text, rows: [] });
      return true;
    };
  }
});
