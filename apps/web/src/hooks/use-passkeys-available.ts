"use client";

import { useEffect, useState } from "react";

import { getAuthConfig } from "@/http/endpoints";

/**
 * Does the server allow passkeys at this address (password sign in on, secure origin)? False until
 * it has answered and when it cannot be read, so a section that needs it never shows by mistake.
 */
export function usePasskeysAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAuthConfig()
      .then((response) => {
        if (!cancelled) setAvailable((response as any).data.passkeysAvailable === true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return available;
}
