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

interface FolderToEdit {
  id: string;
  name: string;
  description?: string | null;
}

interface FolderToDelete {
  id: string;
  name: string;
}

interface FolderActionsModalsProps {
  folderToCreate: boolean;
  onCreateFolder: (name: string, description?: string) => Promise<void>;
  onCloseCreate: () => void;

  folderToEdit: FolderToEdit | null;
  onEditFolder: (folderId: string, newName: string, description?: string) => Promise<void>;
  onCloseEdit: () => void;

  folderToDelete: FolderToDelete | null;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onCloseDelete: () => void;
}

/** Name + description dialog used for both new and existing folders. */
function FolderDialog({
  open,
  initial,
  title,
  description,
  submitLabel,
  onSubmit,
  onClose,
}: {
  open: boolean;
  initial: { name: string; description: string };
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: (name: string, description?: string) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial.name);
    setNotes(initial.description);
  }, [open, initial.name, initial.description]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSubmit(name.trim(), notes.trim() || undefined);
    } catch {
      // The handler already reports the error; keep the dialog open.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form id="folder-form" onSubmit={submit} className="grid gap-4">
          <Field label={t("folderActions.folderName")} htmlFor="folder-name">
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("folderActions.folderNamePlaceholder")}
              autoFocus
              required
            />
          </Field>
          <Field
            label={t("folderActions.folderDescription")}
            htmlFor="folder-description"
            hint={t("files.calm.optional")}
          >
            <Textarea id="folder-description" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="folder-form" disabled={isSaving || !name.trim()}>
            {isSaving ? t("common.saving") : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY = { name: "", description: "" };

export function FolderActionsModals({
  folderToCreate,
  onCreateFolder,
  onCloseCreate,
  folderToEdit,
  onEditFolder,
  onCloseEdit,
  folderToDelete,
  onDeleteFolder,
  onCloseDelete,
}: FolderActionsModalsProps) {
  const t = useTranslations();

  return (
    <>
      <FolderDialog
        open={folderToCreate}
        initial={EMPTY}
        title={t("files.calm.newFolderTitle")}
        description={t("files.calm.newFolderHint")}
        submitLabel={t("common.create")}
        onSubmit={onCreateFolder}
        onClose={onCloseCreate}
      />

      <FolderDialog
        open={!!folderToEdit}
        initial={folderToEdit ? { name: folderToEdit.name, description: folderToEdit.description || "" } : EMPTY}
        title={t("folderActions.editFolder")}
        description={t("files.calm.editFolderHint")}
        submitLabel={t("common.save")}
        onSubmit={async (name, description) => {
          if (folderToEdit) await onEditFolder(folderToEdit.id, name, description);
        }}
        onClose={onCloseEdit}
      />

      <ConfirmDeleteDialog
        open={!!folderToDelete}
        title={t("files.calm.deleteFolderTitle", { name: folderToDelete?.name ?? "" })}
        description={t("files.calm.deleteFolderHint")}
        onConfirm={async () => {
          if (folderToDelete) await onDeleteFolder(folderToDelete.id);
        }}
        onClose={onCloseDelete}
      />
    </>
  );
}
