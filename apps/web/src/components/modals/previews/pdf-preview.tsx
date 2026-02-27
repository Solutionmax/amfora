import { useTranslations } from "next-intl";

import { ScrollArea } from "@/components/ui/scroll-area";

interface PdfPreviewProps {
  src: string;
  fileName: string;
  pdfAsBlob: boolean;
  pdfLoadFailed: boolean;
  onLoadError: () => void;
}

export function PdfPreview({ src, fileName, pdfAsBlob, pdfLoadFailed, onLoadError }: PdfPreviewProps) {
  const t = useTranslations();

  return (
    <ScrollArea className="w-full">
      <div className="w-full min-h-[600px] border rounded-lg overflow-hidden bg-card">
        {pdfAsBlob ? (
          <iframe
            src={`${src}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="w-full h-full min-h-[600px]"
            title={fileName}
            style={{ border: "none" }}
          />
        ) : pdfLoadFailed ? (
          <div className="flex items-center justify-center h-full min-h-[600px]">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-muted-foreground">{t("filePreview.loadingAlternative")}</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full min-h-[600px] relative">
            <object
              data={`${src}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              type="application/pdf"
              className="w-full h-full min-h-[600px]"
              onError={onLoadError}
            >
              <iframe
                src={`${src}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                className="w-full h-full min-h-[600px]"
                title={fileName}
                style={{ border: "none" }}
                onError={onLoadError}
              />
            </object>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
