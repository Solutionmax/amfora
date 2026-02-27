import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  return {
    title: `${t("home.pageTitle")} `,
  };
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
