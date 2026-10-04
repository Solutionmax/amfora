"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { listActivity, type ActivityEvent, type ActivityList } from "@/http/endpoints/activity";
import { kindOf, type ActivityFilter } from "../lib/activity-events";

/** Time without typing before a search is sent. */
const SEARCH_DELAY_MS = 300;

type Overview = Pick<ActivityList, "counts" | "summary" | "placeSource">;

/** The activity list for one filter and search, newest first, with older pages on request. */
export function useActivity() {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  // Answers can arrive out of order while someone types; only the latest question counts.
  const latest = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const ticket = ++latest.current;
    setIsLoading(true);
    setMoreError(false);
    try {
      const list = await listActivity({ kind: kindOf(filter), q: query });
      if (ticket !== latest.current) return;
      setEvents(list.events);
      setHasMore(list.hasMore);
      setOverview({ counts: list.counts, summary: list.summary, placeSource: list.placeSource });
      setLoadError(false);
    } catch (error) {
      if (ticket !== latest.current) return;
      setLoadError(true);
      console.error("Failed to load activity:", error);
    } finally {
      if (ticket === latest.current) setIsLoading(false);
    }
  }, [filter, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    const last = events[events.length - 1];
    if (!last || isLoadingMore) return;
    const ticket = latest.current;
    setIsLoadingMore(true);
    setMoreError(false);
    try {
      const list = await listActivity({ kind: kindOf(filter), q: query, cursor: last.id });
      if (ticket !== latest.current) return;
      setEvents((current) => [...current, ...list.events]);
      setHasMore(list.hasMore);
    } catch (error) {
      if (ticket === latest.current) setMoreError(true);
      console.error("Failed to load older activity:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [events, filter, query, isLoadingMore]);

  return {
    filter,
    setFilter,
    search,
    setSearch,
    query,
    events,
    overview,
    hasMore,
    isLoading,
    isLoadingMore,
    loadError,
    moreError,
    load,
    loadMore,
  };
}
