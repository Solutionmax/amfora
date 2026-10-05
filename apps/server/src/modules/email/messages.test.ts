import assert from "node:assert/strict";
import { test } from "node:test";

import { filesReceivedNotice, passwordResetNotice, shareReceivedNotice } from "./messages";
import { noticeMessage } from "./notice";

const brand = { appName: "Acme", logo: null };
const EVIL = '<img src=x onerror="bad()">';

test("the password reset keeps its link and its one hour, in the notice layout", () => {
  const url = "https://files.example.test/reset-password?token=abc%20def";
  const message = noticeMessage(passwordResetNotice(url), brand);
  assert.equal(message.subject, "Reset your password");
  assert.ok(message.html.includes(`href="${url}"`));
  assert.match(message.html, /expire in 1 hour/);
  assert.ok(message.html.includes("max-width: 440px"), "same card as the other notices");
  assert.ok(message.text.includes(url));
  assert.match(message.text, /expire in 1 hour/);
});

test("the share mail names the sender and the share and links to it", () => {
  const link = "https://files.example.test/s/abc";
  const message = noticeMessage(shareReceivedNotice(link, "Holiday photos", "Anita"), brand);
  assert.equal(message.subject, "Shared with you: Holiday photos");
  assert.ok(message.html.includes(`href="${link}"`));
  assert.ok(message.html.includes("Anita shared &quot;Holiday photos&quot; with you."));
  assert.ok(message.text.includes('Anita shared "Holiday photos" with you.'));
  assert.ok(message.text.includes(link));
});

test("the received files mail lists every file and who sent them", () => {
  const message = noticeMessage(filesReceivedNotice("Inbox", 2, ["a.pdf", "b.png"], "Bob"), brand);
  assert.equal(message.subject, "New files received: Inbox");
  assert.ok(message.html.includes("Bob uploaded 2 files to your receive link &quot;Inbox&quot;."));
  for (const file of ["a.pdf", "b.png"]) {
    assert.ok(message.html.includes(`>${file}</td>`));
    assert.ok(message.text.includes(`File: ${file}`));
  }
  const one = noticeMessage(filesReceivedNotice("Inbox", 1, ["a.pdf"], "Bob"), brand);
  assert.equal(one.html.includes("1 files"), false);
  assert.ok(one.html.includes("Bob uploaded a file"));
});

test("text typed by people is escaped wherever it lands in the html", () => {
  const share = noticeMessage(shareReceivedNotice('https://x.test/"><b>', EVIL, EVIL), { appName: EVIL, logo: null });
  const received = noticeMessage(filesReceivedNotice(EVIL, 1, [EVIL], EVIL), { appName: EVIL, logo: null });
  for (const html of [share.html, received.html]) {
    assert.doesNotMatch(html, /<img src=x|<b>/);
    assert.ok(html.includes("&lt;img src=x onerror=&quot;bad()&quot;&gt;"));
  }
});

test("every mail has a plain text part with the title, the text, the facts and the footer", () => {
  const message = noticeMessage(filesReceivedNotice("Inbox", 1, ["a.pdf"], "Bob"), brand);
  assert.ok(message.text.startsWith("Acme\n"));
  assert.ok(message.text.includes("A file was uploaded"));
  assert.ok(message.text.includes("File: a.pdf"));
  assert.ok(message.text.endsWith("You can open and manage these files in your dashboard."));
  assert.ok(!message.text.includes("<"));
});

test("a button only gets a web address; javascript:, data: and the like give no button", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html;base64,PGI+",
    "ftp://x.test/a",
    "//evil.test",
    " https://x.test",
  ]) {
    const message = noticeMessage(shareReceivedNotice(url, "Photos", "Anita"), brand);
    assert.equal(message.html.includes("<a href="), false, url);
    assert.equal(message.html.includes(url), false, url);
    assert.equal(message.text.includes(url), false, url);
    assert.equal(message.text.includes("Open the files"), false, url);
  }
  const ok = noticeMessage(shareReceivedNotice("http://x.test/s/a", "Photos", "Anita"), brand);
  assert.ok(ok.html.includes('href="http://x.test/s/a"'));
});

test("line breaks in names cannot fake lines in the plain text part", () => {
  const message = noticeMessage(
    shareReceivedNotice("https://x.test/s/a", "Photos\nFake: line", "Anita\r\n\r\nBcc: x"),
    brand
  );
  assert.equal(message.text.includes("\nFake: line"), false);
  assert.equal(message.text.includes("\r"), false);
  assert.match(message.text, /Anita Bcc: x shared "Photos Fake: line" with you\./);
  const received = noticeMessage(filesReceivedNotice("Inbox", 1, ["a\nb.txt"], "Bob"), brand);
  assert.ok(received.text.includes("File: a b.txt"));
});

test("names are clipped to 200 characters in the text and in the subject", () => {
  const long = "x".repeat(300);
  const share = noticeMessage(shareReceivedNotice("https://x.test/s/a", long, long), brand);
  assert.ok(share.subject.length <= "Shared with you: ".length + 200);
  assert.equal(share.text.includes("x".repeat(201)), false);
  const received = noticeMessage(filesReceivedNotice(long, 1, [long], long), brand);
  assert.equal(received.text.includes("x".repeat(201)), false);
  assert.ok(received.subject.length <= "New files received: ".length + 200);
});

test("a file name with a comma stays one row", () => {
  const message = noticeMessage(filesReceivedNotice("Inbox", 2, ["a, b.txt", "c.txt"], "Bob"), brand);
  assert.ok(message.text.includes("File: a, b.txt"));
  assert.equal((message.html.match(/>File<\/td>/g) ?? []).length, 2);
});
