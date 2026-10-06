import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

export async function GET(req: NextRequest) {
  try {
    const apiRes = await fetch(`${API_BASE_URL}/shares/shared-with-me`, {
      headers: { ...clientAddressHeaders(req.headers), cookie: req.headers.get("cookie") || "" },
      redirect: "manual",
    });
    return new NextResponse(await apiRes.text(), {
      status: apiRes.status,
      headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error proxying shared with me request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
