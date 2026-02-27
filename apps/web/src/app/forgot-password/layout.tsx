import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface LayoutProps {
  children: React.ReactNode;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  return {
    title: `${t("forgotPassword.pageTitle")}`,
  };
}

export default function ForgotPasswordLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
