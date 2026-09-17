import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const url = `${API_BASE_URL}/invite-tokens`;

  const apiRes = await fetch(url, {
    method: "POST",
    headers: {
      ...clientAddressHeaders(req.headers),
      "Content-Type": "application/json",
      cookie: cookieHeader || "",
    },
    body: JSON.stringify({}),
    redirect: "manual",
  });

  const resBody = await apiRes.json();

  const res = NextResponse.json(resBody, {
    status: apiRes.status,
  });

  const setCookie = apiRes.headers.getSetCookie?.() || [];
  if (setCookie.length > 0) {
    res.headers.set("Set-Cookie", setCookie.join(","));
  }

  return res;
}
