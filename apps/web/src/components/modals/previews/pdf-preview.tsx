import { IconLoader2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

interface PdfPreviewProps {
  src: string;
  fileName: string;
  pdfAsBlob: boolean;
  pdfLoadFailed: boolean;
  onLoadError: () => void;
}

const FRAME = "h-[65dvh] min-h-[420px] w-full border-0";

export function PdfPreview({ src, fileName, pdfAsBlob, pdfLoadFailed, onLoadError }: PdfPreviewProps) {
  const t = useTranslations();
  const url = `${src}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
      {pdfAsBlob ? (
        <iframe src={url} className={FRAME} title={fileName} />
      ) : pdfLoadFailed ? (
        <div className="flex h-72 flex-col items-center justify-center gap-3 text-[13px] text-ink-3">
          <IconLoader2 size={22} aria-hidden className="animate-spin text-ink-icon" />
          {t("filePreview.loadingAlternative")}
        </div>
      ) : (
        <object data={url} type="application/pdf" className={FRAME} onError={onLoadError}>
          <iframe src={url} className={FRAME} title={fileName} onError={onLoadError} />
        </object>
      )}
    </div>
  );
}
