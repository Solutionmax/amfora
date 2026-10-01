import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const apiRes = await fetch(`${API_BASE_URL}/api-keys/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { ...clientAddressHeaders(req.headers), cookie: req.headers.get("cookie") || "" },
      redirect: "manual",
    });
    return new NextResponse(await apiRes.text(), {
      status: apiRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error proxying API key delete:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
