"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { sealDraft, type SecretDraft } from "@/components/secrets/secret-fields";
import {
  createSecret,
  deleteSecret,
  getSecretLimits,
  listSecrets,
  type Secret,
  type SecretLimits,
} from "@/http/endpoints/secrets";
import { secretLink } from "../lib/secret-options";

/** The link of the secret just made. It exists only in this tab; the server never had the key. */
export interface FreshLink {
  id: string;
  link: string;
}

export function useSecrets() {
  const t = useTranslations("secrets");
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [limits, setLimits] = useState<SecretLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [fresh, setFresh] = useState<FreshLink | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, allLimits] = await Promise.all([listSecrets(), getSecretLimits()]);
      setSecrets(list.secrets);
      setLimits(allLimits.signedIn);
      setLoadError(false);
    } catch (error) {
      setLoadError(true);
      console.error("Failed to load secrets:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Seals in the browser, stores the sealed text, and returns the id of the new secret. */
  const create = useCallback(
    async (draft: SecretDraft): Promise<string | null> => {
      try {
        setIsBusy(true);
        const { request, linkKey } = await sealDraft(draft);
        const { id } = await createSecret(request);
        setFresh({ id, link: secretLink(window.location.origin, id, linkKey) });
        await load();
        return id;
      } catch (error) {
        toast.error(t("createFailed"));
        console.error("Failed to create secret:", error);
        return null;
      } finally {
        setIsBusy(false);
      }
    },
    [load, t]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setIsBusy(true);
        await deleteSecret(id);
        toast.success(t("deleted"));
        setFresh((current) => (current?.id === id ? null : current));
        await load();
        return true;
      } catch (error) {
        toast.error(t("deleteFailed"));
        console.error("Failed to delete secret:", error);
        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [load, t]
  );

  return { secrets, limits, isLoading, loadError, isBusy, fresh, load, create, remove };
}
