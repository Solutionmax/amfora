import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

/** Response headers worth passing on to an API client. */
const PASSED_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "content-length",
  "location",
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
];

/** Largest request body accepted. Bodies are JSON; uploads go straight to storage. */
const MAX_BODY_BYTES = Number(process.env.API_V1_BODY_LIMIT_KB || 1024) * 1024;

/**
 * The public API for other tools: /api/v1/<path> reaches the same routes the web app uses,
 * authenticated with an API key instead of a session. Cookies are never forwarded, so a
 * browser session cannot be driven through here. The server decides what a key may call.
 */
async function forward(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const authorization = req.headers.get("authorization");
  const apiKey = req.headers.get("x-api-key");
  if (!authorization && !apiKey) {
    return NextResponse.json(
      { error: "An API key is required. Send it as 'Authorization: Bearer <key>'." },
      { status: 401 }
    );
  }

  const { path } = await params;
  if (path.some((segment) => segment === "." || segment === "..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = `${API_BASE_URL}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  // The body is read into memory before the key is checked, so its size has to be known and small.
  if (req.headers.has("transfer-encoding")) {
    return NextResponse.json({ error: "Send the body with a Content-Length." }, { status: 411 });
  }
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  // A DELETE or PATCH often has no body. Announcing JSON without one makes the server refuse it.
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  const hasBody = body !== undefined && body.byteLength > 0;

  try {
    const apiRes = await fetch(url, {
      method: req.method,
      headers: {
        ...clientAddressHeaders(req.headers),
        ...(authorization ? { authorization } : {}),
        ...(apiKey ? { "x-api-key": apiKey } : {}),
        ...(hasBody ? { "content-type": req.headers.get("content-type") || "application/json" } : {}),
      },
      body: hasBody ? body : undefined,
      redirect: "manual",
    });

    const headers = new Headers();
    for (const name of PASSED_RESPONSE_HEADERS) {
      const value = apiRes.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new NextResponse(apiRes.body, { status: apiRes.status, headers });
  } catch (error) {
    console.error("Error proxying API request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
