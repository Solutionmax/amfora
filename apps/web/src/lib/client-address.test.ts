import assert from "node:assert/strict";
import { test } from "node:test";

import { clientAddressHeaders } from "./share-password";

test("untrusted forwarding headers are never relayed by default", () => {
  const previous = process.env.TRUST_CLIENT_IP_HEADERS;
  delete process.env.TRUST_CLIENT_IP_HEADERS;
  try {
    assert.deepEqual(clientAddressHeaders(new Headers({ "x-forwarded-for": "198.51.100.1" })), {});
  } finally {
    if (previous === undefined) delete process.env.TRUST_CLIENT_IP_HEADERS;
    else process.env.TRUST_CLIENT_IP_HEADERS = previous;
  }
});
