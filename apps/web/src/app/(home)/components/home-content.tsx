"use client";

import Link from "next/link";
import { IconArrowUpRight, IconClock, IconDownload, IconLock, IconSparkles } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { Maxim } from "@/components/brand/maxim";
import { Seal } from "@/components/brand/seal";
import { Button } from "@/components/ui/button";
import { HomeContentProps } from "../types";

const rise = (delay: number) => ({
  animate: { opacity: 1, y: 0 },
  initial: { opacity: 0, y: 20 },
  transition: { delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
});

export function HomeContent({ isLoading }: HomeContentProps) {
  const t = useTranslations();

  if (isLoading) {
    return null;
  }

  const points = [
    { label: t("home.points.selfHosted"), icon: IconLock },
    { label: t("home.points.expiry"), icon: IconClock },
    { label: t("home.points.noTracking"), icon: IconDownload },
  ];

  return (
    <main className="flex-grow">
      <section className="relative overflow-hidden border-b border-white/10 bg-[#071827] text-[#f4f1eb]">
        <div className="pointer-events-none absolute -right-40 -top-44 size-[34rem] rounded-full bg-primary/[0.18] blur-3xl" />
        <div className="container relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-28 lg:grid-cols-[1.08fr_0.92fr] lg:pb-28 lg:pt-36">
          <div>
            <motion.p {...rise(0)} className="font-mono text-xs uppercase tracking-[0.28em] text-sky-200/80">
              {t("home.pageTitle")}
            </motion.p>
            <h1 className="mt-5 max-w-3xl font-display text-5xl font-extrabold leading-[0.94] tracking-[-0.04em] sm:text-6xl lg:text-8xl">
              <motion.span {...rise(0.08)} className="block">
                {t("home.header.fileSharing")}
              </motion.span>
              <motion.span {...rise(0.16)} className="block text-sky-200">
                {t("home.header.tagline")}
              </motion.span>
            </h1>
            <motion.p {...rise(0.24)} className="mt-7 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              {t("home.description")}
            </motion.p>
            <motion.div {...rise(0.32)} className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-xl px-7">
                <Link href="/login">
                  {t("login.signIn")} <IconArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-white/25 bg-white/[0.04] px-7 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="#privacy">{t("home.points.noTracking")}</Link>
              </Button>
            </motion.div>
            <div className="mt-12 flex items-center gap-3 text-xs text-white/60">
              <span className="flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sky-200">
                <IconLock className="size-4" />
              </span>
              <span>
                {t("home.points.selfHosted")} · {t("home.points.noTracking")}
              </span>
            </div>
          </div>

          <motion.div {...rise(0.2)} className="relative mx-auto w-full max-w-[440px]">
            <div className="absolute -inset-5 rounded-[2rem] bg-primary/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#102a43] shadow-[0_30px_80px_-42px_rgba(0,0,0,0.7)]">
              <div className="relative h-[28rem] overflow-hidden">
                <img
                  src="/art/amfora-glass.webp"
                  alt=""
                  aria-hidden="true"
                  fetchPriority="high"
                  className="absolute inset-0 size-full object-cover object-[50%_42%] opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071827] via-transparent to-[#071827]/20" />
                <div className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl font-bold tracking-tight">{t("home.header.fileSharing")}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-sky-200/80">
                      {t("share.sealed")}
                    </p>
                  </div>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sky-200">
                    <IconSparkles className="size-4" />
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 text-white/70">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{t("home.points.selfHosted")}</span>
                <IconArrowUpRight className="size-4 text-sky-200" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="privacy" className="border-b bg-background">
        <div className="container mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-[1fr_360px] lg:py-24">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">{t("home.pageTitle")}</p>
            <h2 className="mt-4 max-w-lg font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {t("home.privacyMessage")}
            </h2>

            <ul className="mt-10 grid gap-8 sm:grid-cols-3">
              {points.map(({ label, icon: Icon }, index) => (
                <li key={label} className="flex flex-col gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm leading-relaxed">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-[330px]">
            <div className="rounded-[1.5rem] border bg-card p-6 shadow-[0_30px_70px_-35px_rgba(14,32,54,0.55)]">
              <p className="font-display text-base font-bold tracking-tight">project-files.zip</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">4,2 MB &middot; PDF</p>

              <dl className="mt-4 space-y-2.5 border-t pt-4 font-mono text-[11px]">
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <IconClock className="size-3.5" aria-hidden="true" />
                    {t("home.visual.expires")}
                  </dt>
                  <dd>18-09-2026</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <IconDownload className="size-3.5" aria-hidden="true" />
                    {t("home.visual.downloads")}
                  </dt>
                  <dd>12 / 25</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <IconLock className="size-3.5" aria-hidden="true" />
                    {t("home.visual.password")}
                  </dt>
                  <dd>&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</dd>
                </div>
              </dl>
            </div>
            <Seal className="absolute -right-5 -top-5 h-16 w-16" />
          </div>
        </div>
      </section>

      <section className="bg-secondary/40">
        <div className="container mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
          <Maxim seed="amfora-home" />
          <Button asChild size="lg" className="px-8">
            <Link href="/login">{t("login.signIn")}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
