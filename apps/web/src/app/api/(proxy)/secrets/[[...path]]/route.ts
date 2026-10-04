import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

/** Longest path under /secrets: an id and one action. */
const MAX_SEGMENTS = 2;
/** Ids and action names only. Dots are out, so a segment can never climb out of /secrets. */
const SEGMENT = /^[A-Za-z0-9_-]{1,64}$/;

type Context = { params: Promise<{ path?: string[] }> };

/** Everything under /api/secrets goes to the API as is; the sealed text is never looked at here. */
async function forward(req: NextRequest, { params }: Context) {
  const { path = [] } = await params;
  if (path.length > MAX_SEGMENTS || !path.every((segment) => SEGMENT.test(segment)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const hasBody = req.method === "POST";
    const target = [`${API_BASE_URL}/secrets`, ...path].join("/");
    const apiRes = await fetch(target, {
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
    console.error("Error proxying secrets request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export { forward as GET, forward as POST, forward as DELETE };
