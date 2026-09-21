"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { BrandCredit } from "@/components/brand/brand-credit";
import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { useAppInfo } from "@/contexts/app-info-context";
import { cn } from "@/lib/utils";

/**
 * Every public page: sign-in, recovery, invitations, downloads and receive links.
 * A colour wash in the installation's accent, the statement on the left, a floating
 * panel on the right; stacked on small screens.
 */
export function TransferShell({
  statement,
  children,
  panelClassName,
  centered = false,
}: {
  statement?: ReactNode;
  children: ReactNode;
  panelClassName?: string;
  centered?: boolean;
}) {
  const { appName, appBackground } = useAppInfo();

  return (
    <div className={cn("stage grain flex min-h-screen flex-col", appBackground && "stage-image")}>
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-5 md:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 text-ink no-underline">
          <BrandMark className="size-8 shrink-0 text-primary" />
          <span className="truncate font-display text-base font-semibold tracking-[-0.01em]">{appName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          <LanguageSwitcher />
          <ModeToggle />
        </div>
      </header>

      <main
        className={cn(
          "mx-auto grid w-full max-w-[1120px] flex-1 items-center gap-7 px-5 pb-12 pt-2 md:gap-14 md:px-8 md:pb-16",
          centered || !statement ? "max-w-[560px] grid-cols-1" : "md:grid-cols-[minmax(0,1fr)_minmax(0,520px)]"
        )}
      >
        {statement && appBackground ? (
          // On a customer's own background the statement needs a floor to stay readable.
          <div className="rounded-[calc(var(--radius)+10px)] bg-surface/75 p-6 backdrop-blur-md md:-ml-6">
            {statement}
          </div>
        ) : (
          statement
        )}
        <section className={cn("float w-full animate-in fade-in-0 duration-150", panelClassName)}>{children}</section>
      </main>

      <footer className="flex justify-center p-5">
        <BrandCredit className="rounded-md px-2 py-1.5 text-xs text-ink-3 hover:bg-surface/70 hover:text-ink" />
      </footer>
    </div>
  );
}
