"use client";

import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  getPasskeyRegistrationOptions,
  listPasskeys,
  removePasskey,
  verifyPasskeyRegistration,
  type Passkey,
} from "@/http/endpoints/auth/passkeys";

/** The ways a password proof fails on the server; everything else is a general failure. */
const PASSWORD_ERRORS = ["Invalid password", "Password verification required"];

/** The browser closes its own prompt when the user backs out: not an error worth a message. */
const isCancelled = (error: unknown) => (error as { name?: string } | null)?.name === "NotAllowedError";

export function usePasskeys(onChange?: () => void) {
  const t = useTranslations();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [toRemove, setToRemove] = useState<Passkey | null>(null);
  /** Shown inside the open dialog, so a wrong password does not vanish with a toast. */
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setPasskeys(await listPasskeys());
      setLoadError(false);
    } catch (error) {
      setLoadError(true);
      console.error("Failed to load passkeys:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const messageFor = useCallback(
    (error: unknown, fallbackKey: string) => {
      const serverMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      return serverMessage && PASSWORD_ERRORS.includes(serverMessage)
        ? t("passkeys.errors.wrongPassword")
        : t(fallbackKey);
    },
    [t]
  );

  const add = useCallback(
    async (name: string, password: string) => {
      try {
        setIsBusy(true);
        setDialogError(null);
        const options = await getPasskeyRegistrationOptions(password);
        const response = await startRegistration({ optionsJSON: options });
        await verifyPasskeyRegistration(response, name);
        setIsAddOpen(false);
        toast.success(t("passkeys.added"));
        await load();
        onChange?.();
      } catch (error) {
        if (!isCancelled(error)) setDialogError(messageFor(error, "passkeys.errors.addFailed"));
      } finally {
        setIsBusy(false);
      }
    },
    [load, messageFor, onChange, t]
  );

  const remove = useCallback(
    async (password: string) => {
      if (!toRemove) return;
      try {
        setIsBusy(true);
        setDialogError(null);
        await removePasskey(toRemove.id, password);
        setToRemove(null);
        toast.success(t("passkeys.removed"));
        await load();
        onChange?.();
      } catch (error) {
        setDialogError(messageFor(error, "passkeys.errors.removeFailed"));
      } finally {
        setIsBusy(false);
      }
    },
    [load, messageFor, onChange, t, toRemove]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    passkeys,
    isLoading,
    loadError,
    isBusy,
    isAddOpen,
    toRemove,
    dialogError,
    load,
    add,
    remove,
    openAdd: () => {
      setDialogError(null);
      setIsAddOpen(true);
    },
    closeAdd: () => setIsAddOpen(false),
    askRemove: (passkey: Passkey) => {
      setDialogError(null);
      setToRemove(passkey);
    },
    closeRemove: () => setToRemove(null),
  };
}
