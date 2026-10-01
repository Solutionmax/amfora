"use client";

import { useState } from "react";
import { IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

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
import { formatFileSize } from "@/utils/format-file-size";

interface BulkItem {
  id: string;
  name: string;
  size?: number;
  type: "file" | "folder";
}

interface BulkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (zipName: string) => void;
  items?: BulkItem[];
}

export function BulkDownloadModal({ isOpen, onClose, onDownload, items = [] }: BulkDownloadModalProps) {
  const t = useTranslations();
  const [zipName, setZipName] = useState("");

  const files = items.filter((item) => item.type === "file").length;
  const folders = items.length - files;
  const totalSize = items.reduce((sum, item) => sum + Number(item.size || 0), 0);

  const handleClose = () => {
    onClose();
    setZipName("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (zipName.trim()) {
      onDownload(zipName.trim());
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("files.calm.zipTitle")}</DialogTitle>
          <DialogDescription>
            {t("files.calm.zipSummary", { files, folders })}
            {totalSize > 0 && ` · ${formatFileSize(totalSize)}`}
          </DialogDescription>
        </DialogHeader>

        <form id="bulk-download-form" onSubmit={handleSubmit}>
          <Field label={t("bulkDownload.zipNameLabel")} htmlFor="zipName">
            <div className="relative flex items-center">
              <Input
                id="zipName"
                value={zipName}
                onChange={(e) => setZipName(e.target.value)}
                placeholder={t("bulkDownload.zipNamePlaceholder")}
                className="pr-12"
                autoFocus
              />
              <span className="pointer-events-none absolute right-3 text-[13px] text-ink-3">.zip</span>
            </div>
          </Field>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="bulk-download-form" disabled={!zipName.trim()}>
            <IconDownload />
            {t("bulkDownload.download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
