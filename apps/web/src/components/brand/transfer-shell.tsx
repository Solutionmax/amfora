"use client";

import { Fragment, ReactNode } from "react";
import Link from "next/link";
import { IconFileText, IconFileZip, IconPhoto } from "@tabler/icons-react";

import { BrandCredit } from "@/components/brand/brand-credit";
import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { useAppInfo } from "@/contexts/app-info-context";
import styles from "./transfer-shell.module.css";

/** Shared postal identity for public transfers and sign-in. */
export function TransferShell({
  direction,
  title,
  label,
  aside,
  children,
}: {
  direction: "upload" | "download" | "login";
  title: string;
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const { appName } = useAppInfo();
  return (
    <div className={styles.shell} data-direction={direction}>
      <header className={styles.header}>
        <Link href="/" className="flex min-w-0 items-center gap-3 text-foreground">
          <BrandMark className="size-9 shrink-0 text-primary" />
          <span className="truncate font-display text-2xl font-bold tracking-tight">{appName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 text-foreground">
          <LanguageSwitcher />
          <ModeToggle />
        </div>
      </header>
      <main className={styles.main} data-has-aside={!!aside}>
        <div className={styles.hero}>
          <h1 className={styles.title}>
            {title.split("\n").map((line, index) => (
              <Fragment key={index}>
                {index > 0 && "\n"}
                <span>{line}</span>
              </Fragment>
            ))}
          </h1>
          <div className={styles.deliveryTrail} aria-hidden="true">
            <span className={styles.trailFile}>
              <IconFileText strokeWidth={1.4} />
            </span>
            <span className={styles.trailFile}>
              <IconPhoto strokeWidth={1.4} />
            </span>
            <span className={styles.trailLine} />
            <span className={styles.trailSeal}>
              <BrandMark />
            </span>
          </div>
        </div>
        <section className={styles.envelope} aria-label={label}>
          <div className={styles.paper} aria-hidden="true">
            <BrandMark />
          </div>
          <div className={styles.filePeek} aria-hidden="true">
            <IconFileText strokeWidth={1.3} />
            <span />
            <span />
          </div>
          <div className={styles.photoPeek} aria-hidden="true">
            <IconPhoto strokeWidth={1.2} />
          </div>
          <div className={styles.archivePeek} aria-hidden="true">
            <IconFileZip strokeWidth={1.3} />
          </div>
          <div className={styles.workspace}>
            {direction !== "upload" && (
              <div className={styles.stamp} aria-hidden="true">
                <BrandMark />
                <svg className={styles.postmark} viewBox="0 0 120 44" fill="none">
                  <path
                    d="M2 10 Q17 0 32 10 T62 10 T92 10 T122 10 M2 22 Q17 12 32 22 T62 22 T92 22 T122 22 M2 34 Q17 24 32 34 T62 34 T92 34 T122 34"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            )}
            {children}
          </div>
        </section>
        {aside && <div className={styles.aside}>{aside}</div>}
      </main>
      <footer className={styles.footer}>
        <BrandCredit className={styles.credit} withMark />
      </footer>
    </div>
  );
}
