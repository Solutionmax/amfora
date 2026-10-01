import { useTranslations } from "next-intl";

interface VideoPreviewProps {
  src: string;
}

export function VideoPreview({ src }: VideoPreviewProps) {
  const t = useTranslations();

  return (
    <div className="overflow-hidden rounded-xl bg-surface-2">
      <video controls className="aspect-video max-h-[60dvh] w-full object-contain" preload="metadata">
        <source src={src} />
        {t("filePreview.videoNotSupported")}
      </video>
    </div>
  );
}
