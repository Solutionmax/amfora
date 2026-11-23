import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Validate the HTTP authority independently of Next's internal standalone URL. */
function authorityOrigin(authority: string, protocol: string): string {
  if (!authority || /[\s/\\?#@,]/.test(authority)) throw new Error("Invalid request host");
  const url = new URL(`${protocol}//${authority}`);
  if (!url.hostname || url.username || url.password) throw new Error("Invalid request host");
  return url.origin;
}

/** Browser mutation requests must come from the address displayed in that browser. */
export function mutationBoundary(request: NextRequest): NextResponse | null {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null;
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (origin !== parsed.origin) throw new Error("Invalid origin serialization");
      // Browsers fix Host to the target authority; never use caller-supplied forwarding headers.
      const host = request.headers.get("host") || new URL(request.url).host;
      const direct = authorityOrigin(host, new URL(request.url).protocol);
      const canonical = process.env.APP_URL ? new URL(process.env.APP_URL) : null;
      const configured =
        canonical && authorityOrigin(host, canonical.protocol) === canonical.origin ? canonical.origin : null;
      if (origin !== direct && origin !== configured)
        return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
  }
  const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  // Login/public JSON proxies must not convert safelisted HTML forms into JSON.
  if (type && ["text/plain", "application/x-www-form-urlencoded"].includes(type))
    return NextResponse.json({ error: "JSON content type required" }, { status: 415 });
  if (request.nextUrl.pathname === "/api/auth/login" && type !== "application/json")
    return NextResponse.json({ error: "JSON content type required" }, { status: 415 });
  return null;
}
