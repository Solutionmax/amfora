import { useTranslations } from "next-intl";

import { getFileExtension } from "@/utils/file-types";
import { DefaultPreview } from "./default-preview";

interface TextPreviewProps {
  content: string | null;
  fileName: string;
  isLoading?: boolean;
}

export function TextPreview({ content, fileName, isLoading }: TextPreviewProps) {
  const t = useTranslations();
  const extension = getFileExtension(fileName);

  if (isLoading || !content) {
    return <DefaultPreview fileName={fileName} isLoading message={t("filePreview.loading")} />;
  }

  return (
    <div className="max-h-[60dvh] overflow-auto rounded-xl border border-line bg-surface-2">
      <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[12.5px] leading-relaxed text-ink-2">
        <code className={`language-${extension || "text"}`}>{content}</code>
      </pre>
    </div>
  );
}
