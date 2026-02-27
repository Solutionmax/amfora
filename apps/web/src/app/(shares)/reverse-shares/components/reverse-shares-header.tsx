import Link from "next/link";
import { IconDeviceDesktopDown, IconLayoutDashboard } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

export function ReverseSharesHeader() {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center gap-2">
        <IconDeviceDesktopDown className="text-xl" />
        <h1 className="text-2xl font-bold">{t("reverseShares.pageTitle")}</h1>
      </div>
      <Separator />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard" className="flex items-center">
                <IconLayoutDashboard size={20} className="mr-2" />
                {t("common.dashboard")}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="flex items-center gap-2">
              <IconDeviceDesktopDown size={20} /> {t("reverseShares.pageTitle")}
            </span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
