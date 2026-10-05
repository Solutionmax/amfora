"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Icon } from "@tabler/icons-react";

import { BrandCredit } from "@/components/brand/brand-credit";
import { BrandMark } from "@/components/brand/brand-mark";
import { PAGE_MIN_HEIGHT, usePublicPreview } from "@/components/brand/public-preview";
import { initials, StageShell, StageStory, type StageFact } from "@/components/brand/stage-shell";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { useAppInfo } from "@/contexts/app-info-context";
import { cn } from "@/lib/utils";

export interface TrustItem {
  icon: Icon;
  title: string;
  text: string;
}

/** What a public page says, independent of how the theme lays it out. */
export interface PublicStory {
  eyebrow?: string;
  sender?: { name: string; action: string; line?: string };
  /** The big line on the stage; on a download page the sender's message when there is one. */
  headline: string;
  /** Short title for workbench and seal; falls back to the headline. */
  title?: string;
  text?: string | null;
  facts?: StageFact[];
  trust?: TrustItem[];
  action?: ReactNode;
}

interface ShellProps {
  story: PublicStory;
  card?: ReactNode;
  footnote?: string;
  children?: ReactNode;
}

// Delphic maxims, decoration only: sign in, download, receive.
const MAXIMS = ["ΓΝΩΘΙ ΣΑΥΤΟΝ", "ΜΗΔΕΝ ΑΓΑΝ", "ΚΑΙΡΟΝ ΓΝΩΘΙ"];

function Tools({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-0.5 rounded-full border border-line bg-surface px-1", className)}
    >
      <LanguageSwitcher />
      <ModeToggle />
    </div>
  );
}

function Brand({ className }: { className?: string }) {
  const { appName } = useAppInfo();
  const name = usePublicPreview()?.name ?? appName;
  return (
    <Link href="/" className={cn("flex min-w-0 items-center gap-2.5 text-ink no-underline", className)}>
      <BrandMark className="size-8 shrink-0 text-primary" />
      <span className="truncate font-display text-base font-semibold tracking-[-0.01em]">{name}</span>
    </Link>
  );
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-[15px] font-bold text-primary-foreground",
        className
      )}
    >
      {initials(name) || "A"}
    </span>
  );
}

/** The sender's message, when it is more than the title. */
function noteOf(story: PublicStory): string | null {
  if (story.sender) return story.headline !== story.title ? story.headline : null;
  return story.text || null;
}

/**
 * Workbench: a sand bench on the left with the message and a few fragments of the product,
 * the working card on a calm white panel on the right. Stacked on small screens.
 */
function BenchShell({ story, card, footnote, children }: ShellProps) {
  const title = story.title ?? story.headline;
  const note = noteOf(story);

  return (
    <div
      className={cn("grid bg-background text-ink lg:grid-cols-[minmax(0,1.25fr)_minmax(400px,1fr)]", PAGE_MIN_HEIGHT)}
    >
      <section className="bench relative flex min-w-0 flex-col justify-between gap-8 overflow-hidden px-5 py-6 md:px-12 md:py-8">
        <div className="flex items-center justify-between gap-4">
          <Brand />
          <Tools className="lg:hidden" />
        </div>

        <div className="grid gap-5">
          {story.sender && (
            <div className="bench-frag share-rise flex max-w-[520px] items-start gap-3 lg:-rotate-1">
              <Avatar name={story.sender.name} />
              <div className="min-w-0">
                {note && (
                  <p className="whitespace-pre-line font-display text-[17px] font-medium leading-snug [overflow-wrap:anywhere] line-clamp-6">
                    {note}
                  </p>
                )}
                <small className="mt-1 block text-[13px] text-ink-3">
                  <b className="font-semibold text-ink-2">{story.sender.name}</b> {story.sender.action}
                  {story.sender.line ? ` · ${story.sender.line}` : ""}
                </small>
              </div>
            </div>
          )}
          {!story.sender && note && (
            <p className="bench-frag share-rise max-w-[520px] whitespace-pre-line text-[15px] text-ink-2 lg:rotate-[0.6deg]">
              {note}
            </p>
          )}
          {story.trust && (
            <div className="hidden gap-4 md:grid md:grid-cols-2 xl:max-w-[640px]">
              {story.trust.map(({ icon: TrustIcon, title: trustTitle, text }, index) => (
                <div
                  key={trustTitle}
                  className={cn(
                    "bench-frag bench-float flex items-start gap-3",
                    index === 0 && "-rotate-2",
                    index === 1 && "translate-y-6 rotate-2",
                    index === 2 && "col-span-2 w-2/3 justify-self-center rotate-1"
                  )}
                  style={{ animationDelay: `${index * -2}s` }}
                >
                  <span className="tile tile-sm">
                    <TrustIcon strokeWidth={1.75} />
                  </span>
                  <span>
                    <b className="block text-sm font-semibold">{trustTitle}</b>
                    <span className="block text-[13px] text-ink-3">{text}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {story.facts && story.facts.length > 0 && (
            <dl className="flex flex-wrap gap-3">
              {story.facts.map((fact) => (
                <div key={fact.label} className="bench-frag min-w-[130px] px-4 py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{fact.label}</dt>
                  <dd className="mt-0.5 font-display text-[17px] font-semibold tabular-nums">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {story.action}
        </div>

        <div>
          {story.eyebrow && (
            <span className="mb-3 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              {story.eyebrow}
            </span>
          )}
          <h1 className="max-w-[18ch] font-display text-[30px] font-semibold leading-[1.04] tracking-[-0.03em] [overflow-wrap:anywhere] md:text-[44px]">
            {title}
          </h1>
          <BrandCredit className="mt-4 text-xs text-ink-3 hover:text-ink" />
        </div>
      </section>

      <section className="flex min-w-0 flex-col justify-between gap-6 border-line bg-surface px-5 py-6 md:px-12 md:py-8 lg:border-l">
        <div className="hidden justify-end lg:flex">
          <Tools />
        </div>
        <div className="mx-auto w-full max-w-[420px]">{card}</div>
        {footnote ? <p className="text-center text-xs text-ink-3">{footnote}</p> : <span />}
      </section>
      {children}
    </div>
  );
}

/**
 * Seal: one calm card in the middle, the mark as a seal on top, the facts in a status row
 * below. The most neutral of the three, and the best fit for a customer's own brand.
 */
function SealShell({ story, card, footnote, children }: ShellProps) {
  const { appLogo } = useAppInfo();
  // The sender's message, or a receive link's description; sign-in keeps its card to itself.
  const note = story.sender ? noteOf(story) : story.title ? story.text : null;
  // A download card names its own files, so the sender line leads there instead of a title.
  const heading = story.sender ? null : (story.title ?? (card ? null : story.headline));
  const plainText = !card && !story.title ? story.text : null;
  const maxim = MAXIMS[story.trust ? 0 : story.sender ? 1 : 2];
  const status: { key: string; label?: string; value: ReactNode; icon?: Icon }[] = story.facts?.length
    ? story.facts.map((fact) => ({ key: fact.label, label: fact.label, value: fact.value }))
    : (story.trust ?? []).map((item) => ({ key: item.title, value: item.title, icon: item.icon }));

  return (
    <div
      className={cn(
        "seal relative grid grid-rows-[auto_1fr_auto] bg-background px-4 py-5 text-ink md:px-10 md:py-7",
        PAGE_MIN_HEIGHT
      )}
    >
      <header className="relative flex items-center justify-between gap-4">
        <Brand />
        <Tools />
      </header>

      <main className="relative grid place-items-center py-8">
        <div className={cn("share-rise w-full", card ? "max-w-[500px]" : "max-w-[440px]")}>
          <div
            className={cn(
              "relative z-[1] mx-auto -mb-[38px] flex size-[76px] items-center justify-center rounded-full shadow-[0_0_0_8px_var(--background),0_14px_30px_-10px_rgba(12,22,38,.45)]",
              appLogo ? "bg-surface" : "bg-ink text-background dark:bg-primary dark:text-primary-foreground"
            )}
          >
            <BrandMark className={cn("size-10", appLogo ? "rounded-md" : "text-inherit")} />
          </div>

          <div className="float pt-12">
            {(story.eyebrow || heading || story.sender || note || plainText) && (
              <div className="grid gap-3 px-6 pt-2 text-center md:px-7">
                {story.eyebrow && (
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{story.eyebrow}</span>
                )}
                {heading && (
                  <h1 className="font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] [overflow-wrap:anywhere] md:text-[26px]">
                    {heading}
                  </h1>
                )}
                {story.sender && (
                  <p className="-mt-1 text-sm text-ink-3">
                    <b className="font-semibold text-ink">{story.sender.name}</b> {story.sender.action}
                    {story.sender.line ? ` · ${story.sender.line}` : ""}
                  </p>
                )}
                {plainText && <p className="whitespace-pre-line text-sm text-ink-3">{plainText}</p>}
                {note && (
                  <blockquote className="line-clamp-6 whitespace-pre-line rounded-r-lg border-l-[3px] border-primary bg-surface-2 px-4 py-3 text-left text-[15px] [overflow-wrap:anywhere]">
                    {note}
                  </blockquote>
                )}
              </div>
            )}
            {card}
            {!card && <div className="px-6 pb-7 pt-4 text-center">{story.action}</div>}
          </div>

          {status.length > 0 && (
            <dl
              className="mt-4 grid overflow-hidden rounded-[calc(var(--radius)+4px)] border border-line bg-surface"
              style={{ gridTemplateColumns: `repeat(${status.length}, minmax(0, 1fr))` }}
            >
              {status.map((item, index) => (
                <div key={item.key} className={cn("min-w-0 px-3 py-2.5", index > 0 && "border-l border-line")}>
                  {item.label && (
                    <dt className="truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
                      {item.label}
                    </dt>
                  )}
                  <dd className="flex items-center gap-1.5 text-[13px] font-semibold tabular-nums">
                    {item.icon && <item.icon className="size-4 shrink-0 text-primary" strokeWidth={1.75} />}
                    <span className="min-w-0">{item.value}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <p aria-hidden="true" className="mt-5 text-center font-mono text-xs tracking-[0.14em] text-ink-3">
            {maxim}
          </p>
        </div>
      </main>

      <footer className="relative flex items-center justify-center gap-4 text-xs text-ink-3 md:justify-between">
        {footnote && <span className="hidden md:inline">{footnote}</span>}
        <BrandCredit className="rounded-md px-2 py-1.5 hover:text-ink" />
      </footer>
      {children}
    </div>
  );
}

/** Sign-in, download and receive pages in the theme the admin picked in Customization. */
export function PublicShell(props: ShellProps) {
  const { appPublicTheme, infoLoaded } = useAppInfo();
  const theme = usePublicPreview()?.theme ?? appPublicTheme;

  // Wait for the first app info so a visitor never sees one theme flip into another.
  if (!infoLoaded) return <LoadingScreen />;
  if (theme === "workbench") return <BenchShell {...props} />;
  if (theme === "seal") return <SealShell {...props} />;

  const { story, card, footnote, children } = props;
  return (
    <StageShell
      story={
        <StageStory
          eyebrow={story.eyebrow}
          sender={story.sender}
          headline={story.headline}
          text={story.text}
          facts={story.facts}
        >
          {(story.trust || story.action) && (
            <>
              {story.trust && (
                <div className="grid gap-3">
                  {story.trust.map(({ icon: TrustIcon, title, text }) => (
                    <div key={title} className="flex items-start gap-3">
                      <span className="tile tile-sm border border-white/20 bg-white/10 text-white backdrop-blur-sm">
                        <TrustIcon strokeWidth={1.75} />
                      </span>
                      <span>
                        <b className="block text-sm font-semibold">{title}</b>
                        <span className="block text-[13px] text-white/80">{text}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {story.action}
            </>
          )}
        </StageStory>
      }
      card={card}
      footnote={footnote}
    >
      {children}
    </StageShell>
  );
}
