import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, afterEach, before, beforeEach, test } from "node:test";

import { EICAR, startFakeClamd, type FakeClamd } from "../../../test-support/fake-clamd";
import { useTestDatabase } from "../../../test-support/test-db";
import { scanWithClamd } from "./clamd";
import type { InfectedFile } from "./infected";
import type { ScanQueueDeps } from "./queue";
import { isScannerUp } from "./scanner-state";

const database = useTestDatabase();

let prisma: typeof import("../../shared/prisma").prisma;
let env: typeof import("../../env").env;
let createScanQueue: typeof import("./queue").createScanQueue;
let requeueUnavailable: typeof import("./queue").requeueUnavailable;
let recordInfectedLine: typeof import("./infected").recordInfectedLine;
let clamd: FakeClamd;

const objects = new Map<string, string>();
const announced: InfectedFile[] = [];
const recorded: InfectedFile[] = [];
let opening = 0;
let mostAtOnce = 0;

const depsOf = (): ScanQueueDeps => ({
  openObject: async (name) => {
    const content = objects.get(name);
    if (content === undefined) throw new Error("No such object");
    opening += 1;
    mostAtOnce = Math.max(mostAtOnce, opening);
    return Readable.from([Buffer.from(content)]).on("close", () => (opening -= 1));
  },
  scan: (source, settings) => scanWithClamd(source, { host: settings.host, port: settings.port, timeoutMs: 1500 }),
  announce: async (files) => void announced.push(...files),
  etagOf: async (name) => `etag-of-${name}`,
  recordLine: async (file) => void recorded.push(file),
});
const queue = () => createScanQueue(depsOf());

before(async () => {
  ({ prisma } = await import("../../shared/prisma"));
  ({ env } = await import("../../env"));
  ({ createScanQueue, requeueUnavailable } = await import("./queue"));
  ({ recordInfectedLine } = await import("./infected"));
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
  recorded.length = 0;
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

test("the activity line is written as soon as the file is settled infected, before the run is over", async () => {
  const bad = await addFile(`x ${EICAR} y`);
  let seenWhileRunning = 0;
  await createScanQueue({
    ...depsOf(),
    announce: async () => undefined,
    recordLine: async (file) => void (seenWhileRunning = recorded.push(file)),
  }).kick();
  assert.equal(seenWhileRunning, 1);
  assert.equal(recorded[0].id, bad.id);
});

test("flush sends what was found so far at once, and the run does not send it a second time", async () => {
  await addFile(`x ${EICAR} y`);
  await addFile("fine");
  const calls: InfectedFile[][] = [];
  let q!: ReturnType<typeof createScanQueue>;
  let scans = 0;
  q = createScanQueue({
    ...depsOf(),
    announce: async (files) => void calls.push(files),
    scan: async (source, settings) => {
      if (++scans === 2) await q.flush(); // the process is told to stop while the second file is scanned
      return scanWithClamd(source, { host: settings.host, port: settings.port, timeoutMs: 1500 });
    },
  });
  await q.kick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 1);
});

test("a provider that gives no ETag still gets its file scanned, without the overwrite check", async () => {
  const file = await addFile("just text");
  await createScanQueue({ ...depsOf(), etagOf: async () => null }).kick();
  const row = await status(file.id);
  assert.equal(row.scanStatus, "clean");
  assert.equal(row.scanEtag, null);
});

test("a scanned file keeps the ETag of the object that was read", async () => {
  const file = await addFile("just text");
  await queue().kick();
  assert.equal((await status(file.id)).scanEtag, `etag-of-o/${file.id}`);
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

test("a scanner that answers with an error gives status error at once", async () => {
  clamd.mode = "size-limit";
  const file = await addFile("data");
  await queue().kick();
  const row = await status(file.id);
  assert.equal(row.scanStatus, "error");
  assert.equal(row.scanDetail, "Scanner could not check the file");
});

async function deadPort() {
  const other = await startFakeClamd();
  const port = String(other.port);
  await other.close();
  return port;
}

test("a scanner that is down keeps the file pending, three tries later it is error, the queue goes on", async () => {
  const port = await deadPort();
  env.CLAMAV_PORT = port;
  const file = await addFile("data");
  const q = createScanQueue({ ...depsOf(), retryDelaysMs: [0, 0, 0] });
  for (let i = 0; i < 3; i++) {
    await q.kick();
    assert.equal((await status(file.id)).scanStatus, "pending", `after try ${i + 1}`);
  }
  await q.kick();
  const row = await status(file.id);
  assert.equal(row.scanStatus, "error");
  assert.equal(row.scanDetail, "Scanner unavailable");
  assert.deepEqual(announced, []);
});

test("the last attempt tells whether the scanner is up", async () => {
  const live = env.CLAMAV_PORT;
  env.CLAMAV_PORT = await deadPort();
  await addFile("data");
  const q = createScanQueue({ ...depsOf(), retryDelaysMs: [0, 0, 0] });
  await q.kick();
  assert.equal(isScannerUp(), false);
  env.CLAMAV_PORT = live;
  await q.kick();
  assert.equal(isScannerUp(), true);
});

test("a scanner that comes back scans what waited", async () => {
  const live = env.CLAMAV_PORT;
  env.CLAMAV_PORT = await deadPort();
  const file = await addFile("data");
  const q = createScanQueue({ ...depsOf(), retryDelaysMs: [0, 0, 0] });
  await q.kick();
  assert.equal((await status(file.id)).scanStatus, "pending");
  env.CLAMAV_PORT = live;
  await q.kick();
  assert.equal((await status(file.id)).scanStatus, "clean");
});

test("a file that waits for its next try is left alone until the time has come", async () => {
  env.CLAMAV_PORT = await deadPort();
  const file = await addFile("data");
  let now = 1_000_000;
  let attempts = 0;
  const base = depsOf();
  const q = createScanQueue({
    ...base,
    scan: (source, settings) => (attempts++, base.scan(source, settings)),
    retryDelaysMs: [30_000, 120_000, 600_000],
    now: () => now,
  });
  await q.kick();
  await q.kick();
  assert.equal(attempts, 1);
  now += 30_000;
  await q.kick();
  assert.equal(attempts, 2);
  assert.equal((await status(file.id)).scanStatus, "pending");
});

test("a scanner that hangs is a timeout: the file stays pending for another try", async () => {
  clamd.mode = "hang";
  const file = await addFile("data");
  await createScanQueue({ ...depsOf(), retryDelaysMs: [0, 0, 0] }).kick();
  assert.equal((await status(file.id)).scanStatus, "pending");
});

test("at start the files that failed for lack of a scanner go back to pending, at most the given number", async () => {
  const gone = [await addFile("a", { scanStatus: "error" }), await addFile("b", { scanStatus: "error" })];
  const readError = await addFile("c", { scanStatus: "error" });
  await prisma.file.updateMany({
    where: { id: { in: gone.map((file) => file.id) } },
    data: { scanDetail: "Scanner unavailable" },
  });
  await prisma.file.update({ where: { id: readError.id }, data: { scanDetail: "Could not be read" } });
  assert.equal(await requeueUnavailable(1), 1);
  assert.equal(await prisma.file.count({ where: { scanStatus: "pending" } }), 1);
  assert.equal(await requeueUnavailable(500), 2);
  assert.equal(await prisma.file.count({ where: { scanStatus: "pending" } }), 3);
  assert.equal((await status(readError.id)).scanStatus, "pending");
});

test("a failing database write after a verdict does not stop the queue, and that file is tried again later", async () => {
  const first = await addFile("one");
  const second = await addFile("two");
  const original = prisma.file.updateMany;
  let failed = false;
  (prisma.file as any).updateMany = (args: any) => {
    if (!failed && args.where?.id === first.id) {
      failed = true;
      return Promise.reject(new Error("database is locked"));
    }
    return original.call(prisma.file, args);
  };
  try {
    await queue().kick();
  } finally {
    (prisma.file as any).updateMany = original;
  }
  assert.equal(failed, true);
  assert.equal((await status(second.id)).scanStatus, "clean");
  assert.equal((await status(first.id)).scanStatus, "pending");
});

test("an announcement that fails does not stop the queue", async () => {
  const bad = await addFile(EICAR);
  const next = await addFile("fine");
  const base = depsOf();
  await createScanQueue({
    ...base,
    announce: async () => {
      throw new Error("mail is down");
    },
  }).kick();
  assert.equal((await status(bad.id)).scanStatus, "infected");
  assert.equal((await status(next.id)).scanStatus, "clean");
});

test("what is found while the queue runs is announced once, when the queue is empty, and never awaited", async () => {
  for (let i = 0; i < 4; i++) await addFile(`${EICAR} ${i}`);
  await addFile("fine");
  const calls: InfectedFile[][] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await createScanQueue({
    ...depsOf(),
    announce: async (files) => {
      calls.push(files);
      await gate;
    },
  }).kick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 4);
  assert.equal(await prisma.file.count({ where: { scanStatus: "pending" } }), 0);
  release();
});

test("while scanning is on the queue kicks itself on a timer", async () => {
  const q = createScanQueue(depsOf());
  const stop = q.startTimer(20);
  try {
    const file = await addFile("late");
    for (let i = 0; i < 100 && (await status(file.id)).scanStatus === "pending"; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.equal((await status(file.id)).scanStatus, "clean");
  } finally {
    stop();
  }
});

test("a file that cannot be read from storage is tried again like an unreachable scanner, then gives status error", async () => {
  const file = await addFile("data");
  objects.delete(`o/${file.id}`);
  let clock = 0;
  const q = createScanQueue({ ...depsOf(), retryDelaysMs: [10, 10, 10], now: () => clock });
  for (let i = 0; i < 3; i++) {
    await q.kick();
    assert.equal((await status(file.id)).scanStatus, "pending", `after try ${i + 1}`);
    clock += 11;
  }
  await q.kick();
  assert.equal((await status(file.id)).scanStatus, "error");
  assert.equal((await status(file.id)).scanDetail, "Could not be read");
});

test("storage that comes back lets the file be scanned", async () => {
  const file = await addFile("data");
  const content = objects.get(`o/${file.id}`)!;
  objects.delete(`o/${file.id}`);
  let clock = 0;
  const q = createScanQueue({ ...depsOf(), retryDelaysMs: [10, 10, 10], now: () => clock });
  await q.kick();
  assert.equal((await status(file.id)).scanStatus, "pending");
  objects.set(`o/${file.id}`, content);
  clock += 11;
  await q.kick();
  assert.equal((await status(file.id)).scanStatus, "clean");
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
    etagOf: async () => "e",
    recordLine: async () => undefined,
  });
  await q.kick();
  assert.equal((await status(stays.id)).scanStatus, "clean");
});

test("an infected file writes a line in the log of its owner, which shows as a notification", async () => {
  await recordInfectedLine({ id: "x1", name: "bad.exe", finding: "Win.Test", ownerId: "owner", where: "your files" });
  const line = await prisma.activityEvent.findFirstOrThrow({ where: { action: "file.infected" } });
  assert.equal(line.ownerId, "owner");
  assert.equal(line.subject, "bad.exe");
  assert.equal(line.detail, "Win.Test");
  const { NOTIFICATION_ACTIONS } = await import("../activity/activity");
  assert.ok(NOTIFICATION_ACTIONS.includes("file.infected"));
});
