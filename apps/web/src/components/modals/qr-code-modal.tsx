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

/** The QR code sits on a white tile on purpose: scanners need dark on light, also in dark mode. */
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
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{t("qrCodeModal.title")}</DialogTitle>
          <DialogDescription>{t("shares.calm.modals.qrDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div ref={qrContainerRef} className="max-w-full rounded-xl border border-line bg-white p-4">
            <QRCode
              value={shareLink}
              size={224}
              level="H"
              fgColor="#000000"
              bgColor="#FFFFFF"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>
          <p className="max-w-full break-all text-center font-mono text-[12.5px] text-ink-3">{shareLink}</p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button onClick={downloadQRCode} disabled={isDownloading}>
            <IconDownload />
            {t("shares.calm.modals.downloadQr")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
