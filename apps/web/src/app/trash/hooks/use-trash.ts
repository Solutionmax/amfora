"use client";

import { useCallback, useEffect, useState } from "react";
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

  const empty = async (count: number) => {
    try {
      const { failed } = await emptyTrash();
      await report(count, failed, "purged", "purgePartial");
    } catch (error) {
      console.error("Failed to empty the trash:", error);
      toast.error(t("purgeError"));
      await load();
    }
  };

  return { list, isLoading, hasLoadError, load, restore, purge, empty };
}
