"use client";

import { useState } from "react";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { ConfirmDeleteDialog } from "@/components/files/confirm-delete-dialog";
import { InlineError } from "@/components/files/inline-error";
import { SelectionBar } from "@/components/files/selection-bar";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { FilesTableSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { TrashItem } from "@/http/endpoints/trash";
import { formatFileSize } from "@/utils/format-file-size";
import { TrashTable } from "./components/trash-table";
import { useTrash } from "./hooks/use-trash";

type Pending = { kind: "purge"; items: TrashItem[] } | { kind: "empty" } | null;

const rowKey = (item: TrashItem) => `${item.kind}:${item.id}`;

function TrashView() {
  const t = useTranslations("trash");
  const trash = useTrash();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState<Pending>(null);

  const items = trash.list?.items ?? [];
  const chosen = items.filter((item) => selected.has(rowKey(item)));
  const clearSelection = () => setSelected(new Set());

  const toggle = (item: TrashItem, checked: boolean) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(rowKey(item));
      else next.delete(rowKey(item));
      return next;
    });

  const restore = async (list: TrashItem[]) => {
    clearSelection();
    await trash.restore(list);
  };

  const confirm = async () => {
    const action = pending;
    setPending(null);
    clearSelection();
    if (action?.kind === "purge") await trash.purge(action.items);
    if (action?.kind === "empty") await trash.empty();
  };

  const renderBody = () => {
    if (trash.isLoading) return <FilesTableSkeleton rowCount={5} />;
    if (trash.hasLoadError && !trash.list) {
      return <InlineError message={t("loadError")} onRetry={() => void trash.load()} />;
    }
    if (items.length === 0) {
      return <EmptyState icon={<IconTrash stroke={1.8} />} title={t("emptyTitle")} description={t("emptyText")} />;
    }
    return (
      <TrashTable
        items={items}
        selected={selected}
        onToggle={toggle}
        onSelectAll={(checked) => setSelected(new Set(checked ? items.map(rowKey) : []))}
        onRestore={(item) => void restore([item])}
        onDelete={(item) => setPending({ kind: "purge", items: [item] })}
      />
    );
  };

  const purgeNames = pending?.kind === "purge" ? pending.items.map((item) => item.name) : [];
  const heldBytes = trash.list?.totalBytes ?? 0;

  return (
    <FileManagerLayout
      title={t("pageTitle")}
      subline={
        trash.isEmptying
          ? t("emptying")
          : trash.list
            ? t(items.length > 0 ? "subline" : "sublineEmpty", {
                days: trash.list.retentionDays,
                size: formatFileSize(heldBytes),
              })
            : undefined
      }
      actions={
        <Button
          variant="outline"
          disabled={items.length === 0 || trash.isEmptying}
          onClick={() => setPending({ kind: "empty" })}
        >
          {trash.isEmptying ? <IconLoader2 className="animate-spin" aria-hidden /> : <IconTrash />}
          {trash.isEmptying ? t("emptying") : t("emptyTrash")}
        </Button>
      }
    >
      {renderBody()}

      <SelectionBar
        count={chosen.length}
        onRestore={() => void restore(chosen)}
        restoreLabel={t("restore")}
        onDelete={() => setPending({ kind: "purge", items: chosen })}
        deleteLabel={t("deleteForGood")}
        onClear={clearSelection}
      />

      <ConfirmDeleteDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        title={
          pending?.kind === "empty"
            ? t("emptyConfirmTitle")
            : purgeNames.length === 1
              ? t("purgeTitle", { name: purgeNames[0] })
              : t("purgeBulkTitle", { count: purgeNames.length })
        }
        description={
          pending?.kind === "empty"
            ? t("emptyConfirm", { count: items.length, size: formatFileSize(heldBytes) })
            : t("purgeHint")
        }
        names={purgeNames}
        confirmLabel={pending?.kind === "empty" ? t("emptyTrash") : t("deleteForGood")}
      />
    </FileManagerLayout>
  );
}

export default function TrashPage() {
  return (
    <ProtectedRoute>
      <TrashView />
    </ProtectedRoute>
  );
}
