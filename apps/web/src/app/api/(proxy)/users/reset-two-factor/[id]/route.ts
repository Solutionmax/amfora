import { NextRequest, NextResponse } from "next/server";

import { forwardJson, isProxyId } from "@/lib/proxy-json";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isProxyId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return forwardJson(req, `/users/${id}/two-factor/reset`);
}
