"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { IconArrowUpRight } from "@tabler/icons-react";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { useAppInfo } from "@/contexts/app-info-context";
import styles from "./transfer-shell.module.css";

/** A blue envelope for sending; an opened letter for receiving. */
export function TransferShell({
  direction,
  title,
  label,
  aside,
  children,
}: {
  direction: "upload" | "download";
  title: string;
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const { appName, appLogo } = useAppInfo();
  return (
    <div className={styles.shell} data-direction={direction}>
      <header className={styles.header}>
        <Link href="/" className="flex min-w-0 items-center gap-3 text-foreground">
          {appLogo ? (
            <img alt="" className="size-9 shrink-0 object-contain" src={appLogo} />
          ) : (
            <AmphoraMark className="size-9 shrink-0 text-primary" />
          )}
          <span className="truncate font-display text-2xl font-bold tracking-tight">{appName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 text-foreground">
          <LanguageSwitcher />
          <ModeToggle />
        </div>
      </header>
      <main className={styles.main} data-has-aside={!!aside}>
        <div className={styles.hero}>
          <h1 className={styles.title}>{title}</h1>
        </div>
        <section className={styles.envelope} aria-label={label}>
          <div className={styles.paper} aria-hidden="true">
            <AmphoraMark />
          </div>
          <div className={styles.workspace}>
            {direction === "download" && (
              <div className={styles.stamp} aria-hidden="true">
                <AmphoraMark />
              </div>
            )}
            {children}
          </div>
        </section>
        {aside && <div className={styles.aside}>{aside}</div>}
      </main>
      <footer className={styles.footer}>
        <a className={styles.credit} href="https://amfora.solutionmax.net/" target="_blank" rel="noopener noreferrer">
          <AmphoraMark className="h-7 w-6 text-primary" aria-hidden="true" />
          <span>
            Powered by <strong>Amfora</strong>
          </span>
          <IconArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
