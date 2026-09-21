import { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { fetchAppInfo } from "@/lib/app-info.server";
import { DEFAULT_BRAND } from "@/lib/brand";
import { firstForwardedValue, forwardedProtocol } from "@/lib/forwarded-headers";
import { buildOgImage } from "@/lib/og-image";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ alias: string }>;
}

async function getShareMetadata(alias: string) {
  try {
    const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";
    const response = await fetch(`${API_BASE_URL}/shares/alias/${alias}/metadata`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching share metadata:", error);
    return null;
  }
}

async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const protocol = forwardedProtocol(headersList.get("x-forwarded-proto"), "http");
  const host = firstForwardedValue(headersList.get("x-forwarded-host")) || headersList.get("host") || "localhost:3000";
  return `${protocol}://${host}`;
}

export async function generateMetadata({ params }: { params: Promise<{ alias: string }> }): Promise<Metadata> {
  const t = await getTranslations();
  const resolvedParams = await params;
  const metadata = await getShareMetadata(resolvedParams.alias);
  const appInfo = await fetchAppInfo();

  const title = metadata?.name || t("share.pageTitle");
  const description =
    metadata?.description ||
    (metadata?.totalFiles
      ? t("share.metadata.filesShared", { count: metadata.totalFiles + (metadata.totalFolders || 0) })
      : appInfo.appDescription || t("share.metadata.defaultDescription"));

  const baseUrl = await getBaseUrl();
  const shareUrl = `${baseUrl}/s/${resolvedParams.alias}`;
  const ogImage = buildOgImage(baseUrl, metadata?.previewObjectName, appInfo.appLogo, appInfo.appName);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: shareUrl,
      siteName: appInfo.appName || DEFAULT_BRAND.name,
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.url],
    },
  };
}

export default function DashboardLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
