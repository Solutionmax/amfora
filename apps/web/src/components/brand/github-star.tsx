"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconBrandGithub, IconStar } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const REPO_API = siteConfig.links.github.replace("https://github.com/", "https://api.github.com/repos/");

/**
 * Star link with a live count. The count is a nicety: if GitHub is unreachable, rate limits us,
 * or the repo is still private, the link just renders without a number.
 */
export function GithubStar({ className, tone = "default" }: { className?: string; tone?: "default" | "light" }) {
  const t = useTranslations();
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch(REPO_API)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && typeof data?.stargazers_count === "number") setStars(data.stargazers_count);
      })
      .catch(() => setStars(null));
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link
      href={siteConfig.links.github}
      target="_blank"
      rel="noopener noreferrer"
      title={t("home.starOnGithub")}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        tone === "light"
          ? "border-background/30 text-background hover:bg-background/10"
          : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
        className
      )}
    >
      <IconBrandGithub className="size-4" aria-hidden="true" />
      <span>{t("home.starOnGithub")}</span>
      {stars !== null && (
        <span className="flex items-center gap-1 font-mono text-[11px]">
          <IconStar className="size-3" aria-hidden="true" />
          {stars}
        </span>
      )}
    </Link>
  );
}
