"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconClock, IconDownload, IconLock } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { Maxim } from "@/components/brand/maxim";
import { Seal } from "@/components/brand/seal";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { HomeContentProps } from "../types";
import { HomeHeader } from "./home-header";

// A different view of the same world on every visit.
const ARTWORK = ["/art/sea.jpg", "/art/terrace.jpg", "/art/wall.jpg", "/art/vault.jpg"];

const rise = (delay: number) => ({
  animate: { opacity: 1, y: 0 },
  initial: { opacity: 0, y: 16 },
  transition: { delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
});

export function HomeContent({ isLoading }: HomeContentProps) {
  const t = useTranslations();
  const [artwork, setArtwork] = useState(ARTWORK[0]);

  // Picked after mount so the server and the client agree on the first paint.
  useEffect(() => {
    setArtwork(ARTWORK[Math.floor(Math.random() * ARTWORK.length)]);
  }, []);

  if (isLoading) {
    return null;
  }

  const points = [t("home.points.selfHosted"), t("home.points.expiry"), t("home.points.noTracking")];

  return (
    <main className="flex-grow">
      {/* Hero: text on sand, artwork bleeding off the right edge, the share card straddling the seam. */}
      <section className="relative overflow-hidden lg:min-h-[calc(100vh-4rem)]">
        <div className="absolute inset-y-0 right-0 hidden w-[44%] lg:block">
          <motion.img
            key={artwork}
            src={artwork}
            alt=""
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent" />
        </div>

        <div className="container relative mx-auto flex max-w-6xl flex-col justify-center gap-12 px-6 py-16 lg:min-h-[calc(100vh-4rem)] lg:py-20">
          <div className="max-w-2xl">
            <HomeHeader title="Amfora" />

            <motion.p {...rise(0.18)} className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">
              {t("home.description")}
            </motion.p>

            <motion.div {...rise(0.24)} className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="px-8">
                <Link href="/login">{t("login.signIn")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={siteConfig.links.docs} target="_blank" rel="noopener noreferrer">
                  {t("home.documentation")}
                </Link>
              </Button>
            </motion.div>
          </div>

          <motion.div {...rise(0.34)} className="relative w-full max-w-[330px] lg:ml-auto lg:mr-6">
            <div className="rounded-[1.5rem] border bg-card p-6 shadow-[0_30px_70px_-35px_rgba(14,32,54,0.55)]">
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
            </div>
            <Seal className="absolute -right-5 -top-5 h-16 w-16" />
          </motion.div>
        </div>
      </section>

      <section className="border-t bg-secondary/50">
        <div className="container mx-auto max-w-6xl px-6 py-12">
          <ul className="grid gap-6 font-mono text-xs text-muted-foreground sm:grid-cols-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-6 border-t pt-8 sm:flex-row sm:items-end sm:justify-between">
            <Maxim seed="amfora-home" />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t("home.privacyMessage")}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
