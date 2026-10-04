import { NextRequest, NextResponse } from "next/server";

import { forwardJson, isProxyId } from "@/lib/proxy-json";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  if (!isProxyId(shareId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return forwardJson(req, `/shares/${shareId}/notifications`);
}
