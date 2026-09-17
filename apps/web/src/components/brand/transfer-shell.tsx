"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { IconArrowDownLeft, IconArrowUpRight, IconFileText, IconFolder, IconNorthStar } from "@tabler/icons-react";

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
  const Arrow = direction === "upload" ? IconArrowUpRight : IconArrowDownLeft;

  return (
    <div className={styles.shell} data-direction={direction}>
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
            <p className={styles.eyebrow}>
              <Arrow className="size-4" aria-hidden="true" />
              {label}
            </p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.caption}>{caption}</p>
          </div>
          <div className={styles.artwork} aria-hidden="true">
            <div className={styles.orbit} />
            <div className={styles.artworkMark}>{appLogo ? <img src={appLogo} alt="" /> : <AmphoraMark />}</div>
            <div className={styles.fileTile}>
              <IconFileText strokeWidth={1.3} />
              <span />
              <span />
            </div>
            <div className={styles.folderTile}>
              <IconFolder strokeWidth={1.3} />
            </div>
            <div className={styles.directionBadge}>
              <Arrow strokeWidth={1.5} />
            </div>
            <div className={styles.artworkRule} />
          </div>
          <div className={styles.signature}>
            <span>{appName}</span>
            <span className={styles.signatureLine} />
            <Arrow className="size-5 shrink-0" aria-hidden="true" />
          </div>
        </section>

        <section className={styles.workspace} aria-label={label}>
          <div className={styles.workspaceAccent} aria-hidden="true" />
          {children}
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
