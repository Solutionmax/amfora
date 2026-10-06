"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { VesselLayout } from "@/app/(shares)/r/[alias]/components/vessel-layout";
import { ShareStage } from "@/app/(shares)/s/[alias]/components/share-stage";
import { PasswordLoginForm } from "@/app/login/components/login-form";
import { PasskeySignIn } from "@/app/login/components/passkey-sign-in";
import { SignInCard, signInStory } from "@/app/login/components/sign-in-view";
import { PublicPreviewContext, type PublicPreview } from "@/components/brand/public-preview";
import { PublicShell, type PublicStory } from "@/components/brand/public-shell";
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
export function usePageSize() {
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
export function ScaledPage({ size, children }: { size: { width: number; height: number }; children: ReactNode }) {
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
export function SampleDownloadPage({ preview }: { preview: PublicPreview }) {
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

export function BrowserFrame({ children }: { children: ReactNode }) {
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

/** The real sign in page for a name, line and credit that are not saved yet. No server is asked and nothing is submitted. */
export function SampleSignInPage({ preview }: { preview: PublicPreview }) {
  const t = useTranslations();

  return (
    <PublicPreviewContext.Provider value={preview}>
      <PublicShell
        story={signInStory(t, { firstAccess: false, text: preview.description || undefined })}
        card={
          <SignInCard appName={preview.name}>
            <PasswordLoginForm
              isVisible={false}
              onToggleVisibility={() => undefined}
              onSubmit={doNothing}
              passwordAuthEnabled
            />
            <PasskeySignIn onSignIn={() => undefined} isBusy={false} />
          </SignInCard>
        }
      />
    </PublicPreviewContext.Provider>
  );
}

/** The real receive page for a link that does not exist. */
export function SampleReceivePage({ preview }: { preview: PublicPreview }) {
  const t = useTranslations();
  const reverseShare = {
    id: "preview-receive",
    name: t("customization.v2.preview.sample.receiveName"),
    description: t("customization.v2.preview.sample.receiveDescription"),
    maxFiles: null,
    maxFileSize: 200 * MB,
    allowedFileTypes: null,
    pageLayout: "DEFAULT",
    hasPassword: false,
    currentFileCount: 0,
    nameFieldRequired: "OPTIONAL",
    emailFieldRequired: "OPTIONAL",
  };

  return (
    <PublicPreviewContext.Provider value={preview}>
      <VesselLayout
        reverseShare={reverseShare}
        password=""
        alias="preview"
        isMaxFilesReached={false}
        hasUploadedSuccessfully={false}
        onUploadSuccess={() => undefined}
        isLinkInactive={false}
        isLinkNotFound={false}
        isLinkExpired={false}
      />
    </PublicPreviewContext.Provider>
  );
}

export const PREVIEW_PAGES = ["download", "signIn", "receive"] as const;
export type PreviewPageId = (typeof PREVIEW_PAGES)[number];

export function SamplePage({ page, preview }: { page: PreviewPageId; preview: PublicPreview }) {
  if (page === "signIn") return <SampleSignInPage preview={preview} />;
  if (page === "receive") return <SampleReceivePage preview={preview} />;

  return <SampleDownloadPage preview={preview} />;
}
