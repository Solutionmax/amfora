import { NextResponse } from "next/server";

import { fetchAppInfo } from "@/lib/app-info.server";
import { parseDataUri } from "@/lib/data-uri";

/**
 * Serves the uploaded app logo over plain HTTP. Logos are stored as data URIs,
 * which link-preview bots cannot fetch, so og:image points here instead.
 */
export async function GET() {
  const { appLogo } = await fetchAppInfo();

  if (!appLogo) {
    return new NextResponse(null, { status: 404 });
  }

  if (/^https?:\/\//i.test(appLogo)) {
    return NextResponse.redirect(appLogo, 302);
  }

  const parsed = parseDataUri(appLogo);
  if (!parsed) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(parsed.bytes), {
    status: 200,
    headers: { "Content-Type": parsed.contentType, "Cache-Control": "public, max-age=300" },
  });
}
