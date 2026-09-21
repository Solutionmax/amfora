import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

async function forward(req: NextRequest, method: "PUT" | "DELETE") {
  const apiRes = await fetch(`${API_BASE_URL}/app/brandpack`, {
    method,
    headers: {
      ...clientAddressHeaders(req.headers),
      cookie: req.headers.get("cookie") || "",
      // A DELETE carries no body; a JSON content type on an empty body is a 400 in Fastify.
      ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "PUT" ? await req.text() : undefined,
  });
  return new NextResponse(await apiRes.text(), {
    status: apiRes.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function PUT(req: NextRequest) {
  return forward(req, "PUT");
}

export async function DELETE(req: NextRequest) {
  return forward(req, "DELETE");
}
