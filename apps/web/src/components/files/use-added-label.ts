"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";

import { addedLabel } from "./added-label";

/** Formats a created-at value as "Today, 14:12", "Yesterday" or "28 Sep". */
export function useAddedLabel() {
  const t = useTranslations();
  const locale = useLocale();

  return useCallback(
    (value: string | Date | null | undefined) => {
      if (!value) return "—";
      const label = addedLabel(value, new Date(), locale);
      if (!label) return "—";
      if (label.kind === "today") return t("files.calm.today", { time: label.time });
      if (label.kind === "yesterday") return t("files.calm.yesterday");
      return label.text;
    },
    [locale, t]
  );
}
