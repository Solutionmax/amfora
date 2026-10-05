import { NextRequest, NextResponse } from "next/server";

import { clientAddressHeaders } from "@/lib/share-password";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

const KINDS: readonly string[] = ["file", "folder"];
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

type Context = { params: Promise<{ path?: string[] }> };

/** Only the shapes the API has: /trash, /trash/:kind/:id and /trash/:kind/:id/restore. */
function isKnownPath(path: string[], last?: string): boolean {
  if (path.length === 0) return last === undefined;
  const [kind, id, action, ...rest] = path;
  if (rest.length > 0 || !KINDS.includes(kind) || !ID_PATTERN.test(id ?? "")) return false;
  return last === "restore" ? action === "restore" : action === undefined;
}

async function forward(req: NextRequest, { params }: Context, method: string, last?: string) {
  const { path = [] } = await params;
  if (!isKnownPath(path, last)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const apiRes = await fetch(`${API_BASE_URL}/trash${path.length > 0 ? `/${path.join("/")}` : ""}`, {
      method,
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
    console.error("Error proxying trash request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = (req: NextRequest, context: Context) => forward(req, context, "GET");

/** Restore: /trash/:kind/:id/restore. */
export const POST = (req: NextRequest, context: Context) => forward(req, context, "POST", "restore");

/** Delete for good (/trash/:kind/:id) or empty the trash (/trash). */
export const DELETE = (req: NextRequest, context: Context) => forward(req, context, "DELETE");
