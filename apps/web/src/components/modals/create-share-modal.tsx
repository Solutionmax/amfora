"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
import { createShare } from "@/http/endpoints";

interface CreateShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  getAllFilesAndFolders: () => Promise<{ files: any[]; folders: any[] }>;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  password: "",
  expiresAt: "",
  isPasswordProtected: false,
  maxViews: "",
};

type Step = "details" | "files";

/** Two steps: name and access first, then pick what to share. */
export function CreateShareModal({ isOpen, onClose, onSuccess, getAllFilesAndFolders }: CreateShareModalProps) {
  const t = useTranslations();
  const [step, setStep] = useState<Step>("details");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [files, setFiles] = useState<TreeFile[]>([]);
  const [folders, setFolders] = useState<TreeFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const data = await getAllFilesAndFolders();
      setFiles(
        data.files.map((file) => ({
          id: file.id,
          name: file.name,
          type: "file" as const,
          size: file.size,
          parentId: file.folderId || null,
        }))
      );
      setFolders(
        data.folders.map((folder) => ({
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
      setIsLoadingData(false);
    }
  }, [getAllFilesAndFolders, t]);

  useEffect(() => {
    if (isOpen) {
      void loadData();
      setFormData(EMPTY_FORM);
      setSelectedItems([]);
      setSearchQuery("");
      setStep("details");
    }
  }, [isOpen, loadData]);

  const update = (patch: Partial<typeof EMPTY_FORM>) => setFormData((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t("createShare.errors.nameRequired"));
      return;
    }
    if (selectedItems.length === 0) {
      toast.error(t("createShare.errors.selectItems"));
      return;
    }

    try {
      setIsLoading(true);
      const selectedFiles = selectedItems.filter((id) => files.some((file) => file.id === id));
      const selectedFolders = selectedItems.filter((id) => folders.some((folder) => folder.id === id));
      const dateValue = formData.expiresAt;

      await createShare({
        name: formData.name,
        description: formData.description || undefined,
        password: formData.isPasswordProtected ? formData.password : undefined,
        expiration: dateValue
          ? new Date(dateValue.length === 10 ? `${dateValue}T23:59:59` : dateValue).toISOString()
          : undefined,
        maxViews: formData.maxViews ? parseInt(formData.maxViews) : undefined,
        files: selectedFiles,
        folders: selectedFolders,
      });

      toast.success(t("createShare.success"));
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating share:", error);
      toast.error(t("createShare.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  const canProceedToFiles = formData.name.trim().length > 0;
  const canSubmit = canProceedToFiles && selectedItems.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={step === "files" ? "sm:max-w-[640px]" : "sm:max-w-[520px]"}>
        <DialogHeader>
          <DialogTitle>{t("shares.calm.newShare")}</DialogTitle>
          <DialogDescription>
            {step === "details" ? t("shares.calm.modals.stepDetails") : t("shares.calm.modals.stepFiles")}
          </DialogDescription>
        </DialogHeader>

        {step === "details" ? (
          <form
            id="create-share-details"
            className="grid gap-[18px]"
            onSubmit={(event) => {
              event.preventDefault();
              if (canProceedToFiles) setStep("files");
            }}
          >
            <Field label={t("shares.calm.modals.nameLabel")} htmlFor="share-name">
              <Input
                id="share-name"
                autoFocus
                value={formData.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder={t("createShare.namePlaceholder")}
                required
              />
            </Field>
            <Field
              label={t("shares.calm.modals.descriptionLabel")}
              htmlFor="share-description"
              hint={t("shares.calm.modals.descriptionHint")}
            >
              <Textarea
                id="share-description"
                value={formData.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder={t("createShare.descriptionPlaceholder")}
                rows={3}
              />
            </Field>
            <div className="grid gap-[18px] sm:grid-cols-2">
              <Field
                label={t("shares.calm.modals.expiresLabel")}
                htmlFor="expiration"
                hint={t("shares.calm.modals.expiresHint")}
              >
                <Input
                  id="expiration"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => update({ expiresAt: e.target.value })}
                />
              </Field>
              <Field
                label={t("shares.calm.modals.maxViewsLabel")}
                htmlFor="max-views"
                hint={t("shares.calm.modals.maxViewsHint")}
              >
                <Input
                  id="max-views"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={formData.maxViews}
                  onChange={(e) => update({ maxViews: e.target.value })}
                />
              </Field>
            </div>
            <label htmlFor="password-protection" className="flex cursor-pointer items-center gap-3.5">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t("shares.calm.password")}</span>
                <span className="block text-[12.5px] text-ink-3">{t("shares.calm.modals.passwordHint")}</span>
              </span>
              <Switch
                id="password-protection"
                checked={formData.isPasswordProtected}
                onCheckedChange={(checked) => update({ isPasswordProtected: checked, password: "" })}
              />
            </label>
            {formData.isPasswordProtected && (
              <Field label={t("createShare.passwordLabel")} htmlFor="share-password">
                <PasswordInput
                  id="share-password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => update({ password: e.target.value })}
                  placeholder={t("createShare.passwordPlaceholder")}
                />
              </Field>
            )}
          </form>
        ) : (
          <div className="flex min-w-0 flex-col gap-3">
            <Input
              type="search"
              aria-label={t("common.search")}
              placeholder={t("searchBar.placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoadingData}
            />
            <p className="text-[12.5px] text-ink-3">
              {t("shares.calm.modals.selectedCount", { count: selectedItems.length })}
            </p>
            <div className="min-h-0 min-w-0">
              {isLoadingData ? (
                <div aria-hidden className="space-y-3 py-2">
                  {[0, 1, 2, 3].map((row) => (
                    <Skeleton key={row} className="h-4 w-3/5" />
                  ))}
                </div>
              ) : (
                <FileTree
                  files={files.map((file) => ({
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
                  folders={folders.map((folder) => ({
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
        )}

        <DialogFooter>
          {step === "details" ? (
            <>
              <Button variant="ghost" onClick={handleClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" form="create-share-details" disabled={!canProceedToFiles}>
                {t("shares.calm.modals.next")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("details")} disabled={isLoading}>
                {t("common.back")}
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || isLoading}>
                {isLoading ? t("common.creating") : t("createShare.create")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
