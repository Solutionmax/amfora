import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

/** The background is public: every visitor of a public page loads it. */
export async function GET() {
  const apiRes = await fetch(`${API_BASE_URL}/app/background`, { cache: "no-store" });
  if (!apiRes.ok) {
    return new NextResponse(null, { status: apiRes.status });
  }
  return new NextResponse(apiRes.body, {
    status: 200,
    headers: {
      "Content-Type": apiRes.headers.get("content-type") || "image/webp",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const apiRes = await fetch(`${API_BASE_URL}/app/background`, {
    method: "POST",
    headers: { ...clientAddressHeaders(req.headers), cookie: req.headers.get("cookie") || "" },
    body: formData,
  });
  return new NextResponse(await apiRes.text(), {
    status: apiRes.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(req: NextRequest) {
  const apiRes = await fetch(`${API_BASE_URL}/app/background`, {
    method: "DELETE",
    headers: { ...clientAddressHeaders(req.headers), cookie: req.headers.get("cookie") || "" },
  });
  return new NextResponse(await apiRes.text(), {
    status: apiRes.status,
    headers: { "Content-Type": "application/json" },
  });
}
