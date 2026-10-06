"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  deleteFromTrash,
  emptyTrash,
  listTrash,
  restoreFromTrash,
  type TrashItem,
  type TrashList,
} from "@/http/endpoints/trash";
import { ignoreNotFound, runInTurn } from "@/lib/run-in-turn";

const EMPTYING_POLL_MS = 2000;

/** The trash of the signed-in user, and the three things that can be done with it. */
export function useTrash() {
  const t = useTranslations("trash");
  const [list, setList] = useState<TrashList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await listTrash());
      setHasLoadError(false);
    } catch (error) {
      console.error("Failed to load the trash:", error);
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Emptying runs on the server: look again every couple of seconds, and say how it ended.
  const wasEmptying = useRef(false);
  const isEmptying = list?.emptying.running ?? false;
  useEffect(() => {
    if (isEmptying) {
      wasEmptying.current = true;
      const timer = setTimeout(() => void load(), EMPTYING_POLL_MS);
      return () => clearTimeout(timer);
    }
    if (wasEmptying.current && list) {
      wasEmptying.current = false;
      if (list.emptying.failed > 0) toast.error(t("emptyPartial", { failed: list.emptying.failed }));
      else toast.success(t("emptied"));
    }
  }, [isEmptying, list, load, t]);

  const report = async (total: number, failed: number, done: string, partial: string) => {
    if (failed > 0) toast.error(t(partial, { failed, total }));
    else toast.success(t(done, { count: total }));
    await load();
  };

  const restore = async (items: readonly TrashItem[]) => {
    const { failed } = await runInTurn(items, (item) => restoreFromTrash(item.kind, item.id).catch(ignoreNotFound));
    await report(items.length, failed, "restored", "restorePartial");
  };

  const purge = async (items: readonly TrashItem[]) => {
    const { failed } = await runInTurn(items, (item) => deleteFromTrash(item.kind, item.id).catch(ignoreNotFound));
    await report(items.length, failed, "purged", "purgePartial");
  };

  const empty = async () => {
    try {
      wasEmptying.current = true;
      await emptyTrash();
    } catch (error) {
      wasEmptying.current = false;
      console.error("Failed to empty the trash:", error);
      toast.error(t("purgeError"));
    }
    await load();
  };

  return { list, isLoading, hasLoadError, isEmptying, load, restore, purge, empty };
}
