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

  const points = [t("home.points.selfHosted"), t("home.points.expiry"), t("home.points.noTracking")];

  return (
    <main className="flex-grow">
      <div className="container mx-auto max-w-6xl px-6 py-14 lg:py-20">
        <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
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
          </div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 24 }}
            transition={{ delay: 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <img
              src="/art/terrace.jpg"
              alt=""
              width={1920}
              height={1071}
              className="h-[380px] w-full rounded-[2rem] object-cover shadow-[0_30px_70px_-40px_rgba(14,32,54,0.6)]"
            />

            <div className="relative -mt-24 ml-4 w-[300px] rounded-[1.5rem] border bg-card p-6 shadow-[0_24px_60px_-30px_rgba(14,32,54,0.5)] sm:ml-10">
              <p className="font-display text-base font-bold tracking-tight">offerte-2026.pdf</p>
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

              <Seal className="absolute -right-5 -top-5 h-16 w-16" />
            </div>
          </motion.div>
        </div>

        <motion.ul
          {...rise(0.34)}
          className="mt-16 grid gap-6 border-t pt-8 font-mono text-xs text-muted-foreground sm:grid-cols-3"
        >
          {points.map((point) => (
            <li key={point} className="flex items-start gap-3">
              <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              {point}
            </li>
          ))}
        </motion.ul>
      </div>
    </main>
  );
}
