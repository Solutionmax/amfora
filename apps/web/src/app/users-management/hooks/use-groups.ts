"use client";

import { useCallback, useEffect, useState } from "react";

import { listGroups, type Group } from "@/http/endpoints";

/** The groups of the installation, loaded once and again on request. */
export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    setLoadError(false);
    try {
      const { data } = await listGroups();
      setGroups(data.groups);
    } catch (error) {
      console.error("Error loading groups:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** A group changed by a call that answered with the new state of it. */
  const replace = useCallback((group: Group) => {
    setGroups((current) => current.map((item) => (item.id === group.id ? group : item)));
  }, []);

  return { groups, isLoading, loadError, reload, replace };
}
