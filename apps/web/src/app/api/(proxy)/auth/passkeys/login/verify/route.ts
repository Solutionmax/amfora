import { NextRequest, NextResponse } from "next/server";

import { getClientHeaders } from "@/lib/proxy-utils";
import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

/** Like the password sign in: the answer carries the session cookie, so it has to be passed on. */
export async function POST(req: NextRequest) {
  try {
    const apiRes = await fetch(`${API_BASE_URL}/auth/passkeys/login/verify`, {
      method: "POST",
      headers: {
        ...clientAddressHeaders(req.headers),
        "Content-Type": "application/json",
        ...getClientHeaders(req),
      },
      body: await req.text(),
      redirect: "manual",
    });

    const res = new NextResponse(await apiRes.text(), {
      status: apiRes.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
    for (const cookie of apiRes.headers.getSetCookie?.() || []) res.headers.append("Set-Cookie", cookie);
    return res;
  } catch (error) {
    console.error("Error proxying passkey sign in:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
