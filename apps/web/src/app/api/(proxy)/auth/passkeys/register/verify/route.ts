import { NextRequest } from "next/server";

import { forwardJson } from "@/lib/proxy-json";

export const POST = (req: NextRequest) => forwardJson(req, "/auth/passkeys/register/verify");
