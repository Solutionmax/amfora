import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

async function forward(req: NextRequest, body?: string) {
  try {
    const apiRes = await fetch(`${API_BASE_URL}/api-keys`, {
      method: req.method,
      headers: {
        ...clientAddressHeaders(req.headers),
        cookie: req.headers.get("cookie") || "",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body,
      redirect: "manual",
    });
    return new NextResponse(await apiRes.text(), {
      status: apiRes.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error proxying API keys request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return forward(req);
}

export async function POST(req: NextRequest) {
  return forward(req, await req.text());
}
