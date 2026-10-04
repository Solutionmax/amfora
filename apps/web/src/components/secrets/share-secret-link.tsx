"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconKey } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { getSecretLimits } from "@/http/endpoints/secrets";

/** Milliseconds between two steps of the line that seals and unseals itself. */
const STEP_MS = 45;
const LETTERS_PER_STEP = 2;
/** Steps the line rests while fully readable, and while fully sealed. */
const HOLD_SHOWN = 38;
const HOLD_SEALED = 22;

/**
 * How many letters of the line are readable right now; the rest shows as dots. Runs up,
 * rests, runs down, rests. With reduced motion the whole line is simply readable.
 */
function useSealedLine(text: string): number {
  const [shown, setShown] = useState(text.length);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      return;
    }
    let count = 0;
    let direction = 1;
    let hold = HOLD_SEALED;
    setShown(0);
    const timer = window.setInterval(() => {
      if (hold > 0) {
        hold -= 1;
        return;
      }
      count = Math.max(0, Math.min(text.length, count + direction * LETTERS_PER_STEP));
      if (count === text.length) {
        direction = -1;
        hold = HOLD_SHOWN;
      } else if (count === 0) {
        direction = 1;
        hold = HOLD_SEALED;
      }
      setShown(count);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [text]);

  return shown;
}

function Tile() {
  const t = useTranslations();
  const line = t("secrets.public.shareLine");
  const shown = useSealedLine(line);

  return (
    <>
      <div className="flex items-center gap-3 text-xs text-ink-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        {t("login.or")}
        <span className="h-px flex-1 bg-line" />
      </div>
      {/* One fixed name for assistive technology: the line on screen keeps changing. */}
      <Link
        href="/secret"
        aria-label={t("secrets.public.shareLink")}
        className="secret-ring group flex items-center gap-3.5 rounded-[14px] px-4 py-[15px] shadow-[0_12px_26px_-18px_var(--primary)] outline-none transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-16px_var(--primary)] focus-visible:ring-[3px] focus-visible:ring-primary/35"
      >
        <span className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <IconKey className="secret-tilt size-[18px]" stroke={1.8} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 leading-snug" aria-hidden="true">
          <span className="mono block text-[10px] uppercase tracking-[0.12em] text-primary">
            {t("secrets.public.shareEyebrow")}
          </span>
          <span className="block font-display text-base font-bold tracking-[-0.01em] text-ink">
            {t("secrets.public.shareTitle")}
          </span>
          <span className="mt-0.5 block font-mono text-xs font-medium text-ink-2">
            {line.slice(0, shown)}
            <span className="text-primary">{line.slice(shown).replace(/[^ ]/g, "•")}</span>
          </span>
        </span>
        <IconArrowRight
          className="size-[17px] shrink-0 text-primary transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-x-1"
          stroke={1.8}
          aria-hidden="true"
        />
      </Link>
    </>
  );
}

/** On the sign-in page: the way to the public secret page, only while an administrator has it switched on. */
export function ShareSecretLink() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSecretLimits()
      .then((limits) => !cancelled && setIsEnabled(limits.anonymousEnabled))
      // Without an answer the tile stays hidden; signing in must not depend on it.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return isEnabled ? <Tile /> : null;
}
