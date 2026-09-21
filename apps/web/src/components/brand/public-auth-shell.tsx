"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { IconClock, IconFileUpload, IconLock, IconNorthStar, IconSparkles } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { useAppInfo } from "@/contexts/app-info-context";

function WorkflowStep({ icon: Icon, label }: { icon: typeof IconFileUpload; label: string }) {
  return (
    <div className="rounded-2xl border border-[#dce1dd] bg-white/70 p-4 dark:border-border dark:bg-card/70">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <span className="mt-4 block text-xs font-semibold leading-5 text-[#33465b] dark:text-foreground">{label}</span>
    </div>
  );
}

export function PublicAuthShell({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  const t = useTranslations();
  const { appName } = useAppInfo();

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <header className="mx-auto flex w-[calc(100%-2.5rem)] max-w-7xl items-center justify-between border-b border-[#dce1dd] py-5 dark:border-border sm:w-[calc(100%-4rem)] sm:py-7">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <BrandMark className="size-9 shrink-0 text-primary" />
          <span className="truncate font-display text-xl font-bold tracking-tight sm:text-2xl">{appName}</span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[#dce1dd] bg-white p-1 shadow-sm dark:border-border dark:bg-card">
          <LanguageSwitcher />
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto grid w-[calc(100%-2.5rem)] max-w-7xl items-center gap-10 py-10 sm:w-[calc(100%-4rem)] sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,500px)] lg:gap-20 lg:py-16">
        <aside className="relative hidden min-w-0 lg:block">
          <div className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative max-w-xl">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
            <h2 className="mt-6 max-w-lg font-display text-6xl font-extrabold leading-[0.94] tracking-[-0.055em] xl:text-7xl">
              {t("home.header.fileSharing")} <span className="text-primary">{t("home.header.tagline")}</span>
            </h2>
            <p className="mt-7 max-w-md text-base leading-7 text-[#566577] dark:text-muted-foreground">
              {t("home.description")}
            </p>

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-3" aria-label={t("home.pageTitle")}>
              <WorkflowStep icon={IconFileUpload} label={t("home.header.fileSharing")} />
              <WorkflowStep icon={IconLock} label={t("share.sealed")} />
              <WorkflowStep icon={IconClock} label={t("home.visual.expires")} />
            </div>

            <div className="mt-10 flex items-center gap-3 border-t border-[#dce1dd] pt-5 text-sm text-[#566577] dark:border-border dark:text-muted-foreground">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconNorthStar className="size-4" />
              </span>
              <span>{t("home.points.selfHosted")}</span>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 justify-center">
          <div className="w-full rounded-[1.75rem] border border-[#dce1dd] bg-white p-6 shadow-[0_24px_70px_-38px_rgba(17,36,58,0.45)] dark:border-border dark:bg-card sm:p-10">
            {children}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-[calc(100%-2.5rem)] max-w-7xl items-center gap-4 pb-6 text-xs text-[#778595] dark:text-muted-foreground sm:w-[calc(100%-4rem)] sm:pb-8">
        <span className="font-display font-semibold">{appName}</span>
        <span className="h-px flex-1 bg-[#dce1dd] dark:bg-border" />
        <IconSparkles className="size-4" aria-hidden="true" />
      </footer>
    </div>
  );
}
