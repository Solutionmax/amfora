"use client";

import { useEffect, useRef, useState } from "react";
import { IconCopy, IconDownload } from "@tabler/icons-react";
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
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { createShare, createShareAlias, listFiles, listFolders } from "@/http/endpoints";
import { copyText } from "@/lib/clipboard";
import { downloadQrCodeAsPng } from "@/lib/qr-code";
import { customNanoid } from "@/lib/utils";

interface File {
  id: string;
  name: string;
  description?: string;
  size: number;
  objectName: string;
  downloads?: number;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  description?: string;
  objectName: string;
  parentId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface ShareItemModalProps {
  isOpen: boolean;
  file?: File | null;
  folder?: Folder | null;
  onClose: () => void;
  onSuccess: () => void;
}

const generateCustomId = () => customNanoid(10, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");

export function ShareItemModal({ isOpen, file, folder, onClose, onSuccess }: ShareItemModalProps) {
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

  const item = file || folder;
  const itemType = file ? "file" : "folder";

  useEffect(() => {
    if (isOpen && item) {
      const baseName = file ? file.name.split(".")[0] : folder!.name;
      setFormData({
        name: baseName,
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
  }, [isOpen, item, file, folder]);

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
    if (!item) return;

    try {
      setIsLoading(true);

      let filesToShare: string[] = [];
      let foldersToShare: string[] = [];

      if (file) {
        filesToShare = [file.id];
      } else if (folder) {
        const folderContents = await getAllFolderContents(folder.id);
        filesToShare = folderContents.files;
        foldersToShare = [folder.id, ...folderContents.folders];
      }

      const shareResponse = await createShare({
        name: formData.name,
        description: formData.description || undefined,
        password: formData.isPasswordProtected ? formData.password : undefined,
        expiration: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
        maxViews: formData.maxViews ? parseInt(formData.maxViews) : undefined,
        files: filesToShare,
        folders: foldersToShare,
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

    setFormData({
      name: "",
      description: "",
      password: "",
      expiresAt: "",
      isPasswordProtected: false,
      maxViews: "",
    });
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
      await downloadQrCodeAsPng(qrContainerRef.current, `share-${itemType}-qr-code.png`, 250);
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

  const host = typeof window === "undefined" ? "" : window.location.host;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {step === "create"
              ? itemType === "file"
                ? t("shareActions.fileTitle")
                : t("shareActions.folderTitle")
              : t("shareActions.linkTitle")}
          </DialogTitle>
          <DialogDescription>
            {step === "create"
              ? t("shares.calm.modals.shareItemDescription")
              : generatedLink
                ? t("shares.calm.modals.linkReady")
                : t("shares.calm.modals.linkStepDescription")}
          </DialogDescription>
        </DialogHeader>

        {step === "create" && (
          <div className="grid gap-[18px]">
            <Field label={t("shares.calm.modals.nameLabel")} htmlFor="share-item-name">
              <Input
                id="share-item-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("createShare.namePlaceholder")}
              />
            </Field>
            <Field
              label={t("shares.calm.modals.descriptionLabel")}
              htmlFor="share-item-description"
              hint={t("shares.calm.modals.descriptionHint")}
            >
              <Input
                id="share-item-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("createShare.descriptionPlaceholder")}
              />
            </Field>
            <div className="grid gap-[18px] sm:grid-cols-2">
              <Field
                label={t("shares.calm.modals.expiresLabel")}
                htmlFor="share-item-expires"
                hint={t("shares.calm.modals.expiresHint")}
              >
                <Input
                  id="share-item-expires"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </Field>
              <Field
                label={t("shares.calm.modals.maxViewsLabel")}
                htmlFor="share-item-views"
                hint={t("shares.calm.modals.maxViewsHint")}
              >
                <Input
                  id="share-item-views"
                  min="1"
                  type="number"
                  inputMode="numeric"
                  value={formData.maxViews}
                  onChange={(e) => setFormData({ ...formData, maxViews: e.target.value })}
                />
              </Field>
            </div>
            <label htmlFor="share-item-password-on" className="flex cursor-pointer items-center gap-3.5">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t("shares.calm.password")}</span>
                <span className="block text-[12.5px] text-ink-3">{t("shares.calm.modals.passwordHint")}</span>
              </span>
              <Switch
                id="share-item-password-on"
                checked={formData.isPasswordProtected}
                onCheckedChange={(checked) => setFormData({ ...formData, isPasswordProtected: checked, password: "" })}
              />
            </label>
            {formData.isPasswordProtected && (
              <Field label={t("createShare.passwordLabel")} htmlFor="share-item-password">
                <PasswordInput
                  id="share-item-password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t("createShare.passwordPlaceholder")}
                />
              </Field>
            )}
          </div>
        )}

        {step === "link" && !generatedLink && (
          <Field label={t("shares.calm.modals.linkLabel")} htmlFor="share-item-alias">
            <div className="flex min-w-0 items-center rounded-[var(--radius)] border border-line-2 bg-surface focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15">
              <span className="max-w-[45%] shrink-0 truncate pl-3 font-mono text-[13px] text-ink-3">{host}/s/</span>
              <Input
                id="share-item-alias"
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
              <Button disabled={isLoading || !formData.name.trim()} onClick={handleCreateShare}>
                {isLoading ? t("common.creating") : t("createShare.create")}
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
