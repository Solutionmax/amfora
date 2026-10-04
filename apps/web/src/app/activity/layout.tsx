import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("activity.pageTitle") };
}

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
