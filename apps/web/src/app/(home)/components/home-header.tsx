"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { HomeHeaderProps } from "../types";

const rise = (delay: number) => ({
  animate: { opacity: 1, y: 0 },
  initial: { opacity: 0, y: 16 },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
});

export function HomeHeader({ title }: HomeHeaderProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-5">
      <motion.p {...rise(0)} className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </motion.p>
      <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight">
        <motion.span {...rise(0.06)} className="block">
          {t("home.header.fileSharing")}
        </motion.span>
        <motion.span {...rise(0.12)} className="block text-primary">
          {t("home.header.tagline")}
        </motion.span>
      </h1>
    </div>
  );
}
