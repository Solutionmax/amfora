import assert from "node:assert/strict";
import { createServer } from "node:net";
import { test } from "node:test";

import { ConfigService } from "../config/service";
import { EmailService } from "./service";

test("real SMTP delivery keeps reset origin canonical and escapes uploaded metadata", async () => {
  const messages: string[] = [];
  const server = createServer((socket) => {
    let buffer = "";
    let data = false;
    let message = "";
    socket.write("220 localhost ESMTP test\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes("\r\n")) {
        const end = buffer.indexOf("\r\n");
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data) {
          if (line === ".") {
            messages.push(message);
            message = "";
            data = false;
            socket.write("250 accepted\r\n");
          } else message += (line.startsWith("..") ? line.slice(1) : line) + "\r\n";
        } else if (line.startsWith("EHLO")) socket.write("250 localhost\r\n");
        else if (line === "DATA") {
          data = true;
          socket.write("354 send\r\n");
        } else if (line === "QUIT") socket.end("221 bye\r\n");
        else socket.write("250 ok\r\n");
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const originalGet = ConfigService.prototype.getValue;
  const originalUrl = process.env.APP_URL;
  process.env.APP_URL = "https://files.example.test";
  ConfigService.prototype.getValue = async (key: string) =>
    ({
      smtpEnabled: "true",
      smtpHost: "127.0.0.1",
      smtpPort: String(address.port),
      smtpSecure: "none",
      smtpNoAuth: "true",
      smtpFromName: "Amfora",
      smtpFromEmail: "sender@example.test",
      appName: "Amfora",
    })[key] || "";
  try {
    const service = new EmailService();
    await service.sendPasswordResetEmail("fixture@example.test", "synthetic-token", "https://attacker.invalid");
    await service.sendReverseShareBatchFileNotification(
      "fixture@example.test",
      '<img src="x">',
      1,
      "<script>bad</script>.txt",
      "<b>fake</b>"
    );
    assert.equal(messages.length, 2);
    const decoded = messages.map((message) =>
      message.replace(/=\r\n/g, "").replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    );
    assert.match(decoded[0], /https:\/\/files\.example\.test\/reset-password\?token=synthetic-token/);
    assert.doesNotMatch(decoded[0], /attacker\.invalid/);
    const html = decoded[1].split("\r\n\r\n").slice(1).join("\r\n\r\n");
    assert.doesNotMatch(html, /<script>|<img src="x">|<b>fake<\/b>/);
    assert.match(html, /&lt;script&gt;bad&lt;\/script&gt;/);
  } finally {
    ConfigService.prototype.getValue = originalGet;
    if (originalUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalUrl;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
