import { useRef, useState } from "react";
import { IconDownload } from "@tabler/icons-react";
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
import { downloadQrCodeAsPng } from "@/lib/qr-code";

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareLink: string;
  shareName: string;
}

export function QrCodeModal({ isOpen, onClose, shareLink, shareName }: QrCodeModalProps) {
  const t = useTranslations();
  const [isDownloading, setIsDownloading] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const downloadQRCode = async () => {
    setIsDownloading(true);
    try {
      await downloadQrCodeAsPng(qrContainerRef.current, `${shareName}-qr-code.png`);
    } catch (error) {
      console.error("Failed to download QR code:", error);
      toast.error(t("common.unexpectedError"));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("qrCodeModal.title", { defaultValue: "Share QR Code" })}</DialogTitle>
          <DialogDescription>
            {t("qrCodeModal.description", { defaultValue: "Scan this QR code to access the shared files." })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center">
          <div ref={qrContainerRef} className="max-w-full rounded-lg bg-white p-4">
            <QRCode
              value={shareLink}
              size={256}
              level="H"
              fgColor="#000000"
              bgColor="#FFFFFF"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground text-center max-w-full break-all">{shareLink}</p>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onClose} className="mt-2 sm:mt-0">
            {t("common.close")}
          </Button>
          <Button onClick={downloadQRCode} className="mt-2 sm:mt-0" disabled={isDownloading}>
            <IconDownload className="h-4 w-4" />
            {t("qrCodeModal.download", { defaultValue: "Download QR Code" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
