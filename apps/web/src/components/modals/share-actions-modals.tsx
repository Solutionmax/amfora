"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { toLocalInputValue } from "@/app/(shares)/shares/lib/share-list";
import { RecipientSelector } from "@/components/general/recipient-selector";
import { FileTree, TreeFile, TreeFolder } from "@/components/tables/files-tree";
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
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { addFiles, addFolders, removeFiles, removeFolders, updateSharePassword } from "@/http/endpoints";
import { listFolders } from "@/http/endpoints/folders";

export interface ShareActionsModalsProps {
  shareToDelete: any;
  shareToEdit: any;
  shareToManageFiles: any;
  shareToManageRecipients: any;
  onCloseDelete: () => void;
  onCloseEdit: () => void;
  onCloseManageFiles: () => void;
  onCloseManageRecipients: () => void;
  onDelete: (shareId: string) => Promise<void>;
  onEdit: (shareId: string, data: any) => Promise<void>;
  onManageFiles: (shareId: string, files: string[], folders: string[]) => Promise<void>;
  onManageRecipients: (shareId: string, recipients: string[]) => Promise<void>;
  onEditFile?: (fileId: string, newName: string, description?: string) => Promise<void>;
  onEditFolder?: (folderId: string, newName: string, description?: string) => Promise<void>;
  onSuccess: () => void;
}

function DeleteShareDialog({
  share,
  onClose,
  onDelete,
}: {
  share: any;
  onClose: () => void;
  onDelete: (shareId: string) => Promise<void>;
}) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!share) return;
    setIsLoading(true);
    try {
      await onDelete(share.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={!!share} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="break-words">
            {t("shares.calm.deleteTitle", { name: share?.name || t("shares.calm.untitled") })}
          </DialogTitle>
          <DialogDescription>{t("shares.calm.deleteText")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" disabled={isLoading} onClick={handleDelete}>
            {isLoading ? t("common.deleting") : t("shares.calm.deleteShare")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY_EDIT_FORM = {
  name: "",
  description: "",
  expiresAt: "",
  isPasswordProtected: false,
  password: "",
  maxViews: "",
};

function EditShareDialog({
  share,
  onClose,
  onEdit,
  onSuccess,
}: {
  share: any;
  onClose: () => void;
  onEdit: (shareId: string, data: any) => Promise<void>;
  onSuccess: () => void;
}) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

  useEffect(() => {
    if (share) {
      setEditForm({
        name: share.name || "",
        description: share.description || "",
        expiresAt: share.expiration ? toLocalInputValue(new Date(share.expiration)) : "",
        isPasswordProtected: Boolean(share.security?.hasPassword),
        password: "",
        maxViews: share.security?.maxViews?.toString() || "",
      });
    }
  }, [share]);

  const update = (patch: Partial<typeof EMPTY_EDIT_FORM>) => setEditForm((prev) => ({ ...prev, ...patch }));

  const handleEdit = async () => {
    if (!share) return;
    setIsLoading(true);

    try {
      await onEdit(share.id, {
        name: editForm.name,
        description: editForm.description,
        expiration: editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : undefined,
        maxViews: editForm.maxViews ? parseInt(editForm.maxViews) : null,
      });

      if (!editForm.isPasswordProtected && share.security?.hasPassword) {
        await updateSharePassword(share.id, { password: null });
      } else if (editForm.isPasswordProtected && editForm.password) {
        await updateSharePassword(share.id, { password: editForm.password });
      }

      onSuccess();
      onClose();
      toast.success(t("shareActions.editSuccess"));
    } catch {
      toast.error(t("shareActions.editError"));
    } finally {
      setIsLoading(false);
    }
  };

  const hadPassword = !!share?.security?.hasPassword;

  return (
    <Dialog open={!!share} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("shareActions.editTitle")}</DialogTitle>
          <DialogDescription>{t("shares.calm.modals.editDescription")}</DialogDescription>
        </DialogHeader>
        <form
          id="share-edit-form"
          className="grid gap-[18px]"
          onSubmit={(event) => {
            event.preventDefault();
            void handleEdit();
          }}
        >
          <Field label={t("shares.calm.modals.nameLabel")} htmlFor="share-edit-name">
            <Input id="share-edit-name" value={editForm.name} onChange={(e) => update({ name: e.target.value })} />
          </Field>
          <Field
            label={t("shares.calm.modals.descriptionLabel")}
            htmlFor="share-edit-description"
            hint={t("shares.calm.modals.descriptionHint")}
          >
            <Textarea
              id="share-edit-description"
              rows={3}
              value={editForm.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder={t("createShare.descriptionPlaceholder")}
            />
          </Field>
          <div className="grid gap-[18px] sm:grid-cols-2">
            <Field
              label={t("shares.calm.modals.expiresLabel")}
              htmlFor="share-edit-expires"
              hint={t("shares.calm.modals.expiresHint")}
            >
              <Input
                id="share-edit-expires"
                type="datetime-local"
                value={editForm.expiresAt}
                onChange={(e) => update({ expiresAt: e.target.value })}
              />
            </Field>
            <Field
              label={t("shares.calm.modals.maxViewsLabel")}
              htmlFor="share-edit-views"
              hint={t("shares.calm.modals.maxViewsHint")}
            >
              <Input
                id="share-edit-views"
                min="1"
                type="number"
                inputMode="numeric"
                value={editForm.maxViews}
                onChange={(e) => update({ maxViews: e.target.value })}
              />
            </Field>
          </div>
          <label htmlFor="share-edit-password-on" className="flex cursor-pointer items-center gap-3.5">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t("shares.calm.password")}</span>
              <span className="block text-[12.5px] text-ink-3">{t("shares.calm.modals.passwordHint")}</span>
            </span>
            <Switch
              id="share-edit-password-on"
              checked={editForm.isPasswordProtected}
              onCheckedChange={(checked) => update({ isPasswordProtected: checked, password: "" })}
            />
          </label>
          {editForm.isPasswordProtected && (
            <Field
              label={hadPassword ? t("shareSecurity.newPassword") : t("createShare.passwordLabel")}
              htmlFor="share-edit-password"
              hint={hadPassword ? t("shares.calm.modals.passwordSet") : undefined}
            >
              <PasswordInput
                id="share-edit-password"
                autoComplete="new-password"
                value={editForm.password}
                onChange={(e) => update({ password: e.target.value })}
                placeholder={
                  hadPassword ? t("shareActions.newPasswordPlaceholder") : t("createShare.passwordPlaceholder")
                }
              />
            </Field>
          )}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="share-edit-form" disabled={isLoading}>
            {isLoading ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageFilesDialog({ share, onClose, onSuccess }: { share: any; onClose: () => void; onSuccess: () => void }) {
  const t = useTranslations();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [treeFiles, setTreeFiles] = useState<TreeFile[]>([]);
  const [treeFolders, setTreeFolders] = useState<TreeFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Everything the user owns, loaded only when the dialog opens.
  const loadTree = useCallback(async () => {
    setIsLoading(true);
    try {
      const [foldersResponse, filesResponse] = await Promise.all([
        listFolders(),
        fetch("/api/files?recursive=true").then((res) => res.json()),
      ]);
      setTreeFiles(
        (filesResponse.files || []).map((file: any) => ({
          id: file.id,
          name: file.name,
          type: "file" as const,
          size: file.size,
          parentId: file.folderId || null,
        }))
      );
      setTreeFolders(
        (foldersResponse.data.folders || []).map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          type: "folder" as const,
          parentId: folder.parentId || null,
          totalSize: folder.totalSize,
        }))
      );
    } catch (error) {
      console.error("Error loading files and folders:", error);
      toast.error(t("common.unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (share) {
      void loadTree();
      setSelectedItems([
        ...(share.files?.map((f: any) => f.id) || []),
        ...(share.folders?.map((f: any) => f.id) || []),
      ]);
    }
  }, [share, loadTree]);

  const handleClose = () => {
    setSelectedItems([]);
    setSearchQuery("");
    onClose();
  };

  const handleSave = async () => {
    if (!share?.id) return;

    try {
      setIsSaving(true);
      const selectedFiles = selectedItems.filter((id) => treeFiles.some((file) => file.id === id));
      const selectedFolders = selectedItems.filter((id) => treeFolders.some((folder) => folder.id === id));
      const currentFileIds: string[] = share.files?.map((f: any) => f.id) || [];
      const currentFolderIds: string[] = share.folders?.map((f: any) => f.id) || [];

      const filesToAdd = selectedFiles.filter((id) => !currentFileIds.includes(id));
      const filesToRemove = currentFileIds.filter((id) => !selectedFiles.includes(id));
      const foldersToAdd = selectedFolders.filter((id) => !currentFolderIds.includes(id));
      const foldersToRemove = currentFolderIds.filter((id) => !selectedFolders.includes(id));

      await Promise.all([
        filesToAdd.length > 0 ? addFiles(share.id, { files: filesToAdd }) : null,
        filesToRemove.length > 0 ? removeFiles(share.id, { files: filesToRemove }) : null,
        foldersToAdd.length > 0 ? addFolders(share.id, { folders: foldersToAdd }) : null,
        foldersToRemove.length > 0 ? removeFolders(share.id, { folders: foldersToRemove }) : null,
      ]);
      onSuccess();
      handleClose();
      toast.success(t("shareActions.editSuccess"));
    } catch (error) {
      console.error("Error updating share files:", error);
      toast.error(t("shareActions.editError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={!!share} onOpenChange={(open) => !open && !isSaving && handleClose()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{t("shareActions.manageFilesTitle")}</DialogTitle>
          <DialogDescription>{t("shares.calm.modals.manageFilesDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-3">
          <Input
            type="search"
            aria-label={t("common.search")}
            placeholder={t("searchBar.placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-[12.5px] text-ink-3">
            {t("shares.calm.modals.selectedCount", { count: selectedItems.length })}
          </p>
          <div className="min-h-0 min-w-0">
            {isLoading ? (
              <div aria-hidden className="space-y-3 py-2">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={row} className="h-4 w-3/5" />
                ))}
              </div>
            ) : (
              <FileTree
                files={treeFiles.map((file) => ({
                  id: file.id,
                  name: file.name,
                  description: "",
                  extension: "",
                  size: file.size?.toString() || "0",
                  objectName: "",
                  userId: "",
                  folderId: file.parentId,
                  createdAt: "",
                  updatedAt: "",
                }))}
                folders={treeFolders.map((folder) => ({
                  id: folder.id,
                  name: folder.name,
                  description: "",
                  parentId: folder.parentId,
                  userId: "",
                  createdAt: "",
                  updatedAt: "",
                  totalSize: folder.totalSize,
                }))}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                showFiles={true}
                showFolders={true}
                maxHeight="360px"
                searchQuery={searchQuery}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving || selectedItems.length === 0}>
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShareActionsModals({
  shareToDelete,
  shareToEdit,
  shareToManageFiles,
  shareToManageRecipients,
  onCloseDelete,
  onCloseEdit,
  onCloseManageFiles,
  onCloseManageRecipients,
  onDelete,
  onEdit,
  onSuccess,
}: ShareActionsModalsProps) {
  const t = useTranslations();

  return (
    <>
      <DeleteShareDialog share={shareToDelete} onClose={onCloseDelete} onDelete={onDelete} />
      <EditShareDialog share={shareToEdit} onClose={onCloseEdit} onEdit={onEdit} onSuccess={onSuccess} />
      <ManageFilesDialog share={shareToManageFiles} onClose={onCloseManageFiles} onSuccess={onSuccess} />

      <Dialog open={!!shareToManageRecipients} onOpenChange={(open) => !open && onCloseManageRecipients()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("shares.calm.recipients")}</DialogTitle>
            <DialogDescription>{t("shares.calm.modals.recipientsDescription")}</DialogDescription>
          </DialogHeader>
          <div className="min-w-0">
            <RecipientSelector
              selectedRecipients={shareToManageRecipients?.recipients || []}
              shareAlias={shareToManageRecipients?.alias?.alias}
              shareId={shareToManageRecipients?.id}
              onSuccess={onSuccess}
            />
          </div>
          <DialogFooter>
            <Button onClick={onCloseManageRecipients}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
