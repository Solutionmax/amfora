"use client";

import { useState } from "react";
import { IconArrowsMaximize } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import type { PublicPreview } from "@/components/brand/public-preview";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionLayout } from "@/components/ui/section-layout";
import { BrowserFrame, PREVIEW_PAGES, SamplePage, ScaledPage, usePageSize, type PreviewPageId } from "./preview-pages";

/**
 * A public page as a visitor gets it, small, in a quiet browser frame: Download, Sign in or
 * Receive, picked with the tabs above. It is the real page, drawn with the draft: theme, name and
 * credit show before saving, and so do colour, corners and font, which the form applies to the
 * whole document. Pressing it opens it large, on the same page.
 */
export function PreviewPanel({ name, description, theme, showCredit }: PublicPreview) {
  const t = useTranslations();
  const size = usePageSize();
  const [isLarge, setIsLarge] = useState(false);
  const [page, setPage] = useState<PreviewPageId>("download");
  const preview: PublicPreview = { name, description, theme, showCredit };
  const themeName = t(`customization.v2.theme.${theme}`);
  const pageName = t(`customization.v2.preview.pages.${page}`);
  const tabs = PREVIEW_PAGES.map((id) => ({ id, label: t(`customization.v2.preview.tabs.${id}`) }));

  return (
    <aside aria-label={t("customization.v2.preview.title")}>
      <SectionLayout
        sections={tabs}
        activeId={page}
        onSelect={(id) => setPage(id as PreviewPageId)}
        label={t("customization.v2.preview.tabsLabel")}
        navClassName="mb-4"
      >
        <div className="mb-2.5 flex items-center justify-between gap-3 text-[12.5px] text-ink-3">
          <span>{t("customization.v2.preview.title")}</span>
          <span className="truncate" data-testid="preview-label">
            {pageName} · {themeName}
          </span>
        </div>
        <div className="group relative" data-testid="preview-page" data-theme={theme} data-page={page}>
          <BrowserFrame>
            <ScaledPage size={size}>
              <SamplePage page={page} preview={preview} />
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
      </SectionLayout>

      <Dialog open={isLarge} onOpenChange={setIsLarge}>
        <DialogContent className="sm:max-w-[min(1180px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>{t("customization.v2.preview.title")}</DialogTitle>
            <DialogDescription>
              {pageName} · {themeName}
            </DialogDescription>
          </DialogHeader>
          <div data-testid="preview-page-large" data-page={page}>
            <BrowserFrame>
              <ScaledPage size={size}>
                <SamplePage page={page} preview={preview} />
              </ScaledPage>
            </BrowserFrame>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
