"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { ConfirmDeleteDialog } from "@/components/files/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTrashDays } from "@/hooks/use-trash-days";

interface FileActionsModalsProps {
  fileToRename: { id: string; name: string; description?: string } | null;
  fileToDelete: { id: string; name: string } | null;
  onRename: (fileId: string, newName: string, description?: string) => Promise<void>;
  onDelete: (fileId: string) => Promise<void>;
  onCloseRename: () => void;
  onCloseDelete: () => void;
}

export function splitFileName(fullName: string) {
  const lastDotIndex = fullName.lastIndexOf(".");
  return lastDotIndex <= 0
    ? { name: fullName, extension: "" }
    : { name: fullName.substring(0, lastDotIndex), extension: fullName.substring(lastDotIndex) };
}

function EditFileDialog({
  file,
  onRename,
  onClose,
}: {
  file: { id: string; name: string; description?: string } | null;
  onRename: FileActionsModalsProps["onRename"];
  onClose: () => void;
}) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const extension = file ? splitFileName(file.name).extension : "";

  useEffect(() => {
    if (!file) return;
    setName(splitFileName(file.name).name);
    setDescription(file.description || "");
  }, [file]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return;
    setIsSaving(true);
    try {
      await onRename(file.id, name.trim() + extension, description.trim());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("fileActions.editFile")}</DialogTitle>
          <DialogDescription>{t("files.calm.editFileHint")}</DialogDescription>
        </DialogHeader>
        <form id="edit-file-form" onSubmit={submit} className="grid gap-4">
          <Field label={t("fileActions.nameLabel")} htmlFor="edit-file-name">
            <div className="relative flex items-center">
              <Input
                id="edit-file-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("fileActions.namePlaceholder")}
                className={extension ? "pr-16" : undefined}
                autoFocus
                required
              />
              {extension && (
                <span className="pointer-events-none absolute right-3 max-w-14 truncate text-[13px] text-ink-3">
                  {extension}
                </span>
              )}
            </div>
          </Field>
          <Field
            label={t("fileActions.descriptionLabel")}
            htmlFor="edit-file-description"
            hint={t("files.calm.optional")}
          >
            <Textarea
              id="edit-file-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("fileActions.descriptionPlaceholder")}
              rows={3}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="edit-file-form" disabled={isSaving || !name.trim()}>
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FileActionsModals({
  fileToRename,
  fileToDelete,
  onRename,
  onDelete,
  onCloseRename,
  onCloseDelete,
}: FileActionsModalsProps) {
  const t = useTranslations();
  const trashDays = useTrashDays();

  return (
    <>
      <EditFileDialog file={fileToRename} onRename={onRename} onClose={onCloseRename} />

      <ConfirmDeleteDialog
        open={!!fileToDelete}
        title={t("files.calm.deleteTitle", { name: fileToDelete?.name ?? "" })}
        description={t("files.calm.trashHint", { days: trashDays })}
        onConfirm={async () => {
          if (fileToDelete) await onDelete(fileToDelete.id);
        }}
        onClose={onCloseDelete}
      />
    </>
  );
}
