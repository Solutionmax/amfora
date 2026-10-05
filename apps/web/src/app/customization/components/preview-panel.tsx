"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconArrowsMaximize } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";

import { ShareStage } from "@/app/(shares)/s/[alias]/components/share-stage";
import { PublicPreviewContext, type PublicPreview } from "@/components/brand/public-preview";
import { PublicShell, type PublicStory } from "@/components/brand/public-shell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatFileSize } from "@/utils/format-file-size";

const MB = 1024 * 1024;

/** The share a visitor opens in the preview. Nothing here exists on the server. */
const SAMPLE_FILES = [
  { id: "preview-1", name: "poster-a2-print.pdf", size: 14.5 * MB, objectName: "preview/poster-a2-print.pdf" },
  { id: "preview-2", name: "launch-video.mp4", size: 220.3 * MB, objectName: "preview/launch-video.mp4" },
];
const SAMPLE_LEFT = { days: 6, hours: 14, minutes: 21 };

/** The page is drawn at the size of a real screen and scaled down to the room there is. */
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 760 };
/** From this width the public pages put the story and the card side by side (Tailwind lg). */
const WIDE_QUERY = "(min-width: 1024px)";

const doNothing = async () => undefined;

/** The public pages follow the browser window, so the preview draws the layout the window gets. */
function usePageSize() {
  const [size, setSize] = useState(DESKTOP);

  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY);
    const update = () => setSize(query.matches ? DESKTOP : PHONE);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return size;
}

/**
 * A page at full size inside a box of any width: the box keeps the proportions of the page and
 * the page is scaled to fit. Nothing in it can be clicked or reached with the keyboard.
 */
function ScaledPage({ size, children }: { size: { width: number; height: number }; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const element = box.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / size.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [size.width]);

  return (
    <div
      ref={box}
      className="relative w-full overflow-hidden bg-background"
      style={{ aspectRatio: `${size.width} / ${size.height}` }}
    >
      {scale > 0 && (
        <div
          inert
          aria-hidden="true"
          className="absolute left-0 top-0 origin-top-left overflow-hidden"
          style={{
            width: size.width,
            height: size.height,
            transform: `scale(${scale})`,
            ["--page-height" as string]: `${size.height}px`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** The real download page with a share that does not exist, in the theme, name and credit of the draft. */
function SampleDownloadPage({ preview }: { preview: PublicPreview }) {
  const t = useTranslations();
  const locale = useLocale();
  const [sharedAt] = useState(() => new Date());

  const totalBytes = SAMPLE_FILES.reduce((sum, file) => sum + file.size, 0);
  const readyTitle = `${t("public.download.title", { count: SAMPLE_FILES.length })} ${t("public.download.accent")}`;
  const story: PublicStory = {
    sender: {
      name: preview.name,
      action: t("public.stage.shared"),
      line: new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(sharedAt),
    },
    headline: readyTitle,
    title: readyTitle,
    facts: [
      { label: t("public.stage.availableFor"), value: t("public.stage.left", SAMPLE_LEFT), wide: true },
      { label: t("public.stage.total"), value: formatFileSize(totalBytes) },
      { label: t("public.stage.files"), value: SAMPLE_FILES.length },
    ],
  };

  return (
    <PublicPreviewContext.Provider value={preview}>
      <PublicShell
        story={story}
        footnote={t("public.stage.sharedSecurely")}
        card={
          <ShareStage
            files={SAMPLE_FILES}
            folders={[]}
            onDownload={doNothing}
            onDownloadFolder={doNothing}
            onBulkDownload={doNothing}
            onPreview={() => undefined}
          />
        }
      />
    </PublicPreviewContext.Provider>
  );
}

function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line">
      <div aria-hidden="true" className="flex gap-1.5 border-b border-line bg-surface-2 px-3 py-2">
        <i className="size-1.5 rounded-full bg-line-2" />
        <i className="size-1.5 rounded-full bg-line-2" />
        <i className="size-1.5 rounded-full bg-line-2" />
      </div>
      {children}
    </div>
  );
}

/**
 * The download page as a visitor gets it, small, in a quiet browser frame. It is the real page,
 * drawn with the draft: theme, name and credit show before saving, and so do colour, corners
 * and font, which the form applies to the whole document. Pressing it opens it large.
 */
export function PreviewPanel({ name, theme, showCredit }: PublicPreview) {
  const t = useTranslations();
  const size = usePageSize();
  const [isLarge, setIsLarge] = useState(false);
  const preview: PublicPreview = { name, theme, showCredit };
  const themeName = t(`customization.v2.theme.${theme}`);

  return (
    <aside aria-label={t("customization.v2.preview.title")}>
      <div className="mb-2.5 flex items-center justify-between gap-3 text-[12.5px] text-ink-3">
        <span>{t("customization.v2.preview.title")}</span>
        <span className="truncate">
          {t("customization.v2.preview.page")} · {themeName}
        </span>
      </div>
      <div className="group relative" data-testid="preview-page" data-theme={theme}>
        <BrowserFrame>
          <ScaledPage size={size}>
            <SampleDownloadPage preview={preview} />
          </ScaledPage>
        </BrowserFrame>
        <button
          type="button"
          onClick={() => setIsLarge(true)}
          aria-label={t("customization.calm.previewEnlarge")}
          className="absolute inset-0 cursor-zoom-in rounded-[14px] outline-none focus-visible:ring-[3px] focus-visible:ring-primary/35"
        >
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-2 opacity-0 shadow-[0_1px_2px_rgba(14,32,54,.08)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            <IconArrowsMaximize className="size-3.5 text-ink-icon" aria-hidden="true" />
            {t("customization.calm.previewEnlarge")}
          </span>
        </button>
      </div>

      <Dialog open={isLarge} onOpenChange={setIsLarge}>
        <DialogContent className="sm:max-w-[min(1180px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>{t("customization.v2.preview.title")}</DialogTitle>
            <DialogDescription>
              {t("customization.v2.preview.page")} · {themeName}
            </DialogDescription>
          </DialogHeader>
          <div data-testid="preview-page-large">
            <BrowserFrame>
              <ScaledPage size={size}>
                <SampleDownloadPage preview={preview} />
              </ScaledPage>
            </BrowserFrame>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
