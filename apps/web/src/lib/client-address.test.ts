import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { clientAddressHeaders } from "./share-password";

const headers = (values: Record<string, string>) => new Headers(values);

afterEach(() => {
  delete process.env.TRUST_CLIENT_IP_HEADERS;
});

test("nothing is passed on unless the operator opted in", () => {
  assert.deepEqual(
    clientAddressHeaders(headers({ "x-forwarded-for": "203.0.113.9", "cf-connecting-ip": "203.0.113.9" })),
    {}
  );
});

test("behind a plain proxy the forwarded address goes through as it is", () => {
  process.env.TRUST_CLIENT_IP_HEADERS = "true";
  assert.deepEqual(clientAddressHeaders(headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.2" })), {
    "x-forwarded-for": "203.0.113.9, 10.0.0.2",
  });
  assert.deepEqual(clientAddressHeaders(headers({})), {});
});

test("behind Cloudflare the visitor it names wins over the hops in between", () => {
  process.env.TRUST_CLIENT_IP_HEADERS = "true";
  assert.deepEqual(
    clientAddressHeaders(headers({ "x-forwarded-for": "192.168.18.161", "cf-connecting-ip": " 198.51.100.7 " })),
    { "x-forwarded-for": "198.51.100.7", "cf-connecting-ip": "198.51.100.7" }
  );
});
