"use client";

import { useState, type FormEvent } from "react";
import { IconCopy, IconKey } from "@tabler/icons-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { LineList, LineRow } from "@/components/ui/line-list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiKey, ApiKeyScope, CreateApiKeyRequest } from "@/http/endpoints/api-keys/types";
import { copyText } from "@/lib/clipboard";
import { useApiKeys } from "../hooks/use-api-keys";
import { quietLink } from "./trusted-devices";
import { RemoveDevicesDialog } from "./two-factor-dialogs";

/** Lifetimes offered for a new key, in days. "never" sends no end date. */
const EXPIRY_OPTIONS = ["never", "30", "90", "365"] as const;

const MAX_NAME_LENGTH = 60;

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreate,
  isBusy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateApiKeyRequest) => void;
  isBusy: boolean;
}) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<ApiKeyScope>("read");
  const [expiry, setExpiry] = useState<(typeof EXPIRY_OPTIONS)[number]>("never");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), scope, ...(expiry === "never" ? {} : { expiresInDays: Number(expiry) }) });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName("");
      setScope("read");
      setExpiry("never");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{t("profile.apiKeys.createTitle")}</DialogTitle>
            <DialogDescription>{t("profile.apiKeys.createDescription")}</DialogDescription>
          </DialogHeader>
          <Field label={t("profile.apiKeys.name")} htmlFor="api-key-name" hint={t("profile.apiKeys.nameHint")}>
            <Input
              id="api-key-name"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>
          <Field
            label={t("profile.apiKeys.access")}
            htmlFor="api-key-scope"
            hint={t(scope === "read" ? "profile.apiKeys.readHint" : "profile.apiKeys.fullHint")}
          >
            <Select value={scope} onValueChange={(value) => setScope(value as ApiKeyScope)}>
              <SelectTrigger id="api-key-scope" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">{t("profile.apiKeys.read")}</SelectItem>
                <SelectItem value="full">{t("profile.apiKeys.full")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("profile.apiKeys.expires")} htmlFor="api-key-expiry">
            <Select value={expiry} onValueChange={(value) => setExpiry(value as (typeof EXPIRY_OPTIONS)[number])}>
              <SelectTrigger id="api-key-expiry" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "never"
                      ? t("profile.apiKeys.never")
                      : t("profile.apiKeys.afterDays", { count: Number(option) })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isBusy}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isBusy || !name.trim()}>
              {t("profile.apiKeys.createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The new key, shown once. */
function NewKeyDialog({ token, onClose }: { token: string | null; onClose: () => void }) {
  const t = useTranslations();

  const copy = async () => {
    if (!token) return;
    try {
      await copyText(token);
      toast.success(t("profile.apiKeys.copied"));
    } catch {
      toast.error(t("profile.apiKeys.copyFailed"));
    }
  };

  return (
    <Dialog open={token !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("profile.apiKeys.createdTitle")}</DialogTitle>
          <DialogDescription>{t("profile.apiKeys.createdDescription")}</DialogDescription>
        </DialogHeader>
        <code
          data-testid="new-api-key"
          className="select-all break-all border-y border-line py-4 font-mono text-[13px] font-medium text-ink-2"
        >
          {token}
        </code>
        <div>
          <Button variant="outline" onClick={() => void copy()}>
            <IconCopy />
            {t("profile.apiKeys.copy")}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>{t("profile.apiKeys.done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** API keys for other tools: one hairline row per key, the key itself shown only at creation. */
export function ApiKeysForm() {
  const t = useTranslations();
  const format = useFormatter();
  const now = useNow();
  const apiKeys = useApiKeys();
  const { keys } = apiKeys;

  const shortDate = (value: string) =>
    format.dateTime(new Date(value), { day: "numeric", month: "short", year: "numeric" });

  const describe = (key: ApiKey) => {
    const parts = [t(key.scope === "full" ? "profile.apiKeys.full" : "profile.apiKeys.read")];
    parts.push(
      key.lastUsedAt
        ? t("profile.calm.usedWhen", { when: format.relativeTime(new Date(key.lastUsedAt), now) })
        : t("profile.calm.neverUsed")
    );
    if (key.expiresAt) {
      parts.push(
        new Date(key.expiresAt) < now
          ? t("profile.calm.expiredOn", { date: shortDate(key.expiresAt) })
          : t("profile.apiKeys.expiresOn", { date: shortDate(key.expiresAt) })
      );
    }
    return parts.join(" · ");
  };

  const body = (() => {
    if (apiKeys.isLoading && keys.length === 0) {
      return (
        <div className="grid gap-2.5" aria-hidden="true">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      );
    }

    if (apiKeys.loadError) {
      return (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
          {t("profile.apiKeys.loadFailed")}
          <Button variant="link" className={quietLink} onClick={() => void apiKeys.load()}>
            {t("common.calm.retry")}
          </Button>
        </p>
      );
    }

    return (
      <>
        {keys.length === 0 ? (
          <p className="text-[13px] text-ink-3">{t("profile.apiKeys.empty")}</p>
        ) : (
          <LineList>
            {keys.map((key) => (
              <LineRow
                key={key.id}
                className="min-h-0 first:pt-0"
                icon={<IconKey stroke={1.8} />}
                title={
                  <>
                    {key.name} <span className="font-mono text-[12.5px] font-normal text-ink-3">{key.prefix}…</span>
                  </>
                }
                sub={describe(key)}
              >
                <Button
                  variant="link"
                  className={`${quietLink} text-ink-3 hover:text-bad`}
                  onClick={() => apiKeys.setKeyToRemove(key)}
                  disabled={apiKeys.isBusy}
                  aria-label={`${t("profile.calm.remove")} ${key.name}`}
                >
                  {t("profile.calm.remove")}
                </Button>
              </LineRow>
            ))}
          </LineList>
        )}
        <div>
          <Button variant="outline" onClick={() => apiKeys.setIsCreateOpen(true)}>
            {t("profile.apiKeys.create")}
          </Button>
        </div>
      </>
    );
  })();

  return (
    <FormSection title={t("profile.apiKeys.title")} description={t("profile.apiKeys.hint")}>
      {body}

      <CreateKeyDialog
        open={apiKeys.isCreateOpen}
        onOpenChange={apiKeys.setIsCreateOpen}
        onCreate={(data) => void apiKeys.create(data)}
        isBusy={apiKeys.isBusy}
      />
      <NewKeyDialog token={apiKeys.newToken} onClose={() => apiKeys.setNewToken(null)} />
      <RemoveDevicesDialog
        open={apiKeys.keyToRemove !== null}
        onOpenChange={(open) => !open && apiKeys.setKeyToRemove(null)}
        title={t("profile.apiKeys.removeTitle")}
        description={t("profile.apiKeys.removeDescription")}
        detail={apiKeys.keyToRemove ? `${apiKeys.keyToRemove.name} · ${apiKeys.keyToRemove.prefix}…` : undefined}
        confirmLabel={t("profile.apiKeys.removeButton")}
        onConfirm={() => void apiKeys.confirmRemove()}
        isBusy={apiKeys.isBusy}
      />
    </FormSection>
  );
}
