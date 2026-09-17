"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { IconArrowDownLeft, IconArrowUpRight } from "@tabler/icons-react";

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
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className="flex min-w-0 items-center gap-3 text-white">
          {appLogo ? (
            <img alt="" className="size-9 shrink-0 rounded-lg bg-white/95 p-1 object-contain" src={appLogo} />
          ) : (
            <AmphoraMark className="size-9 shrink-0 text-sky-300" />
          )}
          <span className="truncate font-display text-2xl font-bold tracking-tight">{appName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] p-1 text-white [&_button]:text-white [&_button:hover]:bg-white/10">
          <LanguageSwitcher />
          <ModeToggle />
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <img src="/art/amfora-glass.webp" alt="" aria-hidden="true" fetchPriority="high" className={styles.art} />
          <div className={styles.headline}>
            <p className="mb-5 flex items-center gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-sky-200/80">
              <span className="h-px w-7 bg-sky-200/60" />
              {label}
            </p>
            <h1 className={styles.title}>{title}</h1>
          </div>
          <div className={styles.signature}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20">
              <Arrow className="size-5 text-sky-200" strokeWidth={1.5} />
            </span>
            <p className="max-w-64 text-sm leading-6 text-slate-300">{caption}</p>
          </div>
        </section>

        <section className={styles.workspace} aria-label={label}>
          <div className="h-1 w-16 rounded-full bg-primary/70" aria-hidden="true" />
          <div className="mt-7">{children}</div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className="truncate font-display text-sm font-semibold tracking-tight">{appName}</span>
        <span className="h-px flex-1 bg-white/10" />
        <Arrow className="size-4 shrink-0" aria-hidden="true" />
      </footer>
    </div>
  );
}
