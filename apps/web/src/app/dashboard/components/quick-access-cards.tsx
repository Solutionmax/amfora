import Link from "next/link";
import { IconArrowUpRight, IconDeviceDesktopDown, IconFoldersFilled, IconShare2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";

export function QuickAccessCards() {
  const t = useTranslations();

  const QUICK_ACCESS_ITEMS = [
    {
      title: t("quickAccess.files.title"),
      icon: <IconFoldersFilled size={24} />,
      description: t("quickAccess.files.description"),
      path: "/files",
    },
    {
      title: t("quickAccess.shares.title"),
      icon: <IconShare2 size={24} />,
      description: t("quickAccess.shares.description"),
      path: "/shares",
    },
    {
      title: t("quickAccess.reverseShares.title"),
      icon: <IconDeviceDesktopDown size={24} />,
      description: t("quickAccess.reverseShares.description"),
      path: "/reverse-shares",
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {QUICK_ACCESS_ITEMS.map((card) => (
        <Link
          key={card.title}
          href={card.path}
          className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="group h-full cursor-pointer relative overflow-hidden border-border/70 bg-card transition-colors hover:border-primary/40 hover:bg-secondary/30">
            <CardContent className="h-full">
              <div className="flex h-full flex-col items-start gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  {card.icon}
                </div>
                <IconArrowUpRight
                  className="absolute end-6 top-6 size-5 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 font-display text-xl font-semibold text-foreground">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{card.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
