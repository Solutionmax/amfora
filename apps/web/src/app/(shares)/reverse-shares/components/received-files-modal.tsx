"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconDownload, IconFolderShare, IconTrash, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  copyReverseShareFileToUserFiles,
  deleteReverseShareFile,
  updateReverseShareFile,
} from "@/http/endpoints/reverse-shares";
import type { ReverseShareFile } from "@/http/endpoints/reverse-shares/types";
import { formatFileSize } from "@/utils/format-file-size";
import type { ReverseShare } from "../hooks/use-reverse-shares";
import { copyErrorMessage, downloadReceivedFile } from "../lib/received-file-actions";
import { ConfirmDialog } from "./confirm-dialog";
import { ReceivedFileManageRow, type EditingField } from "./received-file-manage-row";
import { ReverseShareFilePreviewModal } from "./reverse-share-file-preview-modal";

interface ReceivedFilesModalProps {
  reverseShare: ReverseShare | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => Promise<void>;
}

const extensionOf = (name: string) => name.match(/\.[^/.]+$/)?.[0] ?? "";
const baseName = (name: string) => name.replace(/\.[^/.]+$/, "");

function InlineEditor({
  value,
  suffix,
  placeholder,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  suffix: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations();
  return (
    <form
      className="flex items-center gap-2 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="flex min-w-0 flex-1 items-center">
        <Input
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && (event.stopPropagation(), onCancel())}
          className={suffix ? "rounded-r-none" : undefined}
        />
        {suffix && (
          <span className="grid h-10 place-items-center rounded-r-[var(--radius)] border border-l-0 border-line-2 bg-surface-2 px-2.5 text-[13px] text-ink-3">
            {suffix}
          </span>
        )}
      </div>
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label={t("reverseShares.components.editField.saveChanges")}
      >
        <IconCheck />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onCancel}
        aria-label={t("reverseShares.components.editField.cancelEdit")}
      >
        <IconX />
      </Button>
    </form>
  );
}

/** Every received file with selection, bulk actions, rename and description. */
export function ReceivedFilesModal({ reverseShare, isOpen, onClose, onRefresh }: ReceivedFilesModalProps) {
  const t = useTranslations();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<ReverseShareFile | null>(null);
  const [filesToDelete, setFilesToDelete] = useState<ReverseShareFile[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editing, setEditing] = useState<EditingField | null>(null);
  const files = reverseShare?.files ?? [];

  useEffect(() => {
    setSelected(new Set());
  }, [reverseShare?.id, isOpen]);

  const refresh = async () => {
    await onRefresh?.();
  };

  const download = async (list: ReverseShareFile[]) => {
    try {
      for (const file of list) await downloadReceivedFile(file);
      if (list.length > 1) toast.success(t("reverseShares.modals.receivedFiles.downloadSuccess"));
    } catch (error) {
      console.error("Download error:", error);
      toast.error(t("reverseShares.modals.receivedFiles.downloadError"));
    }
  };

  const copy = (list: ReverseShareFile[]) => {
    const count = list.length;
    toast.promise(Promise.all(list.map((file) => copyReverseShareFileToUserFiles(file.id))), {
      loading: t("reverseShares.modals.receivedFiles.bulkCopyProgress", { count }),
      success:
        count === 1
          ? t("reverseShares.modals.receivedFiles.copySuccess")
          : t("reverseShares.modals.receivedFiles.bulkCopySuccess", { count }),
      error: (error: unknown) => copyErrorMessage(error, t),
    });
  };

  const confirmDelete = async () => {
    const count = filesToDelete.length;
    setIsDeleting(true);
    const results = await Promise.allSettled(filesToDelete.map((file) => deleteReverseShareFile(file.id)));
    const failed = results.filter((result) => result.status === "rejected").length;
    const deleted = count - failed;
    if (deleted > 0) {
      toast.success(
        deleted === 1
          ? t("reverseShares.modals.receivedFiles.deleteSuccess")
          : t("reverseShares.modals.receivedFiles.bulkDeleteSuccess", { count: deleted })
      );
    }
    if (failed > 0) {
      console.error("Error deleting files:", results);
      toast.error(t("reverseShares.calm.deleteSomeFailed", { count: failed }));
    }
    setFilesToDelete([]);
    setSelected(new Set());
    setIsDeleting(false);
    await refresh();
  };

  const saveEdit = async () => {
    if (!editing) return;
    const file = files.find((item) => item.id === editing.fileId);
    const value = editing.value.trim();
    if (!file) return setEditing(null);
    if (editing.field === "name" && !value) return;
    const data = editing.field === "name" ? { name: value + extensionOf(file.name) } : { description: value || null };
    if (editing.field === "name" && data.name === file.name) return setEditing(null);
    try {
      await updateReverseShareFile(file.id, data);
      setEditing(null);
      toast.success(t("reverseShares.modals.receivedFiles.editSuccess"));
      await refresh();
    } catch (error) {
      console.error("Error updating file:", error);
      toast.error(t("reverseShares.modals.receivedFiles.editError"));
    }
  };

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const chosen = files.filter((file) => selected.has(file.id));
  const allSelected = files.length > 0 && chosen.length === files.length;
  const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>{t("reverseShares.calm.receivedFiles")}</DialogTitle>
            <DialogDescription>
              {reverseShare?.name || t("reverseShares.card.untitled")} ·{" "}
              {t("reverseShares.modals.receivedFiles.fileCount", { count: files.length })} · {formatFileSize(totalSize)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-9 flex-wrap items-center gap-2 border-b border-line pb-3">
            <label className="flex items-center gap-2.5 text-[13px] text-ink-2">
              <Checkbox
                checked={allSelected}
                disabled={!files.length}
                onCheckedChange={(checked) => setSelected(checked ? new Set(files.map((file) => file.id)) : new Set())}
                aria-label={t("reverseShares.modals.receivedFiles.selectAll")}
              />
              {chosen.length
                ? t("reverseShares.modals.receivedFiles.bulkActions.selected", { count: chosen.length })
                : t("reverseShares.modals.receivedFiles.selectAll")}
            </label>
            {chosen.length > 0 && (
              <div className="ml-auto flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" onClick={() => download(chosen)}>
                  <IconDownload />
                  {t("common.download")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => copy(chosen)}>
                  <IconFolderShare />
                  {t("reverseShares.calm.copyToMyFiles")}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setFilesToDelete(chosen)}>
                  <IconTrash />
                  {t("common.delete")}
                </Button>
              </div>
            )}
          </div>

          <div className="-mx-6 min-h-0 overflow-y-auto px-6">
            {files.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-ink-3">{t("reverseShares.calm.nothingYet")}</p>
            ) : (
              <div className="flex flex-col [&>*+*]:border-t [&>*+*]:border-line">
                {files.map((file) =>
                  editing?.fileId === file.id ? (
                    <InlineEditor
                      key={file.id}
                      value={editing.value}
                      suffix={editing.field === "name" ? extensionOf(file.name) : ""}
                      placeholder={
                        editing.field === "description"
                          ? t("reverseShares.components.fileRow.addDescription")
                          : undefined
                      }
                      onChange={(value) => setEditing({ ...editing, value })}
                      onSave={saveEdit}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <ReceivedFileManageRow
                      key={file.id}
                      file={file}
                      checked={selected.has(file.id)}
                      onCheckedChange={(checked) => toggle(file.id, checked)}
                      onPreview={() => setPreviewFile(file)}
                      onDownload={() => download([file])}
                      onCopy={() => copy([file])}
                      onRename={() => setEditing({ fileId: file.id, field: "name", value: baseName(file.name) })}
                      onEditDescription={() =>
                        setEditing({ fileId: file.id, field: "description", value: file.description ?? "" })
                      }
                      onDelete={() => setFilesToDelete([file])}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={filesToDelete.length > 0}
        title={t("reverseShares.modals.receivedFiles.bulkDeleteConfirmTitle")}
        description={t("reverseShares.modals.receivedFiles.bulkDeleteConfirmMessage", { count: filesToDelete.length })}
        confirmLabel={t("reverseShares.modals.receivedFiles.bulkDeleteConfirmButton", { count: filesToDelete.length })}
        busyLabel={t("common.deleting")}
        busy={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setFilesToDelete([])}
      />

      {previewFile && (
        <ReverseShareFilePreviewModal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />
      )}
    </>
  );
}
