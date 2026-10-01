"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/brand/brand-mark";
import { useAppInfo } from "@/contexts/app-info-context";

/** Full-screen wait while the app decides where to go: the mark and one quiet line. */
export function LoadingScreen({ label }: { label?: string } = {}) {
  const t = useTranslations();
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-background text-ink"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <BrandMark className="size-9 animate-pulse text-primary motion-reduce:animate-none" />
        <span className="text-[13px] text-ink-3">{label ?? t("common.loading")}</span>
      </div>
    </div>
  );
}

/** A whole-page message (not found, crashed): the mark, one line of type, a way on. */
export function AppState({
  code,
  title,
  text,
  actions,
}: {
  code?: string;
  title: string;
  text: string;
  actions: ReactNode;
}) {
  const { appName } = useAppInfo();

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] bg-background px-4 py-5 text-ink md:px-10 md:py-7">
      <header>
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-md text-ink no-underline outline-none focus-visible:ring-[3px] focus-visible:ring-primary/35"
        >
          <BrandMark className="size-7 shrink-0 text-primary" />
          <span className="font-display text-base font-semibold tracking-[-0.01em]">{appName}</span>
        </Link>
      </header>
      <main className="grid place-items-center pb-[12vh]">
        <div className="w-full max-w-[440px]">
          {code && <p className="font-mono text-[12px] tracking-[0.14em] text-ink-3">{code}</p>}
          <h1 className="mt-2 break-words font-display text-[28px] font-bold leading-tight tracking-[-0.02em] md:text-[30px]">
            {title}
          </h1>
          <p className="mt-2 text-ink-3">{text}</p>
          <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div>
        </div>
      </main>
    </div>
  );
}
