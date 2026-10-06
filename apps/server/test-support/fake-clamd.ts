import net from "node:net";

/** The EICAR test file, harmless on purpose. Built from two halves so no file holds it in one piece. */
export const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}" + "$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export type FakeClamdMode = "scan" | "hang" | "close-early" | "error" | "size-limit";

export interface FakeClamd {
  port: number;
  /** Streams received so far, as text, one per INSTREAM. */
  streams: string[];
  /** Connections that are still open. */
  open: () => number;
  mode: FakeClamdMode;
  close: () => Promise<void>;
}

/** A clamd that speaks just enough INSTREAM: OK, or FOUND when the stream holds the EICAR string. */
export async function startFakeClamd(mode: FakeClamdMode = "scan"): Promise<FakeClamd> {
  const sockets = new Set<net.Socket>();
  const fake: FakeClamd = {
    port: 0,
    streams: [],
    open: () => sockets.size,
    mode,
    close: () =>
      new Promise((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };

  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => undefined);
    let buffer = Buffer.alloc(0);
    let started = false;
    const received: Buffer[] = [];

    socket.on("data", (data) => {
      if (fake.mode === "hang") return;
      buffer = Buffer.concat([buffer, data]);
      if (!started) {
        if (buffer.length < 10) return;
        if (buffer.subarray(0, 10).toString() !== "zINSTREAM\0") return void socket.end("UNKNOWN COMMAND\0");
        started = true;
        buffer = buffer.subarray(10);
        if (fake.mode === "close-early") return void socket.destroy();
        if (fake.mode === "size-limit") return void socket.end("INSTREAM size limit exceeded. ERROR\0");
        if (fake.mode === "error") return void socket.end("Something went wrong ERROR\0");
      }
      while (buffer.length >= 4) {
        const length = buffer.readUInt32BE(0);
        if (length === 0) {
          const text = Buffer.concat(received).toString("latin1");
          fake.streams.push(text);
          return void socket.end(text.includes(EICAR) ? "stream: Eicar-Test-Signature FOUND\0" : "stream: OK\0");
        }
        if (buffer.length < 4 + length) return;
        received.push(buffer.subarray(4, 4 + length));
        buffer = buffer.subarray(4 + length);
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  fake.port = (server.address() as net.AddressInfo).port;
  return fake;
}
