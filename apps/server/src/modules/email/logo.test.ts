import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";

import { logoImg, mailLogo } from "./logo";
import { noticeMessage, type Notice } from "./notice";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** What the app stores after an upload: a WebP data address. */
async function storedWebp(width = 100, height = 100, color = "#0079d2") {
  const bytes = await sharp({ create: { width, height, channels: 3, background: color } })
    .webp()
    .toBuffer();
  return `data:image/webp;base64,${bytes.toString("base64")}`;
}

const notice: Notice = {
  subject: "Hello",
  title: "Title",
  text: "Text",
  rows: [["a", "b"]],
  button: { label: "Open", url: "https://example.test/x" },
  footer: "Footer",
};

test("a stored WebP logo becomes an inline PNG attachment, about 32 px high", async () => {
  const logo = await mailLogo(await storedWebp());
  assert.ok(logo);
  assert.equal(logo.attachment.contentType, "image/png");
  assert.equal(logo.attachment.filename, "logo.png");
  assert.equal(logo.attachment.contentDisposition, "inline");
  assert.equal(logo.attachment.cid, logo.cid);
  assert.deepEqual(logo.attachment.content.subarray(0, 8), PNG_SIGNATURE);
  assert.equal(logo.height, 32);
  assert.equal(logo.width, 32);
  assert.equal((await sharp(logo.attachment.content).metadata()).format, "png");
});

test("a wide logo keeps its proportions in the width and height of the tag", async () => {
  const logo = await mailLogo(await storedWebp(200, 100, "#ff0000"));
  assert.ok(logo);
  assert.equal(logo.width, 64);
  assert.match(logoImg(logo, "Acme"), /width="64" height="32"/);
});

test("the converted bytes are cached by the stored value", async () => {
  const stored = await storedWebp(100, 100, "#00aa44");
  const first = await mailLogo(stored);
  const second = await mailLogo(stored);
  assert.ok(first && second);
  assert.equal(first.attachment.content, second.attachment.content, "same buffer, not converted again");
  assert.notEqual(first.cid, second.cid, "every mail still gets its own content id");
  const other = await mailLogo(await storedWebp(100, 100, "#aa0044"));
  assert.notDeepEqual(other?.attachment.content, first.attachment.content);
});

test("no logo, an SVG, something that is not an image, or a broken image gives no attachment", async () => {
  assert.equal(await mailLogo(""), null);
  assert.equal(await mailLogo(undefined), null);
  assert.equal(await mailLogo("data:image/svg+xml;base64,PHN2Zy8+"), null);
  assert.equal(await mailLogo("https://example.test/logo.png"), null);
  assert.equal(await mailLogo("data:text/html;base64,PGI+"), null);
  const log = console.error;
  console.error = () => {};
  try {
    assert.equal(await mailLogo("data:image/webp;base64,AAAA"), null);
  } finally {
    console.error = log;
  }
  assert.equal(logoImg(null, "Acme"), "");
});

test("an empty, oversized, malformed or header-carrying logo gives no logo and never throws", async () => {
  const log = console.error;
  console.error = () => {};
  try {
    const big = Buffer.alloc(256 * 1024 + 1, 1).toString("base64");
    for (const value of [
      "data:image/png;base64,",
      "data:image/png;base64,====",
      `data:image/png;base64,${big}`,
      "data:image/png;base64,!!!not base64!!!",
      "data:image/png;base64,AAAA",
      `data:image/png;base64,${Buffer.from("this is not an image").toString("base64")}`,
      "data:image/png;base64,AAA\r\nBcc: x",
    ]) {
      assert.equal(await mailLogo(value), null, value.slice(0, 40));
    }
  } finally {
    console.error = log;
  }
});

test("the header shows the logo, with the app name as alt, in front of the name", async () => {
  const logo = await mailLogo(await storedWebp());
  const message = noticeMessage(notice, { appName: 'Ac"me', logo });
  assert.equal(message.attachments.length, 1);
  assert.ok(message.html.includes(`src="cid:${logo!.cid}"`));
  assert.ok(message.html.includes('alt="Ac&quot;me"'));
  assert.match(message.html, /<img [^>]*height="32"[^>]*>Ac&quot;me<\/td>/);
});

test("without a logo the header has neither attachment nor cid, only the name", () => {
  const message = noticeMessage(notice, { appName: "Acme", logo: null });
  assert.equal(message.attachments.length, 0);
  assert.ok(!message.html.includes("cid:"));
  assert.ok(!message.html.includes("<img"));
  assert.ok(message.html.includes(">Acme</td>"));
});

test("a logo that fails to convert is converted once, also for mails sent at the same time", async () => {
  const stored = `data:image/png;base64,${Buffer.from("this is not an image either").toString("base64")}`;
  const log = console.error;
  let logged = 0;
  console.error = () => {
    logged += 1;
  };
  try {
    const [one, two] = await Promise.all([mailLogo(stored), mailLogo(stored)]);
    const three = await mailLogo(stored);
    assert.deepEqual([one, two, three], [null, null, null]);
  } finally {
    console.error = log;
  }
  assert.equal(logged, 1, "one conversion, one failure, remembered");
});

test("an image with too many pixels gives no logo", async () => {
  const huge = await sharp({ create: { width: 3000, height: 3000, channels: 3, background: "#fff" } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  assert.ok(huge.length < 256 * 1024, "small on disk, large in pixels");
  const log = console.error;
  console.error = () => {};
  try {
    assert.equal(await mailLogo(`data:image/png;base64,${huge.toString("base64")}`), null);
  } finally {
    console.error = log;
  }
});
