import { useLocale, useTranslations } from "next-intl";

import { formatFileSize as formatBytes } from "@/utils/format-file-size";
import { formatDay, formatDayTime } from "../lib/receive-format";

/** Formatting for the detail view, in the language the user picked. */
export function useReverseShareDetails() {
  const t = useTranslations();
  const locale = useLocale();

  /** "31 Oct, 14:12"; a dash-free fallback when there is no date. */
  const formatDate = (dateString: string | null) => {
    if (!dateString) return t("common.notAvailable");
    return formatDayTime(dateString, locale) || t("common.invalidDate");
  };

  /** "31 Oct". */
  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return t("common.notAvailable");
    return formatDay(dateString, locale) || t("common.invalidDate");
  };

  /** Size limit in bytes to "2 GB"; no value means no limit. */
  const formatFileSize = (size: string | number | null | undefined) => {
    const bytes = typeof size === "string" ? parseInt(size, 10) : (size ?? 0);
    if (!bytes || Number.isNaN(bytes)) return t("reverseShares.labels.noLimit");
    return formatBytes(bytes);
  };

  return { locale, formatDate, formatShortDate, formatFileSize };
}
