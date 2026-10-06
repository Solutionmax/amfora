"use client";

import { IconFingerprint } from "@tabler/icons-react";
import { useFormatter, useNow, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { LineList, LineRow } from "@/components/ui/line-list";
import { Skeleton } from "@/components/ui/skeleton";
import { usePasskeys } from "../hooks/use-passkeys";
import { AddPasskeyDialog, RemovePasskeyDialog } from "./passkey-dialogs";
import { quietLink } from "./trusted-devices";

/** Passkeys: one hairline row per key, add with a name and the password, remove with the password. */
export function PasskeysForm({ onChange }: { onChange?: () => void }) {
  const t = useTranslations();
  const format = useFormatter();
  const now = useNow();
  const passkeys = usePasskeys(onChange);

  const describe = (key: { createdAt: string; lastUsedAt: string | null }) => {
    const added = format.dateTime(new Date(key.createdAt), { day: "numeric", month: "short", year: "numeric" });
    const used = key.lastUsedAt
      ? t("profile.calm.usedWhen", { when: format.relativeTime(new Date(key.lastUsedAt), now) })
      : t("profile.calm.neverUsed");
    return `${t("passkeys.addedOn", { date: added })} · ${used}`;
  };

  const body = (() => {
    if (passkeys.isLoading && passkeys.passkeys.length === 0) {
      return (
        <div className="grid gap-2.5" aria-hidden="true">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      );
    }

    if (passkeys.loadError) {
      return (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
          {t("passkeys.loadFailed")}
          <Button variant="link" className={quietLink} onClick={() => void passkeys.load()}>
            {t("common.calm.retry")}
          </Button>
        </p>
      );
    }

    return (
      <>
        {passkeys.passkeys.length === 0 ? (
          <p className="text-[13px] text-ink-3">{t("passkeys.empty")}</p>
        ) : (
          <div data-testid="passkey-list">
            <LineList>
              {passkeys.passkeys.map((key) => (
                <LineRow
                  key={key.id}
                  className="min-h-0 first:pt-0"
                  icon={<IconFingerprint stroke={1.8} />}
                  title={key.name}
                  sub={describe(key)}
                >
                  <Button
                    variant="link"
                    className={`${quietLink} text-ink-3 hover:text-bad`}
                    onClick={() => passkeys.askRemove(key)}
                    disabled={passkeys.isBusy}
                    aria-label={`${t("profile.calm.remove")} ${key.name}`}
                  >
                    {t("profile.calm.remove")}
                  </Button>
                </LineRow>
              ))}
            </LineList>
          </div>
        )}
        <div>
          <Button variant="outline" onClick={passkeys.openAdd}>
            {t("passkeys.add")}
          </Button>
        </div>
      </>
    );
  })();

  return (
    <FormSection title={t("passkeys.title")} description={t("passkeys.hint")}>
      {body}
      <AddPasskeyDialog
        open={passkeys.isAddOpen}
        onOpenChange={(open) => !open && passkeys.closeAdd()}
        isBusy={passkeys.isBusy}
        error={passkeys.dialogError}
        onAdd={(name, password) => void passkeys.add(name, password)}
      />
      <RemovePasskeyDialog
        name={passkeys.toRemove?.name ?? null}
        onOpenChange={(open) => !open && passkeys.closeRemove()}
        isBusy={passkeys.isBusy}
        error={passkeys.dialogError}
        onRemove={(password) => void passkeys.remove(password)}
      />
    </FormSection>
  );
}
