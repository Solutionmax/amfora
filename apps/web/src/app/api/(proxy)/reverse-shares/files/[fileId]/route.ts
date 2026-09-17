import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders, SHARE_PASSWORD_HEADER } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

export async function GET(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const sharePassword = req.headers.get(SHARE_PASSWORD_HEADER);
  const cookieHeader = req.headers.get("cookie");
  const { fileId } = await params;
  const url = `${API_BASE_URL}/reverse-shares/files/${fileId}/download`;

  const apiRes = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(sharePassword ? { [SHARE_PASSWORD_HEADER]: sharePassword } : {}),
      ...clientAddressHeaders(req.headers),
      cookie: cookieHeader || "",
      ...(sharePassword ? { [SHARE_PASSWORD_HEADER]: sharePassword } : {}),
      ...clientAddressHeaders(req.headers),
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const sharePassword = req.headers.get(SHARE_PASSWORD_HEADER);
  const cookieHeader = req.headers.get("cookie");
  const { fileId } = await params;
  const body = await req.json();
  const url = `${API_BASE_URL}/reverse-shares/files/${fileId}`;

  const apiRes = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(sharePassword ? { [SHARE_PASSWORD_HEADER]: sharePassword } : {}),
      ...clientAddressHeaders(req.headers),
      cookie: cookieHeader || "",
      ...(sharePassword ? { [SHARE_PASSWORD_HEADER]: sharePassword } : {}),
      ...clientAddressHeaders(req.headers),
    },
    body: JSON.stringify(body),
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const sharePassword = req.headers.get(SHARE_PASSWORD_HEADER);
  const cookieHeader = req.headers.get("cookie");
  const { fileId } = await params;
  const url = `${API_BASE_URL}/reverse-shares/files/${fileId}`;

  const apiRes = await fetch(url, {
    method: "DELETE",
    headers: {
      cookie: cookieHeader || "",
      ...(sharePassword ? { [SHARE_PASSWORD_HEADER]: sharePassword } : {}),
      ...clientAddressHeaders(req.headers),
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
