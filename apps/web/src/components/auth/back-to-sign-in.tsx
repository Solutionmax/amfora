import Link from "next/link";
import { useTranslations } from "next-intl";

/** Quiet way back from recovery, reset and invitation screens. */
export function BackToSignIn() {
  const t = useTranslations();
  return (
    <Link
      href="/login"
      className="rounded-[5px] font-medium text-ink-3 outline-none transition-colors hover:text-ink focus-visible:ring-[3px] focus-visible:ring-primary/35"
    >
      {t("auth.calm.backToSignIn")}
    </Link>
  );
}
