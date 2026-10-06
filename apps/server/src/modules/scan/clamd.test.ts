import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, test } from "node:test";

import { EICAR, startFakeClamd, type FakeClamd } from "../../../test-support/fake-clamd";
import { scanWithClamd } from "./clamd";

const servers: FakeClamd[] = [];
after(async () => {
  for (const server of servers) await server.close();
});

async function fake(mode: Parameters<typeof startFakeClamd>[0] = "scan") {
  const server = await startFakeClamd(mode);
  servers.push(server);
  return server;
}
const options = (server: FakeClamd, timeoutMs = 3000) => ({
  host: "127.0.0.1",
  port: server.port,
  connectTimeoutMs: 1000,
  timeoutMs,
});
const chunks = (...parts: Array<string | Buffer>) => Readable.from(parts.map((part) => Buffer.from(part)));
const settled = async (server: FakeClamd) => {
  for (let i = 0; i < 50 && server.open() > 0; i++) await new Promise((resolve) => setTimeout(resolve, 20));
  return server.open();
};

test("a clean stream comes back clean, and the whole stream reached clamd", async () => {
  const server = await fake();
  const verdict = await scanWithClamd(chunks("hello ", "world"), options(server));
  assert.deepEqual(verdict, { infected: false });
  assert.deepEqual(server.streams, ["hello world"]);
  assert.equal(await settled(server), 0);
});

test("the EICAR test string is found, also when it is cut in two chunks", async () => {
  const server = await fake();
  const verdict = await scanWithClamd(
    chunks("before ", EICAR.slice(0, 20), EICAR.slice(20), " after"),
    options(server)
  );
  assert.deepEqual(verdict, { infected: true, name: "Eicar-Test-Signature" });
  assert.equal(await settled(server), 0);
});

test("a big stream is sent in pieces and arrives whole", async () => {
  const server = await fake();
  const size = 3 * 1024 * 1024 + 17;
  const verdict = await scanWithClamd(chunks(Buffer.alloc(size)), options(server));
  assert.deepEqual(verdict, { infected: false });
  assert.equal(server.streams[0].length, size);
});

test("an empty stream is clean", async () => {
  const server = await fake();
  assert.deepEqual(await scanWithClamd(Readable.from([]), options(server)), { infected: false });
});

test("a scanner that never answers times out and the socket is closed", async () => {
  const server = await fake("hang");
  await assert.rejects(scanWithClamd(chunks("data"), options(server, 200)), /did not answer in time/);
  assert.equal(await settled(server), 0);
});

test("a scanner that closes the connection without an answer is an error", async () => {
  const server = await fake("close-early");
  await assert.rejects(scanWithClamd(chunks("data"), options(server)));
  assert.equal(await settled(server), 0);
});

test("an error text from clamd is an error, not a verdict", async () => {
  const limit = await fake("size-limit");
  await assert.rejects(scanWithClamd(chunks(Buffer.alloc(2_000_000)), options(limit)), /size limit exceeded/);
  const other = await fake("error");
  await assert.rejects(scanWithClamd(chunks("data"), options(other)), /Something went wrong/);
  assert.equal(await settled(limit), 0);
  assert.equal(await settled(other), 0);
});

test("a scanner that is not there is an error", async () => {
  const server = await fake();
  const options_ = options(server);
  await server.close();
  await assert.rejects(scanWithClamd(chunks("data"), options_));
});

test("a stream that fails halfway is an error and the socket is closed", async () => {
  const server = await fake();
  const broken = new Readable({
    read() {
      this.push(Buffer.from("some"));
      this.destroy(new Error("storage went away"));
    },
  });
  await assert.rejects(scanWithClamd(broken, options(server)), /storage went away/);
  assert.equal(await settled(server), 0);
});
