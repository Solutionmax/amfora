import { NextRequest } from "next/server";

import { forwardJson } from "@/lib/proxy-json";

export const GET = (req: NextRequest) => forwardJson(req, "/auth/passkeys");
