"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { listUserShares } from "@/http/endpoints";
import { Share } from "@/http/endpoints/shares/types";
import { copyText } from "@/lib/clipboard";
import { shareUrl } from "../lib/share-list";

/** Loads the signed-in user's shares, newest first, with an inline error state. */
export function useShares() {
  const t = useTranslations();
  const [shares, setShares] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadShares = useCallback(async () => {
    try {
      const response = await listUserShares();
      const allShares = response.data.shares || [];
      const sortedShares = [...allShares].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setShares(sortedShares);
      setLoadError(false);
    } catch (error) {
      console.error("Failed to load shares:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    setIsLoading(true);
    setLoadError(false);
    void loadShares();
  }, [loadShares]);

  useEffect(() => {
    void loadShares();
  }, [loadShares]);

  const handleCopyLink = async (share: Share) => {
    if (!share.alias?.alias) return;
    try {
      await copyText(shareUrl(window.location.origin, share.alias.alias));
      toast.success(t("shares.messages.linkCopied"));
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  };

  return { shares, isLoading, loadError, retry, loadShares, handleCopyLink };
}
