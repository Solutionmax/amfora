import { NextRequest } from "next/server";

import { forwardJson } from "@/lib/proxy-json";

export async function POST(req: NextRequest) {
  return forwardJson(req, "/notifications/seen");
}
