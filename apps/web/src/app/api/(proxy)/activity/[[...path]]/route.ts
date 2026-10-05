import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

/** The list itself, or its export as a file (and DELETE on the list below). Nothing else lives under /activity. */
const PATHS: readonly string[] = ["", "export"];
/** The only query fields the API knows; anything else is dropped here. */
const QUERY_FIELDS: readonly string[] = ["kind", "q", "subjectId", "before"];

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, { params }: Context) {
  const { path = [] } = await params;
  const name = path.join("/");
  if (!PATHS.includes(name)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const query = new URLSearchParams();
  for (const field of QUERY_FIELDS) {
    const value = req.nextUrl.searchParams.get(field);
    if (value) query.set(field, value);
  }

  try {
    const target = `${API_BASE_URL}/activity${name ? `/${name}` : ""}${query.size > 0 ? `?${query}` : ""}`;
    const apiRes = await fetch(target, {
      headers: { ...clientAddressHeaders(req.headers), cookie: req.headers.get("cookie") || "" },
      redirect: "manual",
    });

    const headers = new Headers({ "Cache-Control": "no-store" });
    // The export is a file: its type and file name pass through as the API set them.
    headers.set("Content-Type", apiRes.headers.get("content-type") ?? "application/json");
    const disposition = apiRes.headers.get("content-disposition");
    if (disposition) headers.set("Content-Disposition", disposition);

    return new NextResponse(apiRes.body, { status: apiRes.status, headers });
  } catch (error) {
    console.error("Error proxying activity request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Clearing the log (administrators only; the API decides). Only the collection itself can be cleared. */
export async function DELETE(req: NextRequest, { params }: Context) {
  const { path = [] } = await params;
  if (path.length > 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const apiRes = await fetch(`${API_BASE_URL}/activity`, {
      method: "DELETE",
      headers: { ...clientAddressHeaders(req.headers), cookie: req.headers.get("cookie") || "" },
      redirect: "manual",
    });
    return new NextResponse(apiRes.body, {
      status: apiRes.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": apiRes.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Error proxying activity clear:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
