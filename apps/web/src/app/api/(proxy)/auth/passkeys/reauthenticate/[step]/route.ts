import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

export async function POST(request: NextRequest, { params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!["options", "verify"].includes(step)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const response = await fetch(
    `${process.env.API_BASE_URL || "http://localhost:3333"}/auth/passkeys/reauthenticate/${step}`,
    {
      method: "POST",
      headers: {
        ...clientAddressHeaders(request.headers),
        cookie: request.headers.get("cookie") || "",
        "content-type": "application/json",
      },
      body: await request.text(),
      redirect: "manual",
    }
  );
  const result = new NextResponse(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
  for (const cookie of response.headers.getSetCookie?.() ?? []) result.headers.append("set-cookie", cookie);
  return result;
}
