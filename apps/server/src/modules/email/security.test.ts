import assert from "node:assert/strict";
import { createServer } from "node:net";
import { test } from "node:test";

import { ConfigService } from "../config/service";
import { EmailService } from "./service";

/** The decoded text and html parts of a raw message. */
function parts(raw: string): { html: string; text: string } {
  const decode = (value: string) =>
    value.replace(/=\r\n/g, "").replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const find = (type: string) => {
    const part = raw.split(/\r\n--/).find((chunk) => new RegExp(`^Content-Type: ${type}`, "im").test(chunk)) ?? "";
    return decode(part.split("\r\n\r\n").slice(1).join("\r\n\r\n"));
  };
  return { html: find("text/html"), text: find("text/plain") };
}

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
    const evil = "<script>bad</script>";
    await service.sendReverseShareBatchFileNotification(
      "fixture@example.test",
      '<img src="x">',
      1,
      `${evil}.txt`,
      "<b>fake</b>"
    );
    await service.sendShareNotification("fixture@example.test", "https://files.example.test/s/x", evil, "<i>me</i>");
    assert.equal(messages.length, 3);
    const [reset, received, shared] = messages.map(parts);

    assert.match(reset.html, /https:\/\/files\.example\.test\/reset-password\?token=synthetic-token/);
    assert.match(reset.text, /https:\/\/files\.example\.test\/reset-password\?token=synthetic-token/);
    assert.doesNotMatch(reset.html + reset.text, /attacker\.invalid/);

    for (const { html } of [received, shared]) {
      assert.doesNotMatch(html, /<script>|<img src="x">|<b>fake<\/b>|<i>me<\/i>/);
      assert.match(html, /&lt;script&gt;/);
    }
    assert.match(received.html, /&lt;script&gt;bad&lt;\/script&gt;\.txt/);
    assert.match(received.html, /&lt;b&gt;fake&lt;\/b&gt;/);
    assert.match(shared.html, /&lt;i&gt;me&lt;\/i&gt;/);
    assert.match(received.text, /<script>bad<\/script>\.txt/, "the text part is plain text, nothing to escape");
  } finally {
    ConfigService.prototype.getValue = originalGet;
    if (originalUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalUrl;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
