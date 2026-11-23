import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";

import apiInstance from "@/config/api";
import { usePasskeysAvailable } from "./use-passkeys-available";

function AvailabilityProbe() {
  return usePasskeysAvailable();
}

async function availability(secure: boolean, credentialAPI: boolean) {
  // Exercise the actual hook/effect and HTTP response without a DOM renderer.
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const previous = internals.H;
  const oldWindow = (globalThis as any).window;
  const oldAdapter = apiInstance.defaults.adapter;
  let available = false;
  const effects: (() => void)[] = [];
  internals.H = {
    useState: () => [
      false,
      (value: boolean) => {
        available = value;
      },
    ],
    useEffect: (effect: () => void) => effects.push(effect),
  };
  (globalThis as any).window = {
    isSecureContext: secure,
    ...(credentialAPI ? { PublicKeyCredential: function () {} } : {}),
  };
  apiInstance.defaults.adapter = async (config) => ({
    data: { passkeysAvailable: true },
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  });
  try {
    AvailabilityProbe();
    effects.forEach((effect) => effect());
    await new Promise((resolve) => setImmediate(resolve));
    return available;
  } finally {
    internals.H = previous;
    (globalThis as any).window = oldWindow;
    apiInstance.defaults.adapter = oldAdapter;
  }
}
test("insecure LAN browser cannot advertise passkeys even when canonical server origin is HTTPS", async () =>
  assert.equal(await availability(false, true), false));
test("secure browser with WebAuthn can advertise server-approved passkeys", async () =>
  assert.equal(await availability(true, true), true));
test("browser without WebAuthn cannot advertise passkeys", async () =>
  assert.equal(await availability(true, false), false));
