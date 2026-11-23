import { NextRequest, NextResponse } from "next/server";

import { mutationBoundary } from "./lib/request-boundary";

export function middleware(request: NextRequest) {
  return mutationBoundary(request) ?? NextResponse.next();
}
export const config = { matcher: "/api/:path*" };
