import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

const ID = "[A-Za-z0-9_-]{1,64}";

/** The only shapes the API has under /groups, per method. Anything else is a 404 here. */
const SHAPES: Record<string, RegExp[]> = {
  GET: [/^$/, /^pickable$/],
  POST: [/^$/, new RegExp(`^${ID}/members$`)],
  PATCH: [new RegExp(`^${ID}$`)],
  DELETE: [new RegExp(`^${ID}$`), new RegExp(`^${ID}/members/${ID}$`)],
};

type Context = { params: Promise<{ path?: string[] }> };

async function forward(req: NextRequest, { params }: Context) {
  const { path = [] } = await params;
  const name = path.join("/");
  if (!SHAPES[req.method]?.some((shape) => shape.test(name))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const hasBody = req.method === "POST" || req.method === "PATCH";
    const apiRes = await fetch(`${API_BASE_URL}/groups${name ? `/${name}` : ""}`, {
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
      headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error proxying groups request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
