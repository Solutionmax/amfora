import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  return { title: t("twoFactorSetup.pageTitle") };
}

export default function TwoFactorSetupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
