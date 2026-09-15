"use client";

import Link from "next/link";
import { IconClock, IconDownload, IconLock } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { Seal } from "@/components/brand/seal";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { HomeContentProps } from "../types";
import { HomeHeader } from "./home-header";

const rise = (delay: number) => ({
  animate: { opacity: 1, y: 0 },
  initial: { opacity: 0, y: 16 },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
});

export function HomeContent({ isLoading }: HomeContentProps) {
  const t = useTranslations();

  if (isLoading) {
    return null;
  }

  return (
    <main className="flex-grow">
      <div className="container mx-auto flex max-w-6xl flex-col justify-center px-6 py-16 lg:min-h-[calc(100vh-10rem)] lg:py-24">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-20">
          <div className="flex flex-col gap-8">
            <HomeHeader title="Amfora" />

            <motion.p {...rise(0.18)} className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t("home.description")}
            </motion.p>

            <motion.div {...rise(0.24)} className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="px-7">
                <Link href="/login">{t("login.signIn")}</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href={siteConfig.links.docs} target="_blank" rel="noopener noreferrer">
                  {t("home.documentation")}
                </Link>
              </Button>
            </motion.div>

            <motion.p
              {...rise(0.3)}
              className="max-w-md border-l-2 border-seal/40 pl-4 text-sm leading-relaxed text-muted-foreground"
            >
              {t("home.privacyMessage")}
            </motion.p>
          </div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 24 }}
            transition={{ delay: 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto w-full max-w-[360px]"
          >
            <div className="absolute inset-0 -rotate-2 rounded-[1.75rem] bg-secondary" aria-hidden="true" />
            <div className="relative rounded-[1.75rem] border bg-card p-7 shadow-[0_24px_60px_-30px_rgba(14,32,54,0.45)]">
              <p className="font-display text-lg font-bold tracking-tight">offerte-2026.pdf</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">4,2 MB &middot; PDF</p>

              <dl className="mt-6 space-y-3 border-t pt-5 font-mono text-xs">
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <IconClock className="size-4" aria-hidden="true" />
                    {t("home.visual.expires")}
                  </dt>
                  <dd>18-09-2026</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <IconDownload className="size-4" aria-hidden="true" />
                    {t("home.visual.downloads")}
                  </dt>
                  <dd>12 / 25</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <IconLock className="size-4" aria-hidden="true" />
                    {t("home.visual.password")}
                  </dt>
                  <dd>&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</dd>
                </div>
              </dl>
            </div>
            <Seal className="absolute -bottom-7 -right-7" />
          </motion.div>
        </div>
      </div>
    </main>
  );
}
