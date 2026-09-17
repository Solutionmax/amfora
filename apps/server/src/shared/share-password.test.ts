import assert from "node:assert/strict";
import { test } from "node:test";
import { FastifyRequest } from "fastify";

import { getSharePassword, SHARE_PASSWORD_HEADER } from "./share-password";

const request = (headers: Record<string, unknown>, body?: unknown) => ({ headers, body }) as unknown as FastifyRequest;

test("reads the password from the header", () => {
  assert.equal(getSharePassword(request({ [SHARE_PASSWORD_HEADER]: "letmein" })), "letmein");
});

test("decodes a percent encoded header", () => {
  assert.equal(getSharePassword(request({ [SHARE_PASSWORD_HEADER]: "p%40ss%20word" })), "p@ss word");
});

test("keeps a header that is not valid percent encoding", () => {
  assert.equal(getSharePassword(request({ [SHARE_PASSWORD_HEADER]: "100%" })), "100%");
});

test("takes the first value when the header is repeated", () => {
  assert.equal(getSharePassword(request({ [SHARE_PASSWORD_HEADER]: ["first", "second"] })), "first");
});

test("falls back to the request body", () => {
  assert.equal(getSharePassword(request({}, { password: "from-body" })), "from-body");
});

test("prefers the header over the body", () => {
  assert.equal(getSharePassword(request({ [SHARE_PASSWORD_HEADER]: "header" }, { password: "body" })), "header");
});

test("returns undefined when neither carries a password", () => {
  assert.equal(getSharePassword(request({})), undefined);
  assert.equal(getSharePassword(request({ [SHARE_PASSWORD_HEADER]: "" }, { password: "" })), undefined);
});

test("ignores a body password that is not a string", () => {
  assert.equal(getSharePassword(request({}, { password: 1234 })), undefined);
});
