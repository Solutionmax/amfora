import assert from "node:assert/strict";
import { test } from "node:test";

import { logoImg, mailLogo } from "./logo";
import { noticeMessage, type Notice } from "./notice";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
);
const uri = `data:image/png;base64,${PNG.toString("base64")}`;

const notice: Notice = {
  subject: "Hello",
  title: "Title",
  text: "Text",
  rows: [["a", "b"]],
  button: { label: "Open", url: "https://example.test/x" },
  footer: "Footer",
};

test("a stored logo becomes an inline attachment with its bytes and type", () => {
  const logo = mailLogo(uri);
  assert.ok(logo);
  assert.equal(logo.attachment.contentType, "image/png");
  assert.equal(logo.attachment.contentDisposition, "inline");
  assert.equal(logo.attachment.cid, logo.cid);
  assert.deepEqual(logo.attachment.content, PNG);
});

test("no logo, an SVG, or something that is not an image data address gives no attachment", () => {
  assert.equal(mailLogo(""), null);
  assert.equal(mailLogo(undefined), null);
  assert.equal(mailLogo("data:image/svg+xml;base64,PHN2Zy8+"), null);
  assert.equal(mailLogo("https://example.test/logo.png"), null);
  assert.equal(mailLogo("data:text/html;base64,PGI+"), null);
  assert.equal(logoImg(null), "");
});

test("the notice carries the logo by cid when a logo is set", () => {
  const logo = mailLogo(uri);
  const message = noticeMessage(notice, { appName: "Acme", logo });
  assert.equal(message.attachments.length, 1);
  assert.ok(message.html.includes(`src="cid:${logo!.cid}"`));
  assert.ok(message.html.includes("Acme"));
});

test("the notice has neither attachment nor cid without a logo, and keeps the name as text", () => {
  const message = noticeMessage(notice, { appName: "Acme", logo: null });
  assert.equal(message.attachments.length, 0);
  assert.ok(!message.html.includes("cid:"));
  assert.ok(!message.html.includes("<img"));
  assert.ok(message.html.includes(">Acme</td>"));
});
