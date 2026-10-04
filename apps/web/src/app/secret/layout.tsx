import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("secrets.public.createTitle"), description: t("secrets.public.createText") };
}

export default function SecretCreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
