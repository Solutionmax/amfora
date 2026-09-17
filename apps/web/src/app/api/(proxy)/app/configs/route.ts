import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const url = `${API_BASE_URL}/app/configs`;

  const apiRes = await fetch(url, {
    method: "GET",
    headers: {
      ...clientAddressHeaders(req.headers),
      cookie: cookieHeader || "",
    },
    redirect: "manual",
  });

  const resBody = await apiRes.text();
  const res = new NextResponse(resBody, {
    status: apiRes.status,
    headers: {
      "Content-Type": "application/json",
    },
  });

  const setCookie = apiRes.headers.getSetCookie?.() || [];
  if (setCookie.length > 0) {
    res.headers.set("Set-Cookie", setCookie.join(","));
  }

  return res;
}
