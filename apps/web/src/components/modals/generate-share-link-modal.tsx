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
import { Share } from "@/http/endpoints/shares/types";
import { copyText } from "@/lib/clipboard";
import { downloadQrCodeAsPng } from "@/lib/qr-code";
import { customNanoid } from "@/lib/utils";

interface GenerateShareLinkModalProps {
  shareId: string | null;
  share: Share | null;
  onClose: () => void;
  onSuccess: () => void;
  onGenerate: (shareId: string, alias: string) => Promise<void>;
}

const generateCustomId = () => customNanoid(10, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");

export function GenerateShareLinkModal({
  shareId,
  share,
  onClose,
  onSuccess,
  onGenerate,
}: GenerateShareLinkModalProps) {
  const t = useTranslations();
  const [alias, setAlias] = useState(() => generateCustomId());
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const host = typeof window === "undefined" ? "" : window.location.host;

  useEffect(() => {
    if (shareId && share?.alias?.alias) {
      setIsEdit(true);
      setAlias(share.alias.alias);
    } else {
      setIsEdit(false);
      setAlias(generateCustomId());
    }
    setGeneratedLink("");
  }, [shareId, share]);

  const handleGenerate = async () => {
    if (!shareId || !alias) return;

    try {
      setIsLoading(true);
      await onGenerate(shareId, alias);
      setGeneratedLink(`${window.location.origin}/s/${alias}`);
      onSuccess();
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
    setIsDownloading(true);
    try {
      await downloadQrCodeAsPng(qrContainerRef.current, `${share?.name || "share"}-qr-code.png`, 200);
    } catch (error) {
      console.error("Failed to download QR code:", error);
      toast.error(t("common.unexpectedError"));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={!!shareId} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("generateShareLink.updateTitle") : t("generateShareLink.generateTitle")}
          </DialogTitle>
          <DialogDescription>
            {generatedLink ? t("shares.calm.modals.linkReady") : t("shares.calm.modals.linkDescription")}
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <form
            id="share-link-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleGenerate();
            }}
          >
            <Field label={t("shares.calm.modals.linkLabel")} htmlFor="share-alias">
              <div className="flex min-w-0 items-center rounded-[var(--radius)] border border-line-2 bg-surface focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15">
                <span className="max-w-[45%] shrink-0 truncate pl-3 font-mono text-[13px] text-ink-3">{host}/s/</span>
                <Input
                  id="share-alias"
                  autoFocus
                  className="border-0 pl-0.5 font-mono text-[13px] focus-visible:ring-0"
                  placeholder={t("generateShareLink.aliasPlaceholder")}
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                />
              </div>
            </Field>
          </form>
        ) : (
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
          {!generatedLink ? (
            <>
              <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" form="share-link-form" disabled={!alias || isLoading}>
                {isEdit ? t("generateShareLink.updateButton") : t("generateShareLink.generateButton")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={downloadQRCode} disabled={isDownloading}>
                <IconDownload />
                {t("shares.calm.modals.downloadQr")}
              </Button>
              <Button onClick={onClose}>{t("common.close")}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
