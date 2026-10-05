import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("trash");

  return {
    title: `${t("pageTitle")} `,
  };
}

export default function TrashLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
