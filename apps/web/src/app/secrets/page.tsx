"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconKey, IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ConfirmDialog } from "@/app/(shares)/shares/components/confirm-dialog";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { SecretTags } from "@/components/secrets/secret-tags";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SplitListHeader, SplitListItem, SplitView } from "@/components/ui/split-view";
import type { Secret } from "@/http/endpoints/secrets";
import { cn } from "@/lib/utils";
import { NewSecretDialog } from "./components/new-secret-dialog";
import { SecretDetail } from "./components/secret-detail";
import { useSecrets } from "./hooks/use-secrets";
import { filterSecrets, SECRET_FILTERS, type SecretFilter } from "./lib/secret-options";

function ListSkeleton() {
  return (
    <div aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 px-3 py-[13px]">
          <Skeleton className="size-[17px] rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

/** List of secrets on the left, the chosen one on the right. The choice lives in ?id= so Back works. */
function SecretsView() {
  const t = useTranslations("secrets");
  const router = useRouter();
  const selectedId = useSearchParams().get("id");
  const { secrets, limits, isLoading, loadError, isBusy, fresh, load, create, remove } = useSecrets();
  const [filter, setFilter] = useState<SecretFilter>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Secret | null>(null);

  const visible = useMemo(() => filterSecrets(secrets, filter), [secrets, filter]);
  const shown = selectedId ? (secrets.find((secret) => secret.id === selectedId) ?? null) : (visible[0] ?? null);

  const select = (id: string) => router.push(`/secrets?id=${encodeURIComponent(id)}`);
  const showAll = () => router.push("/secrets");

  const newButton = (
    <Button onClick={() => setIsCreating(true)} disabled={!limits}>
      <IconPlus />
      {t("new")}
    </Button>
  );

  const empty = (
    <EmptyState
      icon={<IconKey />}
      title={t("emptyTitle")}
      description={t("emptyDescription")}
      action={
        <Button onClick={() => setIsCreating(true)} disabled={!limits}>
          <IconPlus />
          {t("newSecret")}
        </Button>
      }
    />
  );

  const detail = isLoading ? (
    <div aria-hidden className="space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  ) : loadError ? null : secrets.length === 0 ? (
    empty
  ) : shown ? (
    <SecretDetail secret={shown} freshLink={fresh?.id === shown.id ? fresh.link : null} onDelete={setToDelete} />
  ) : (
    <EmptyState
      title={t("notFoundTitle")}
      description={t("notFoundText")}
      action={
        <Button variant="outline" onClick={showAll}>
          {t("showAll")}
        </Button>
      }
    />
  );

  const list = (
    <>
      <SplitListHeader title={t("pageTitle")} action={newButton} />
      <div role="group" aria-label={t("filterLabel")} className="flex gap-5 border-b border-line px-[22px] text-[13px]">
        {SECRET_FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              "-mb-px border-b-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/35",
              filter === key
                ? "border-ink font-semibold text-ink"
                : "border-transparent font-medium text-ink-3 hover:text-ink"
            )}
          >
            {t(`filters.${key}`)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto px-2.5 pb-5 pt-1.5">
        {isLoading ? (
          <ListSkeleton />
        ) : loadError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-4 text-[13px]">
            <span className="text-bad">{t("loadError")}</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              {t("retry")}
            </Button>
          </div>
        ) : secrets.length === 0 ? (
          <div className="lg:hidden">{empty}</div>
        ) : visible.length === 0 ? (
          <EmptyState className="py-10" title={t("noResults")} />
        ) : (
          visible.map((secret) => (
            <SplitListItem
              key={secret.id}
              icon={<IconKey stroke={1.8} />}
              title={secret.label || t("untitled")}
              meta={<SecretTags secret={secret} />}
              aside={
                <span className="tabular-nums">{t("opensOf", { opens: secret.opens, max: secret.maxOpens })}</span>
              }
              selected={secret.id === shown?.id}
              onSelect={() => select(secret.id)}
            />
          ))
        )}
      </div>
    </>
  );

  return (
    <FileManagerLayout title={t("pageTitle")} variant="bare">
      <SplitView hasSelection={!!selectedId} onBack={showAll} backLabel={t("pageTitle")} list={list} detail={detail} />

      {limits && (
        <NewSecretDialog
          open={isCreating}
          limits={limits}
          isBusy={isBusy}
          onClose={() => setIsCreating(false)}
          onCreate={async (draft) => {
            const id = await create(draft);
            if (id) select(id);
            return id !== null;
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={t("deleteTitle")}
        description={t("deleteText")}
        confirmLabel={t("deleteConfirm")}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          const wasSelected = toDelete.id === selectedId;
          if (await remove(toDelete.id)) {
            setToDelete(null);
            if (wasSelected) router.replace("/secrets");
          }
        }}
      />
    </FileManagerLayout>
  );
}

export default function SecretsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <SecretsView />
      </Suspense>
    </ProtectedRoute>
  );
}
