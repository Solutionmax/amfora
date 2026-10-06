"use client";

import { useEffect, useState } from "react";

import { listPickableGroups, type PickableGroup } from "@/http/endpoints";

/** The groups a share may be limited to, loaded when `enabled` turns on (a dialog opens). */
export function usePickableGroups(enabled = true) {
  const [groups, setGroups] = useState<PickableGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoading(true);
    listPickableGroups()
      .then(({ data }) => !cancelled && setGroups(data.groups))
      .catch((error) => console.error("Error loading groups:", error))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { groups, isLoading };
}
