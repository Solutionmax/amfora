import { NextRequest } from "next/server";

import { forwardJson } from "@/lib/proxy-json";

export async function GET(req: NextRequest) {
  return forwardJson(req, "/notifications/count");
}
