"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { createApiKey, deleteApiKey, listApiKeys } from "@/http/endpoints";
import type { ApiKey, CreateApiKeyRequest } from "@/http/endpoints/api-keys/types";

export function useApiKeys() {
  const t = useTranslations();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  /** The key just created. Kept only until its dialog closes; the server never returns it again. */
  const [newToken, setNewToken] = useState<string | null>(null);
  const [keyToRemove, setKeyToRemove] = useState<ApiKey | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setKeys((await listApiKeys()).apiKeys);
      setLoadError(false);
    } catch (error) {
      setLoadError(true);
      console.error("Failed to load API keys:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(
    async (data: CreateApiKeyRequest) => {
      try {
        setIsBusy(true);
        const { token } = await createApiKey(data);
        setIsCreateOpen(false);
        setNewToken(token);
        await load();
      } catch (error) {
        toast.error(t("profile.apiKeys.createFailed"));
        console.error("Failed to create API key:", error);
      } finally {
        setIsBusy(false);
      }
    },
    [load, t]
  );

  const confirmRemove = useCallback(async () => {
    if (!keyToRemove) return;
    try {
      setIsBusy(true);
      await deleteApiKey(keyToRemove.id);
      toast.success(t("profile.apiKeys.removed"));
      setKeyToRemove(null);
      await load();
    } catch (error) {
      toast.error(t("profile.apiKeys.removeFailed"));
      console.error("Failed to remove API key:", error);
    } finally {
      setIsBusy(false);
    }
  }, [keyToRemove, load, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    keys,
    isLoading,
    loadError,
    isBusy,
    isCreateOpen,
    setIsCreateOpen,
    newToken,
    setNewToken,
    keyToRemove,
    setKeyToRemove,
    load,
    create,
    confirmRemove,
  };
}
