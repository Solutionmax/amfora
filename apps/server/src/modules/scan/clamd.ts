import net from "node:net";

export interface ClamdOptions {
  host: string;
  port: number;
  /** Longest wait for the connection. */
  connectTimeoutMs?: number;
  /** Longest wait for the whole exchange, upload of the stream included. */
  timeoutMs?: number;
}

export type ScanVerdict = { infected: false } | { infected: true; name: string };

export const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
export const DEFAULT_SCAN_TIMEOUT_MS = 5 * 60_000;
/** One chunk on the wire. clamd takes any size up to its limit; small pieces keep the memory use flat. */
const CHUNK_BYTES = 256 * 1024;

const COMMAND = Buffer.from("zINSTREAM\0");
const END_OF_STREAM = Buffer.alloc(4);

function parseAnswer(raw: string): ScanVerdict {
  const answer = raw.replace(/\0/g, "").trim();
  if (/^stream: OK$/.test(answer)) return { infected: false };
  const found = /^stream: (.+) FOUND$/.exec(answer);
  if (found) return { infected: true, name: found[1] };
  throw new Error(`clamd: ${answer || "empty answer"}`);
}

function write(socket: net.Socket, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => socket.write(data, (error) => (error ? reject(error) : resolve())));
}

/** The pieces of one chunk of the stream, each with its 4 byte big endian length in front. */
function* frames(data: Buffer): Generator<Buffer> {
  for (let start = 0; start < data.length; start += CHUNK_BYTES) {
    const piece = data.subarray(start, start + CHUNK_BYTES);
    const header = Buffer.alloc(4);
    header.writeUInt32BE(piece.length);
    yield Buffer.concat([header, piece]);
  }
}

/**
 * Sends a stream to clamd with INSTREAM and returns what it says. Throws when the scanner cannot
 * be reached, does not answer in time, closes early or answers with an error. The socket is
 * destroyed on every path, and so is the stream when it is not read to the end.
 */
export function scanWithClamd(source: AsyncIterable<Buffer | Uint8Array | string>, options: ClamdOptions) {
  const connectTimeout = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  const totalTimeout = options.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;

  return new Promise<ScanVerdict>((resolve, reject) => {
    const socket = net.createConnection({ host: options.host, port: options.port });
    let answer = "";
    let isDone = false;

    let connectTimer: NodeJS.Timeout | undefined;
    let totalTimer: NodeJS.Timeout | undefined;

    function finish(error: Error | null, verdict?: ScanVerdict) {
      if (isDone) return;
      isDone = true;
      clearTimeout(connectTimer);
      clearTimeout(totalTimer);
      socket.destroy();
      (source as { destroy?: () => void }).destroy?.();
      if (error) reject(error);
      else resolve(verdict as ScanVerdict);
    }

    const finishWithAnswer = () => {
      try {
        finish(null, parseAnswer(answer));
      } catch (error) {
        finish(error as Error);
      }
    };

    connectTimer = setTimeout(() => finish(new Error("clamd did not accept the connection in time")), connectTimeout);
    totalTimer = setTimeout(() => finish(new Error("clamd did not answer in time")), totalTimeout);

    socket.on("error", (error) => finish(error));
    socket.on("data", (data) => {
      answer += data.toString("utf8");
      if (answer.includes("\0")) finishWithAnswer();
    });
    socket.on("close", () => (answer ? finishWithAnswer() : finish(new Error("clamd closed without an answer"))));

    socket.on("connect", () => {
      clearTimeout(connectTimer);
      void (async () => {
        await write(socket, COMMAND);
        for await (const part of source) {
          if (isDone) return;
          const data = typeof part === "string" ? Buffer.from(part) : Buffer.from(part);
          for (const frame of frames(data)) await write(socket, frame);
        }
        if (!isDone) await write(socket, END_OF_STREAM);
      })().catch((error: Error) => finish(error));
    });
  });
}
