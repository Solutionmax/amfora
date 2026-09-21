import Link from "next/link";
import { IconArrowUpRight, IconInbox, IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

/** The two things the dashboard is for: send files, receive files. */
export function HeroTiles({ onCreateShare }: { onCreateShare: () => void }) {
  const t = useTranslations();

  const base =
    "group relative flex min-h-[150px] flex-col justify-end gap-1.5 overflow-hidden rounded-[calc(var(--radius)+8px)] px-6 py-5 text-left no-underline transition-transform duration-150 hover:-translate-y-px";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <button
        type="button"
        onClick={onCreateShare}
        className={`${base} grain bg-[linear-gradient(135deg,var(--primary)_0%,color-mix(in_oklab,var(--primary)_55%,#0c1626)_100%)] text-white shadow-[0_20px_40px_-24px_color-mix(in_oklab,var(--primary)_80%,transparent)]`}
      >
        <span className="absolute left-6 top-5 flex size-10 items-center justify-center rounded-[10px] border border-white/35 bg-white/20 backdrop-blur-sm">
          <IconShare className="size-5" strokeWidth={1.75} />
        </span>
        <span className="absolute right-5 top-5 flex size-[34px] items-center justify-center rounded-full bg-white/20">
          <IconArrowUpRight className="size-4" />
        </span>
        <b className="font-display text-xl font-semibold tracking-[-0.01em]">{t("dashboard.hero.send.title")}</b>
        <span className="text-[13px] opacity-85">{t("dashboard.hero.send.text")}</span>
      </button>
      <Link
        href="/reverse-shares"
        className={`${base} border border-line bg-surface text-ink shadow-[0_20px_40px_-30px_rgba(12,22,38,.35)]`}
      >
        <span className="tile absolute left-6 top-5">
          <IconInbox className="size-5" strokeWidth={1.75} />
        </span>
        <span className="absolute right-5 top-5 flex size-[34px] items-center justify-center rounded-full bg-surface-2 text-ink-2">
          <IconArrowUpRight className="size-4" />
        </span>
        <b className="font-display text-xl font-semibold tracking-[-0.01em]">{t("dashboard.hero.receive.title")}</b>
        <span className="text-[13px] text-ink-3">{t("dashboard.hero.receive.text")}</span>
      </Link>
    </div>
  );
}
