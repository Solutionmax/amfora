import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { AxiosHeaders, isAxiosError, type AxiosResponse } from "axios";

import { getCurrentUser } from "../http/endpoints/auth";
import type { GetCurrentUserResult } from "../http/endpoints/auth/types";
import { SHARE_PASSWORD_HEADER } from "../lib/share-password";
import apiInstance from "./api";

/** Checked by tsc, never executed: the generated generic pattern and direct calls share one full-response client. */
export async function clientTypeContract() {
  function generatedEndpoint<TData = AxiosResponse<{ id: string }>>(): Promise<TData> {
    return apiInstance.get("/contract");
  }
  const contextual: AxiosResponse<{ id: string }> = await generatedEndpoint();
  const direct = await apiInstance.get<{ id: string }>("/contract");
  const id: string = direct.data.id;
  // @ts-expect-error The client returns the full response, never the unwrapped payload.
  const unwrapped: string = direct.id;
  const binary: AxiosResponse<Uint8Array> = await apiInstance.get<Uint8Array>("/bytes", {
    responseType: "arraybuffer",
  });
  // @ts-expect-error Explicit binary response data does not become a string or any.
  const text: string = binary.data;
  const defaultEndpoint: GetCurrentUserResult = await getCurrentUser();
  const override: AxiosResponse<{ custom: number }> = await generatedEndpoint<AxiosResponse<{ custom: number }>>();
  const custom: number = override.data.custom;
  const posted = await apiInstance.post<
    { id: string },
    AxiosResponse<{ id: string }, { name: string }>,
    { name: string }
  >("/contract", { name: "example" });
  const body: { name: string } | undefined = posted.config.data;
  // @ts-expect-error Explicit request-body contracts remain enforced.
  await apiInstance.post<{ id: string }, AxiosResponse<{ id: string }>, { name: string }>("/contract", { name: 42 });
  const callable: AxiosResponse<{ id: string }> = await apiInstance<{ id: string }>({ url: "/contract" });
  return { contextual, id, unwrapped, binary, text, defaultEndpoint, custom, body, callable };
}

test("Axios HTTP adapter keeps full responses, binary data and share-password interceptor", async () => {
  let seenUrl = "",
    seenPassword = "",
    seenType = "";
  const server = createServer((request, response) => {
    seenUrl = request.url!;
    seenPassword = String(request.headers[SHARE_PASSWORD_HEADER] ?? "");
    seenType = String(request.headers["content-type"] ?? "");
    response.setHeader("x-contract", "full-response");
    if (request.url?.startsWith("/bytes")) {
      response.setHeader("content-type", "application/octet-stream");
      response.end(Buffer.from([0, 255, 42]));
    } else if (request.url === "/requires-setup") {
      response.statusCode = 403;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ code: "TWO_FACTOR_SETUP_REQUIRED" }));
    } else {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ user: { id: "adapter-member" } }));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const previous = apiInstance.defaults.baseURL;
  apiInstance.defaults.baseURL = `http://127.0.0.1:${address.port}`;
  try {
    const response = await getCurrentUser({
      adapter: "http",
      params: { password: "synthetic share phrase", keep: "yes" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.user.id, "adapter-member");
    assert.equal(response.headers["x-contract"], "full-response");
    assert.ok(response.headers instanceof AxiosHeaders);
    assert.equal(seenUrl, "/api/auth/me?keep=yes");
    assert.equal(seenPassword, encodeURIComponent("synthetic share phrase"));
    assert.equal(seenType, "application/json");
    assert.equal(response.config.withCredentials, true);
    assert.equal(response.config.timeout, 120000);
    const binary = await apiInstance.get<Buffer>("/bytes", { adapter: "http", responseType: "arraybuffer" });
    assert.deepEqual(binary.data, Buffer.from([0, 255, 42]));
    assert.equal(binary.status, 200);
    assert.equal(binary.headers["x-contract"], "full-response");
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    let assigned = "";
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          pathname: "/dashboard",
          search: "?folder=sample",
          assign: (value: string) => {
            assigned = value;
          },
        },
      },
    });
    try {
      await assert.rejects(
        apiInstance.get("/requires-setup", { adapter: "http" }),
        (error) =>
          isAxiosError<{ code: string }>(error) &&
          error.response?.status === 403 &&
          error.response.data.code === "TWO_FACTOR_SETUP_REQUIRED"
      );
      assert.equal(assigned, "/two-factor-setup?next=%2Fdashboard%3Ffolder%3Dsample");
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
      else Reflect.deleteProperty(globalThis, "window");
    }
  } finally {
    apiInstance.defaults.baseURL = previous;
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
