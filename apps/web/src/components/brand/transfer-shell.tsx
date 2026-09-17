"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { IconArrowDownLeft, IconArrowUpRight, IconClock, IconLock, IconNorthStar } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { useAppInfo } from "@/contexts/app-info-context";
import styles from "./transfer-shell.module.css";

/** The public-facing Amfora identity, shared by both directions of a transfer. */
export function TransferShell({
  direction,
  title,
  caption,
  label,
  children,
}: {
  direction: "upload" | "download";
  title: string;
  caption: string;
  label: string;
  children: ReactNode;
}) {
  const { appName, appLogo } = useAppInfo();
  const t = useTranslations();
  const Arrow = direction === "upload" ? IconArrowUpRight : IconArrowDownLeft;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className="flex min-w-0 items-center gap-3 text-foreground">
          {appLogo ? (
            <img
              alt=""
              className="size-9 shrink-0 rounded-xl border border-border bg-card p-1 object-contain"
              src={appLogo}
            />
          ) : (
            <AmphoraMark className="size-9 shrink-0 text-primary" />
          )}
          <span className="truncate font-display text-2xl font-bold tracking-tight">{appName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1 text-foreground shadow-sm">
          <LanguageSwitcher />
          <ModeToggle />
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.headline}>
            <p className="mb-5 flex items-center gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-primary">
              <span className="h-px w-7 bg-primary/50" />
              {label}
            </p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.caption}>{caption}</p>
          </div>
          <div className={styles.journey} aria-hidden="true">
            <div className={styles.journeyStep}>
              <span className={styles.journeyIcon}>
                <Arrow className="size-5" strokeWidth={1.7} />
              </span>
              <span>{label}</span>
            </div>
            <span className={styles.journeyLine} />
            <div className={styles.journeyStep}>
              <span className={styles.journeyIcon}>
                <IconLock className="size-5" strokeWidth={1.7} />
              </span>
              <span>{t("share.sealed")}</span>
            </div>
            <span className={styles.journeyLine} />
            <div className={styles.journeyStep}>
              <span className={styles.journeyIcon}>
                <IconClock className="size-5" strokeWidth={1.7} />
              </span>
              <span>{t("home.visual.expires")}</span>
            </div>
          </div>
        </section>

        <section className={styles.workspace} aria-label={label}>
          <div className="h-1 w-16 rounded-full bg-primary/70" aria-hidden="true" />
          <div className="mt-7">{children}</div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className="truncate font-display text-sm font-semibold tracking-tight">{appName}</span>
        <span className="h-px flex-1 bg-border" />
        <IconNorthStar className="size-4 shrink-0" aria-hidden="true" />
      </footer>
    </div>
  );
}
