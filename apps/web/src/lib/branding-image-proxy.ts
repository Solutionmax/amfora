import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

/**
 * Proxies one admin-uploaded branding image (`/app/background`, `/app/share-cover`,
 * `/app/link-preview`). Reading is public: every visitor of a public page and every link
 * unfurler loads it. Writing is admin only, which the API checks on the forwarded cookie.
 */
export function brandingImageProxy(apiPath: string, fallbackType = "image/webp") {
  async function GET() {
    const apiRes = await fetch(`${API_BASE_URL}${apiPath}`, { cache: "no-store" });
    if (!apiRes.ok) {
      return new NextResponse(null, { status: apiRes.status });
    }
    return new NextResponse(apiRes.body, {
      status: 200,
      headers: {
        "Content-Type": apiRes.headers.get("content-type") || fallbackType,
        "Cache-Control": apiRes.headers.get("cache-control") || "public, max-age=300",
      },
    });
  }

  async function forward(req: NextRequest, method: "POST" | "DELETE") {
    const apiRes = await fetch(`${API_BASE_URL}${apiPath}`, {
      method,
      headers: { ...clientAddressHeaders(req.headers), cookie: req.headers.get("cookie") || "" },
      body: method === "POST" ? await req.formData() : undefined,
    });
    return new NextResponse(await apiRes.text(), {
      status: apiRes.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return {
    GET,
    POST: (req: NextRequest) => forward(req, "POST"),
    DELETE: (req: NextRequest) => forward(req, "DELETE"),
  };
}
