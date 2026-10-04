import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

/** Ids only. Dots and slashes are out, so an id can never climb to another path. */
const ID = /^[A-Za-z0-9_-]{1,64}$/;

export const isProxyId = (value: string) => ID.test(value);

/** Sends a signed-in JSON request on to the API and hands its answer back, never cached. */
export async function forwardJson(req: NextRequest, apiPath: string): Promise<NextResponse> {
  try {
    const hasBody = req.method !== "GET" && req.method !== "DELETE";
    const apiRes = await fetch(`${API_BASE_URL}${apiPath}`, {
      method: req.method,
      headers: {
        ...clientAddressHeaders(req.headers),
        cookie: req.headers.get("cookie") || "",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? await req.text() : undefined,
      redirect: "manual",
    });
    return new NextResponse(await apiRes.text(), {
      status: apiRes.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(`Error proxying ${apiPath}:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
