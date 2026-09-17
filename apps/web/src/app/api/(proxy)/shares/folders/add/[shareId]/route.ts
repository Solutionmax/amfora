import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders, SHARE_PASSWORD_HEADER } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

export async function POST(req: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  const sharePassword = req.headers.get(SHARE_PASSWORD_HEADER);
  const cookieHeader = req.headers.get("cookie");
  const body = await req.text();
  const { shareId } = await params;

  const requestData = JSON.parse(body);

  const itemsBody = {
    files: [],
    folders: requestData.folders || [],
  };

  const url = `${API_BASE_URL}/shares/${shareId}/items`;

  const apiRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sharePassword ? { [SHARE_PASSWORD_HEADER]: sharePassword } : {}),
      ...clientAddressHeaders(req.headers),
      cookie: cookieHeader || "",
      ...(sharePassword ? { [SHARE_PASSWORD_HEADER]: sharePassword } : {}),
      ...clientAddressHeaders(req.headers),
    },
    body: JSON.stringify(itemsBody),
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
