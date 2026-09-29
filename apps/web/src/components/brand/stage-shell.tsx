"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { BrandCredit } from "@/components/brand/brand-credit";
import { BrandMark } from "@/components/brand/brand-mark";
import { timeLeft } from "@/components/brand/countdown";
import { coverImageSrc } from "@/components/brand/cover-pick";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { useAppInfo } from "@/contexts/app-info-context";
import { cn } from "@/lib/utils";

const PARALLAX_BACKDROP = 18;
const PARALLAX_CARD = 8;
// Past this length the story is a message, not a headline, and gets the smaller type.
const LONG_HEADLINE = 90;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Download and receive pages. The cover the admin uploaded (or the public background, or the
 * accent) fills the screen with slow drifting light; the story sits on it in large white type,
 * the working card floats beside it. Stacked on small screens.
 */
export function StageShell({ story, card, children }: { story: ReactNode; card?: ReactNode; children?: ReactNode }) {
  const { appName, appLogo, appBackground, appShareCover } = useAppInfo();
  const backdrop = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const cover = coverImageSrc(appShareCover);

  // A few pixels of parallax against the pointer; skipped for touch and reduced motion.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
    const onMove = (event: PointerEvent) => {
      const x = event.clientX / innerWidth - 0.5;
      const y = event.clientY / innerHeight - 0.5;
      backdrop.current?.style.setProperty("translate", `${x * -PARALLAX_BACKDROP}px ${y * -PARALLAX_BACKDROP}px`);
      cardRef.current?.style.setProperty("translate", `${x * PARALLAX_CARD}px ${y * PARALLAX_CARD}px`);
    };
    addEventListener("pointermove", onMove);
    return () => removeEventListener("pointermove", onMove);
  }, []);

  const glass = "border border-white/20 bg-white/10 backdrop-blur-md";

  return (
    <div className="relative min-h-screen overflow-x-hidden text-white">
      <div
        ref={backdrop}
        aria-hidden="true"
        className={cn("share-backdrop", (cover || appBackground) && "share-backdrop-photo")}
      >
        {cover ? (
          <img alt="" src={cover} className="share-backdrop-image" />
        ) : (
          appBackground && <div className="share-backdrop-bg" />
        )}
        <div className="share-blob share-blob-1" />
        <div className="share-blob share-blob-2" />
        <div className="share-blob share-blob-3" />
        <div className="share-backdrop-shade" />
        <div className="share-dots" />
        <div className="share-rings">
          <i />
        </div>
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1320px] grid-rows-[auto_1fr_auto] px-4 py-5 md:px-10 md:py-7 lg:px-16">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 text-white no-underline">
            <BrandMark className={cn("size-8 shrink-0 text-white", appLogo && "rounded-md bg-white/90 p-1")} />
            <span className="truncate font-display text-base font-semibold tracking-[-0.01em]">{appName}</span>
          </Link>
          <div
            className={cn(
              "flex shrink-0 items-center gap-0.5 rounded-full px-1 [&_button]:text-white [&_button:hover]:bg-white/15 [&_button:hover]:text-white",
              glass
            )}
          >
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </header>

        <main
          className={cn(
            "grid items-center gap-8 py-8 lg:gap-24 lg:py-12",
            card && "lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]"
          )}
        >
          {story}
          {card && (
            <section ref={cardRef} className="float share-card w-full self-center text-ink">
              {card}
            </section>
          )}
        </main>

        <footer className="flex items-center justify-center text-xs text-white/70 lg:justify-end">
          <BrandCredit className="rounded-md px-2 py-1.5 hover:bg-white/10 hover:text-white" />
        </footer>
      </div>
      {children}
    </div>
  );
}

export interface StageFact {
  label: string;
  value: ReactNode;
  wide?: boolean;
}

/** Left side of the stage: who, the message in large type, and a row of facts. */
export function StageStory({
  eyebrow,
  sender,
  headline,
  text,
  facts = [],
  children,
}: {
  eyebrow?: string;
  sender?: { name: string; line: string };
  headline: string;
  text?: string | null;
  facts?: StageFact[];
  children?: ReactNode;
}) {
  const isLong = headline.length > LONG_HEADLINE;
  // Short headlines rise word by word; a long message appears at once and keeps its line breaks.
  const words = isLong ? [] : headline.split(/\s+/).filter(Boolean);

  return (
    <section className="min-w-0">
      {sender && (
        <div className="share-rise share-text mb-6 flex items-center gap-3 text-[15px] md:mb-7">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white font-display text-lg font-bold text-primary shadow-[0_0_0_6px_rgba(255,255,255,.12)]">
            {initials(sender.name) || "A"}
          </span>
          <span className="min-w-0">
            <b className="block truncate font-semibold">{sender.name}</b>
            <small className="block text-[13px] text-white/80">{sender.line}</small>
          </span>
        </div>
      )}
      {eyebrow && (
        <span className="share-rise mb-4 block font-mono text-[11px] uppercase tracking-[0.14em] text-white/80">
          {eyebrow}
        </span>
      )}
      <h1
        className={cn(
          "share-text font-display font-semibold tracking-[-0.03em] [overflow-wrap:anywhere]",
          isLong
            ? "share-rise line-clamp-[8] max-w-[30ch] whitespace-pre-line text-[22px] leading-[1.2] md:text-[32px]"
            : "max-w-[16ch] text-[32px] leading-[1.06] md:text-[48px] xl:text-[60px]"
        )}
        title={isLong ? headline : undefined}
      >
        {isLong && headline}
        {words.map((word, index) => (
          <span key={index} className="share-word" style={{ animationDelay: `${0.15 + index * 0.05}s` }}>
            {word}
            {index < words.length - 1 ? " " : ""}
          </span>
        ))}
      </h1>
      {text && (
        <p className="share-rise share-text mt-5 max-w-[46ch] whitespace-pre-line text-base text-white/90 md:text-lg">
          {text}
        </p>
      )}
      {facts.length > 0 && (
        <dl
          className="share-rise share-text mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:mt-11 md:flex md:gap-14"
          style={{ animationDelay: "0.8s" }}
        >
          {facts.map((fact) => (
            <div
              key={fact.label}
              className={cn(
                "min-w-0 border-t border-white/30 pt-3 md:min-w-[120px]",
                fact.wide && "col-span-2 sm:col-span-1"
              )}
            >
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/80 md:text-[11px]">
                {fact.label}
              </dt>
              <dd className="mt-1 font-display text-[16px] font-semibold tabular-nums md:text-[22px]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children && <div className="share-rise mt-8">{children}</div>}
    </section>
  );
}

/** Live "6d 14h 21m 57s" until the end date; the seconds fade back so the number stays calm. */
export function Countdown({ until }: { until: string }) {
  const t = useTranslations();
  const [now, setNow] = useState(() => new Date());
  const left = timeLeft(new Date(until), now);
  const isRunning = left !== null;

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  if (!left) return <>{t("public.stage.ended")}</>;
  return (
    <>
      {t("public.stage.left", { days: left.days, hours: left.hours, minutes: left.minutes })}{" "}
      <span className="opacity-55">{t("public.stage.seconds", { seconds: left.seconds })}</span>
    </>
  );
}
