import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("secrets.pageTitle") };
}

export default function SecretsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
