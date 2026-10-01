"use client";

import { useEffect, useState } from "react";
import { IconDownload, IconMaximize, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";

interface ImagePreviewProps {
  src: string;
  alt: string;
  description?: string;
  onDownload?: () => void;
}

export function ImagePreview({ src, alt, description, onDownload }: ImagePreviewProps) {
  const t = useTranslations();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleExpandClick = () => {
    setIsFullscreen(true);
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      const link = document.createElement("a");
      link.href = src;
      link.download = alt;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isFullscreen]);

  return (
    <>
      <div className="group relative grid place-items-center overflow-hidden rounded-xl bg-surface-2">
        <img
          src={src}
          alt={alt}
          className="max-h-[60dvh] w-auto max-w-full cursor-zoom-in object-contain"
          onClick={handleExpandClick}
        />
        <Button
          variant="outline"
          size="icon"
          aria-label={t("files.calm.fullScreen")}
          className="absolute bottom-3 right-3 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
          onClick={handleExpandClick}
        >
          <IconMaximize />
        </Button>
      </div>

      {isFullscreen &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-sm"
            onClick={handleBackdropClick}
            style={{ margin: 0, padding: 0 }}
          >
            <div className="fixed top-0 left-0 right-0 bg-transparent h-24 z-[100000] pointer-events-none">
              <div className="absolute top-6 right-6 flex gap-2 pointer-events-auto">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("common.download")}
                  className="h-10 w-10 cursor-pointer border-white/20 bg-white/10 text-white hover:bg-white/20 [&_svg]:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                >
                  <IconDownload className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("common.close")}
                  className="h-10 w-10 cursor-pointer border-white/20 bg-white/10 text-white hover:bg-white/20 [&_svg]:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseFullscreen();
                  }}
                >
                  <IconX className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <div className="fixed inset-0 flex items-center justify-center pt-6">
              <div className="relative max-w-full max-h-full">
                <img
                  src={src}
                  alt={alt}
                  className="max-w-full max-h-screen w-auto h-screen object-contain pb-12"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-[100000] pointer-events-none">
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="text-white/60">
                  <span className="mb-2 truncate font-semibold">{alt}</span>
                  {description && <p className="line-clamp-2 text-sm text-white/40">{description}</p>}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
