import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

export async function GET(req: NextRequest) {
  const apiRes = await fetch(`${API_BASE_URL}/update/progress`, {
    method: "GET",
    headers: {
      ...clientAddressHeaders(req.headers),
      cookie: req.headers.get("cookie") || "",
    },
    redirect: "manual",
    cache: "no-store",
  });

  return new NextResponse(await apiRes.text(), {
    status: apiRes.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
