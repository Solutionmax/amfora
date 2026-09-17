import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { SHARE_PASSWORD_HEADER } from "./share-password";

/**
 * A share password may travel to the API in a request header and nowhere else. Two ways to
 * get that wrong have already happened once: putting it in the URL, where every reverse
 * proxy logs it, and echoing it back to the browser in a response header.
 */
const PROXY_DIR = join(process.cwd(), "src/app/api/(proxy)");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return entry === "route.ts" ? [full] : [];
  });
}

const files = routeFiles(PROXY_DIR);

test("there are proxy routes to check", () => {
  assert.ok(files.length > 20, `expected to find proxy routes, found ${files.length}`);
});

test("no proxy route puts a password in a URL", () => {
  const offenders = files.filter((file) => /password=/.test(readFileSync(file, "utf8")));
  assert.deepEqual(offenders, [], "a password in a query string leaks into proxy access logs");
});

test("no proxy route returns the password header to the browser", () => {
  const offenders: string[] = [];

  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (!line.includes("SHARE_PASSWORD_HEADER") || line.includes("req.headers.get")) return;
      for (let back = index; back >= 0; back--) {
        if (lines[back].includes("new NextResponse(")) {
          offenders.push(`${file}:${index + 1}`);
          return;
        }
        if (lines[back].includes("fetch(")) return;
      }
    });
  }

  assert.deepEqual(offenders, [], "a password must never travel back to the browser");
});

test("the header name is the one the server reads", () => {
  assert.equal(SHARE_PASSWORD_HEADER, "x-share-password");
});
