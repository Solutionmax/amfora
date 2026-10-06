import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, afterEach, before, beforeEach, test } from "node:test";

import { EICAR, startFakeClamd, type FakeClamd } from "../../../test-support/fake-clamd";
import { useTestDatabase } from "../../../test-support/test-db";
import { scanWithClamd } from "./clamd";
import type { InfectedFile } from "./infected";

const database = useTestDatabase();

let prisma: typeof import("../../shared/prisma").prisma;
let env: typeof import("../../env").env;
let createScanQueue: typeof import("./queue").createScanQueue;
let announceInfected: typeof import("./infected").announceInfected;
let clamd: FakeClamd;

const objects = new Map<string, string>();
const announced: InfectedFile[] = [];
let opening = 0;
let mostAtOnce = 0;

const queue = () =>
  createScanQueue({
    openObject: async (name) => {
      const content = objects.get(name);
      if (content === undefined) throw new Error("No such object");
      opening += 1;
      mostAtOnce = Math.max(mostAtOnce, opening);
      return Readable.from([Buffer.from(content)]).on("close", () => (opening -= 1));
    },
    scan: (source, settings) => scanWithClamd(source, { host: settings.host, port: settings.port, timeoutMs: 1500 }),
    announce: async (file) => void announced.push(file),
  });

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ env } = await import("../../env"));
  ({ createScanQueue } = await import("./queue"));
  ({ announceInfected } = await import("./infected"));
  clamd = await startFakeClamd();
  for (const [id, isAdmin] of [
    ["owner", false],
    ["boss", true],
  ] as const) {
    await prisma.user.create({
      data: { id, firstName: id, lastName: "T", username: id, email: `${id}@example.test`, isAdmin },
    });
  }
  await prisma.reverseShare.create({ data: { id: "link", name: "Inbox", creatorId: "owner" } });
});

after(async () => {
  await clamd.close();
  await prisma.$disconnect();
  database.cleanup();
});

beforeEach(async () => {
  env.CLAMAV_HOST = "127.0.0.1";
  env.CLAMAV_PORT = String(clamd.port);
  env.CLAMAV_MAX_SIZE_MB = "100";
  clamd.mode = "scan";
  announced.length = 0;
  mostAtOnce = 0;
  objects.clear();
  await prisma.file.deleteMany();
  await prisma.reverseShareFile.deleteMany();
});

afterEach(() => {
  delete env.CLAMAV_HOST;
});

let counter = 0;
async function addFile(content: string, extra: { size?: number; scanStatus?: string | null } = {}) {
  const id = `f${++counter}`;
  objects.set(`o/${id}`, content);
  return prisma.file.create({
    data: {
      id,
      name: `${id}.txt`,
      extension: "txt",
      size: BigInt(extra.size ?? content.length),
      objectName: `o/${id}`,
      userId: "owner",
      scanStatus: extra.scanStatus === undefined ? "pending" : extra.scanStatus,
    },
  });
}
const status = async (id: string) => prisma.file.findUniqueOrThrow({ where: { id } });

test("a clean file becomes clean, an infected one infected with the name, and the owner is told", async () => {
  const clean = await addFile("just text");
  const bad = await addFile(`x ${EICAR} y`);
  await queue().kick();
  assert.equal((await status(clean.id)).scanStatus, "clean");
  const infected = await status(bad.id);
  assert.equal(infected.scanStatus, "infected");
  assert.equal(infected.scanDetail, "Eicar-Test-Signature");
  assert.ok(infected.scannedAt);
  assert.deepEqual(announced, [
    { id: bad.id, name: bad.name, finding: "Eicar-Test-Signature", ownerId: "owner", where: "your files" },
  ]);
});

test("files received on a receive link are scanned too, and tell the maker of the link", async () => {
  objects.set("r/1", EICAR);
  await prisma.reverseShareFile.create({
    data: {
      id: "r1",
      name: "x.txt",
      extension: "txt",
      size: BigInt(EICAR.length),
      objectName: "r/1",
      reverseShareId: "link",
      scanStatus: "pending",
    },
  });
  await queue().kick();
  assert.equal((await prisma.reverseShareFile.findUniqueOrThrow({ where: { id: "r1" } })).scanStatus, "infected");
  assert.equal(announced[0].ownerId, "owner");
  assert.equal(announced[0].where, "a receive link");
});

test("it works through what is pending one at a time, oldest first", async () => {
  const files = [];
  for (let i = 0; i < 4; i++) files.push(await addFile(`file ${i}`));
  await queue().kick();
  for (const file of files) assert.equal((await status(file.id)).scanStatus, "clean");
  assert.equal(mostAtOnce, 1);
  assert.equal(clamd.open(), 0);
});

test("a file registered while the queue runs is picked up too", async () => {
  const q = queue();
  const first = await addFile("one");
  const running = q.kick();
  const second = await addFile("two");
  await q.kick();
  await running;
  assert.equal((await status(first.id)).scanStatus, "clean");
  assert.equal((await status(second.id)).scanStatus, "clean");
});

test("a scanner that is down gives status error, not a block, and the queue goes on", async () => {
  const other = await startFakeClamd();
  env.CLAMAV_PORT = String(other.port);
  await other.close();
  const file = await addFile("data");
  await queue().kick();
  const row = await status(file.id);
  assert.equal(row.scanStatus, "error");
  assert.ok(row.scanDetail);
});

test("a scanner that answers with an error, or hangs, gives status error", async () => {
  clamd.mode = "size-limit";
  const first = await addFile("data");
  await queue().kick();
  assert.equal((await status(first.id)).scanStatus, "error");
  assert.match(String((await status(first.id)).scanDetail), /size limit exceeded/);
  clamd.mode = "hang";
  const second = await addFile("data");
  await queue().kick();
  assert.equal((await status(second.id)).scanStatus, "error");
});

test("a file that cannot be read from storage gives status error", async () => {
  const file = await addFile("data");
  objects.delete(`o/${file.id}`);
  await queue().kick();
  assert.equal((await status(file.id)).scanStatus, "error");
  assert.match(String((await status(file.id)).scanDetail), /No such object/);
});

test("a file over the size limit is skipped with the reason and never sent to the scanner", async () => {
  env.CLAMAV_MAX_SIZE_MB = "1";
  const before = clamd.streams.length;
  const file = await addFile("tiny content", { size: 2 * 1024 * 1024 });
  await queue().kick();
  const row = await status(file.id);
  assert.equal(row.scanStatus, "skipped");
  assert.equal(row.scanDetail, "Larger than 1 MB");
  assert.equal(clamd.streams.length, before);
});

test("with CLAMAV_HOST unset the queue does nothing and leaves the rows alone", async () => {
  delete env.CLAMAV_HOST;
  const before = clamd.streams.length;
  const file = await addFile("data");
  const none = await addFile("data", { scanStatus: null });
  await queue().kick();
  assert.equal((await status(file.id)).scanStatus, "pending");
  assert.equal((await status(none.id)).scanStatus, null);
  assert.equal(clamd.streams.length, before);
});

test("a file deleted while it waits does not stop the queue", async () => {
  const gone = await addFile("data");
  const stays = await addFile("more data");
  const q = createScanQueue({
    openObject: async (name) => {
      await prisma.file.deleteMany({ where: { id: gone.id } });
      return Readable.from([Buffer.from(objects.get(name) ?? "")]);
    },
    scan: (source, settings) => scanWithClamd(source, { host: settings.host, port: settings.port, timeoutMs: 1500 }),
    announce: async () => undefined,
  });
  await q.kick();
  assert.equal((await status(stays.id)).scanStatus, "clean");
});

test("an infected file writes a line in the log of its owner, which shows as a notification", async () => {
  await announceInfected({ id: "x1", name: "bad.exe", finding: "Win.Test", ownerId: "owner", where: "your files" });
  const line = await prisma.activityEvent.findFirstOrThrow({ where: { action: "file.infected" } });
  assert.equal(line.ownerId, "owner");
  assert.equal(line.subject, "bad.exe");
  assert.equal(line.detail, "Win.Test");
  const { NOTIFICATION_ACTIONS } = await import("../activity/activity");
  assert.ok(NOTIFICATION_ACTIONS.includes("file.infected"));
});
