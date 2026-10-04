import { NextRequest, NextResponse } from "next/server";

import { forwardJson, isProxyId } from "@/lib/proxy-json";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ reverseShareId: string }> }) {
  const { reverseShareId } = await params;
  if (!isProxyId(reverseShareId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return forwardJson(req, `/reverse-shares/${reverseShareId}/notifications`);
}
