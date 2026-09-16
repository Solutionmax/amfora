"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowDown, IconClock, IconDownload, IconLock } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { Maxim } from "@/components/brand/maxim";
import { Seal } from "@/components/brand/seal";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { HomeContentProps } from "../types";

// A different view of the same world on every visit.
const ARTWORK = ["/art/sea.jpg", "/art/vault.jpg", "/art/terrace.jpg", "/art/wall.jpg"];

const rise = (delay: number) => ({
  animate: { opacity: 1, y: 0 },
  initial: { opacity: 0, y: 20 },
  transition: { delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
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

  const points = [
    { label: t("home.points.selfHosted"), icon: IconLock },
    { label: t("home.points.expiry"), icon: IconClock },
    { label: t("home.points.noTracking"), icon: IconDownload },
  ];

  return (
    <main className="-mt-16 flex-grow">
      {/* The artwork is the whole first screen. Everything else waits below the fold. */}
      <section className="relative flex min-h-screen flex-col justify-end overflow-hidden">
        <motion.img
          key={artwork}
          src={artwork}
          alt=""
          animate={{ opacity: 1, scale: 1 }}
          initial={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1626]/95 via-[#0B1626]/55 to-[#0B1626]/25" />

        <div className="container relative mx-auto max-w-6xl px-6 pb-20 pt-32 text-background">
          <motion.p {...rise(0)} className="font-mono text-xs uppercase tracking-[0.3em] opacity-70">
            Amfora
          </motion.p>

          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            <motion.span {...rise(0.08)} className="block">
              {t("home.header.fileSharing")}
            </motion.span>
            <motion.span {...rise(0.16)} className="block opacity-60">
              {t("home.header.tagline")}
            </motion.span>
          </h1>

          <motion.p {...rise(0.24)} className="mt-7 max-w-lg text-lg leading-relaxed opacity-85">
            {t("home.description")}
          </motion.p>

          <motion.div {...rise(0.32)} className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="px-8">
              <Link href="/login">{t("login.signIn")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-background/40 bg-transparent text-background hover:bg-background/10 hover:text-background"
            >
              <Link href={siteConfig.links.docs} target="_blank" rel="noopener noreferrer">
                {t("home.documentation")}
              </Link>
            </Button>
          </motion.div>
        </div>

        <motion.div {...rise(0.5)} className="relative pb-8 text-center text-background/60">
          <IconArrowDown className="mx-auto size-5 animate-bounce" aria-hidden="true" />
        </motion.div>
      </section>

      {/* What you actually get, next to the thing the recipient sees. */}
      <section className="border-b bg-background">
        <div className="container mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="max-w-lg font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {t("home.privacyMessage")}
            </h2>

            <ul className="mt-10 grid gap-8 sm:grid-cols-3">
              {points.map(({ label, icon: Icon }, index) => (
                <li key={label} className="flex flex-col gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary">
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
