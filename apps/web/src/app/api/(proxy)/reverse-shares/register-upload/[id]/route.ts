import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders, SHARE_PASSWORD_HEADER } from "@/lib/share-password";

export const dynamic = "force-dynamic";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const password = req.headers.get(SHARE_PASSWORD_HEADER);
  const body = await req.text();
  const { id } = await params;

  const url = `${API_BASE_URL}/reverse-shares/${id}/register-file`;

  const apiRes = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(password ? { [SHARE_PASSWORD_HEADER]: password } : {}),
      ...clientAddressHeaders(req.headers),
    },
    body,
    redirect: "manual",
  });

  const resBody = await apiRes.text();

  const res = new NextResponse(resBody, {
    status: apiRes.status,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return res;
}
