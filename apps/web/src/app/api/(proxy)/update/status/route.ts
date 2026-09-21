import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "true" ? "?refresh=true" : "";

  const apiRes = await fetch(`${API_BASE_URL}/update/status${refresh}`, {
    method: "GET",
    headers: {
      ...clientAddressHeaders(req.headers),
      cookie: req.headers.get("cookie") || "",
    },
    redirect: "manual",
  });

  return new NextResponse(await apiRes.text(), {
    status: apiRes.status,
    headers: { "Content-Type": "application/json" },
  });
}
