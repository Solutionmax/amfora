import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/** Says nothing about the secret, so a link preview gives nothing away. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("secrets.public.metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default function SecretRevealLayout({ children }: { children: React.ReactNode }) {
  return children;
}
