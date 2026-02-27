import Link from "next/link";
import { IconLayoutDashboard, IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

export function SharesHeader() {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center gap-2">
        <IconShare className="text-xl" />
        <h1 className="text-2xl font-bold">{t("shares.header.title")}</h1>
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
              <IconShare size={20} /> {t("shares.header.myShares")}
            </span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
