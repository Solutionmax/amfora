"use client";

import { useEffect, useRef, useState } from "react";
import { IconCopy, IconDownload, IconFolder } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
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
import { ExpiryField } from "@/components/ui/expiry-field";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { useStartingExpiry } from "@/hooks/use-link-lifetime";
import { createShare, createShareAlias, listFiles, listFolders } from "@/http/endpoints";
import { copyText } from "@/lib/clipboard";
import { downloadQrCodeAsPng } from "@/lib/qr-code";
import { customNanoid } from "@/lib/utils";
import { getFileIcon } from "@/utils/file-icons";
import { formatFileSize } from "@/utils/format-file-size";

interface BulkFile {
  id: string;
  name: string;
  description?: string;
  size: number;
  objectName: string;
  createdAt: string;
  updatedAt: string;
}

interface BulkFolder {
  id: string;
  name: string;
  description?: string;
  objectName: string;
  parentId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  totalSize?: string;
  _count?: {
    files: number;
    children: number;
  };
}

interface BulkItem {
  id: string;
  name: string;
  description?: string;
  size?: number;
  type: "file" | "folder";
  createdAt: string;
  updatedAt: string;
}

interface ShareMultipleItemsModalProps {
  files: BulkFile[] | null;
  folders: BulkFolder[] | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const generateCustomId = () => customNanoid(10, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");

export function ShareMultipleItemsModal({ files, folders, isOpen, onClose, onSuccess }: ShareMultipleItemsModalProps) {
  const t = useTranslations();
  const [step, setStep] = useState<"create" | "link">("create");
  const [shareId, setShareId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    password: "",
    expiresAt: "",
    isPasswordProtected: false,
    maxViews: "",
  });
  const [alias, setAlias] = useState(() => generateCustomId());
  const [generatedLink, setGeneratedLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && ((files && files.length > 0) || (folders && folders.length > 0))) {
      const fileCount = files ? files.length : 0;
      const folderCount = folders ? folders.length : 0;
      const totalCount = fileCount + folderCount;

      let defaultName = "";
      if (totalCount === 1) {
        if (fileCount === 1 && files) {
          defaultName = files[0].name.split(".")[0];
        } else if (folderCount === 1 && folders) {
          defaultName = folders[0].name;
        }
      } else {
        defaultName = t("shares.calm.modals.defaultMultiName", { count: totalCount });
      }

      setFormData({
        name: defaultName,
        description: "",
        password: "",
        expiresAt: "",
        isPasswordProtected: false,
        maxViews: "",
      });
      setAlias(generateCustomId());
      setStep("create");
      setShareId(null);
      setGeneratedLink("");
    }
  }, [isOpen, files, folders, t]);

  // After the effect above, so the default end date lands on the freshly reset form.
  const { maxDays, acceptsExpiry } = useStartingExpiry(isOpen, (expiresAt) =>
    setFormData((prev) => ({ ...prev, expiresAt }))
  );

  const getAllFolderContents = async (folderId: string): Promise<{ files: string[]; folders: string[] }> => {
    try {
      const [filesResponse, foldersResponse] = await Promise.all([listFiles(), listFolders()]);

      const allFiles = filesResponse.data.files || [];
      const allFolders = foldersResponse.data.folders || [];

      const collectContents = (parentId: string): { files: string[]; folders: string[] } => {
        const folderFiles = allFiles.filter((f: any) => f.folderId === parentId).map((f: any) => f.id);

        const subFolders = allFolders.filter((f: any) => f.parentId === parentId);
        const subFolderIds = subFolders.map((f: any) => f.id);

        let allSubFiles: string[] = [...folderFiles];
        let allSubFolders: string[] = [...subFolderIds];

        subFolders.forEach((subFolder: any) => {
          const subContents = collectContents(subFolder.id);
          allSubFiles = [...allSubFiles, ...subContents.files];
          allSubFolders = [...allSubFolders, ...subContents.folders];
        });

        return { files: allSubFiles, folders: allSubFolders };
      };

      return collectContents(folderId);
    } catch (error) {
      console.error("Error getting folder contents:", error);
      return { files: [], folders: [] };
    }
  };

  const handleCreateShare = async () => {
    const fileCount = files ? files.length : 0;
    const folderCount = folders ? folders.length : 0;

    if (fileCount === 0 && folderCount === 0) return;
    if (!acceptsExpiry(formData.expiresAt)) return;

    try {
      setIsLoading(true);

      let allFilesToShare: string[] = files ? files.map((f) => f.id) : [];
      let allFoldersToShare: string[] = folders ? folders.map((f) => f.id) : [];

      if (folders && folders.length > 0) {
        for (const folder of folders) {
          const folderContents = await getAllFolderContents(folder.id);
          allFilesToShare = [...allFilesToShare, ...folderContents.files];
          allFoldersToShare = [...allFoldersToShare, ...folderContents.folders];
        }
      }

      const shareResponse = await createShare({
        name: formData.name,
        description: formData.description || undefined,
        password: formData.isPasswordProtected ? formData.password : undefined,
        expiration: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
        maxViews: formData.maxViews ? parseInt(formData.maxViews) : undefined,
        files: allFilesToShare,
        folders: allFoldersToShare,
      });

      const newShareId = shareResponse.data.share.id;
      setShareId(newShareId);

      toast.success(t("createShare.success"));
      setStep("link");
    } catch {
      toast.error(t("createShare.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!shareId) return;

    try {
      setIsLoading(true);
      await createShareAlias(shareId, { alias });
      const link = `${window.location.origin}/s/${alias}`;
      setGeneratedLink(link);
      toast.success(t("generateShareLink.success"));
    } catch {
      toast.error(t("generateShareLink.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyText(generatedLink);
      toast.success(t("generateShareLink.copied"));
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  };

  const downloadQRCode = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      await downloadQrCodeAsPng(qrContainerRef.current, "share-multiple-files-qr-code.png", 250);
    } catch (error) {
      console.error("Failed to download QR code:", error);
      toast.error(t("common.unexpectedError"));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep("create");
      setShareId(null);
      setGeneratedLink("");
      setFormData({
        name: "",
        description: "",
        password: "",
        expiresAt: "",
        isPasswordProtected: false,
        maxViews: "",
      });
    }, 300);
  };

  const handleSuccess = () => {
    onSuccess();
    handleClose();
  };

  if (!files && !folders) return null;

  const filesList = files || [];
  const foldersList = folders || [];
  const allItems: BulkItem[] = [
    ...filesList.map((file) => ({
      id: file.id,
      name: file.name,
      description: file.description,
      size: file.size,
      type: "file" as const,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    })),
    ...foldersList.map((folder) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      size: folder.totalSize ? parseInt(folder.totalSize) : undefined,
      type: "folder" as const,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    })),
  ];

  const totalSize =
    filesList.reduce((sum, file) => sum + file.size, 0) +
    foldersList.reduce((sum, folder) => sum + (folder.totalSize ? parseInt(folder.totalSize) : 0), 0);
  const host = typeof window === "undefined" ? "" : window.location.host;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{step === "create" ? t("shareMultipleFiles.title") : t("shareActions.linkTitle")}</DialogTitle>
          <DialogDescription>
            {step === "create"
              ? t("shares.calm.modals.shareMultipleDescription")
              : generatedLink
                ? t("shares.calm.modals.linkReady")
                : t("shares.calm.modals.linkStepDescription")}
          </DialogDescription>
        </DialogHeader>

        {step === "create" && (
          <div className="grid gap-[18px]">
            <Field label={t("shares.calm.modals.nameLabel")} htmlFor="share-multi-name">
              <Input
                id="share-multi-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("shareMultipleFiles.shareNamePlaceholder")}
                required
              />
            </Field>
            <Field
              label={t("shares.calm.modals.descriptionLabel")}
              htmlFor="share-multi-description"
              hint={t("shares.calm.modals.descriptionHint")}
            >
              <Input
                id="share-multi-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("shareMultipleFiles.descriptionPlaceholder")}
              />
            </Field>
            <div className="grid gap-[18px] sm:grid-cols-2">
              <ExpiryField
                id="share-multi-expires"
                label={t("shares.calm.modals.expiresLabel")}
                hint={t("shares.calm.modals.expiresHint")}
                value={formData.expiresAt}
                onChange={(expiresAt) => setFormData((prev) => ({ ...prev, expiresAt }))}
                maxDays={maxDays}
              />
              <Field
                label={t("shares.calm.modals.maxViewsLabel")}
                htmlFor="share-multi-views"
                hint={t("shares.calm.modals.maxViewsHint")}
              >
                <Input
                  id="share-multi-views"
                  min="1"
                  type="number"
                  inputMode="numeric"
                  value={formData.maxViews}
                  onChange={(e) => setFormData({ ...formData, maxViews: e.target.value })}
                />
              </Field>
            </div>
            <label htmlFor="share-multi-password-on" className="flex cursor-pointer items-center gap-3.5">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t("shares.calm.password")}</span>
                <span className="block text-[12.5px] text-ink-3">{t("shares.calm.modals.passwordHint")}</span>
              </span>
              <Switch
                id="share-multi-password-on"
                checked={formData.isPasswordProtected}
                onCheckedChange={(checked) => setFormData({ ...formData, isPasswordProtected: checked, password: "" })}
              />
            </label>
            {formData.isPasswordProtected && (
              <Field label={t("createShare.passwordLabel")} htmlFor="share-multi-password">
                <PasswordInput
                  id="share-multi-password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t("createShare.passwordPlaceholder")}
                />
              </Field>
            )}

            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-ink-3">
                {t("shares.calm.modals.itemsToShare", { count: allItems.length, size: formatFileSize(totalSize) })}
              </p>
              <ul className="mt-1 max-h-40 overflow-y-auto border-y border-line [&>li+li]:border-t [&>li+li]:border-line">
                {allItems.map((item) => {
                  const ItemIcon = item.type === "folder" ? IconFolder : getFileIcon(item.name).icon;
                  return (
                    <li key={item.id} className="flex min-w-0 items-center gap-3 py-2 text-[13.5px]">
                      <ItemIcon stroke={1.8} className="size-[17px] shrink-0 text-ink-icon" />
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <span className="shrink-0 text-[12.5px] text-ink-3">
                        {item.size ? formatFileSize(item.size) : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {step === "link" && !generatedLink && (
          <Field label={t("shares.calm.modals.linkLabel")} htmlFor="share-multi-alias">
            <div className="flex min-w-0 items-center rounded-[var(--radius)] border border-line-2 bg-surface focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15">
              <span className="max-w-[45%] shrink-0 truncate pl-3 font-mono text-[13px] text-ink-3">{host}/s/</span>
              <Input
                id="share-multi-alias"
                className="border-0 pl-0.5 font-mono text-[13px] focus-visible:ring-0"
                placeholder={t("shareActions.aliasPlaceholder")}
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
              />
            </div>
          </Field>
        )}

        {step === "link" && generatedLink && (
          <div className="flex flex-col items-center gap-4">
            <div ref={qrContainerRef} className="max-w-full rounded-xl border border-line bg-white p-4">
              <QRCode
                value={generatedLink}
                size={176}
                level="H"
                fgColor="#000000"
                bgColor="#FFFFFF"
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </div>
            <div className="flex w-full min-w-0 items-center gap-1.5 rounded-xl border border-line-2 py-1.5 pl-4 pr-1.5">
              <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink-3">{generatedLink}</code>
              <Button variant="outline" onClick={handleCopyLink}>
                <IconCopy />
                {t("shares.calm.copyLink")}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "create" && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                {t("common.cancel")}
              </Button>
              <Button
                disabled={
                  isLoading || !formData.name.trim() || (formData.isPasswordProtected && !formData.password.trim())
                }
                onClick={handleCreateShare}
              >
                {isLoading ? t("common.creating") : t("shareMultipleFiles.create")}
              </Button>
            </>
          )}

          {step === "link" && !generatedLink && (
            <>
              <Button variant="ghost" onClick={handleSuccess}>
                {t("common.close")}
              </Button>
              <Button disabled={!alias || isLoading} onClick={handleGenerateLink}>
                {t("shareActions.generateLink")}
              </Button>
            </>
          )}

          {step === "link" && generatedLink && (
            <>
              <Button variant="ghost" onClick={downloadQRCode} disabled={isDownloading}>
                <IconDownload />
                {t("shares.calm.modals.downloadQr")}
              </Button>
              <Button onClick={handleSuccess}>{t("common.close")}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
