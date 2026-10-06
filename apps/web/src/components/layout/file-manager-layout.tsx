"use client";

import { ReactNode, useState } from "react";
import { IconMenu2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/brand/brand-mark";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppInfo } from "@/contexts/app-info-context";
import { cn } from "@/lib/utils";

interface FileManagerLayoutProps {
  children: ReactNode;
  title: string;
  subline?: ReactNode;
  actions?: ReactNode;
  /**
   * default: page header + content up to 1060px. narrow: forms and settings (820px).
   * bare: no header or padding, the page owns the whole area (list + detail views).
   */
  variant?: "default" | "narrow" | "wide" | "bare";
  /** Kept for callers that still pass them; the frame no longer renders a breadcrumb. */
  icon?: ReactNode;
  breadcrumbLabel?: string;
  showBreadcrumb?: boolean;
}

const WIDTH = { default: "max-w-[1060px]", narrow: "max-w-[820px]", wide: "max-w-[1180px]", bare: "" } as const;

/** The signed-in frame: quiet sidebar, white canvas, page header with title, subline and actions. */
export function FileManagerLayout({ children, title, subline, actions, variant = "default" }: FileManagerLayoutProps) {
  const t = useTranslations();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { appName } = useAppInfo();

  return (
    <div className="flex min-h-dvh w-full bg-background">
      <aside className="hidden w-[232px] shrink-0 border-r border-line bg-sidebar-bg lg:block">
        <div className="sticky top-0 h-dvh">
          <AppSidebar />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-line bg-sidebar-bg/95 pl-4 pr-2 backdrop-blur-sm lg:hidden">
          <BrandMark className="size-6 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate font-display text-[17px] font-bold tracking-[-0.01em]">
            {appName}
          </span>
          <NotificationBell className="size-9 text-ink-icon hover:text-ink" />
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("ui.menu")}>
                <IconMenu2 className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[272px] border-0 p-0">
              <SheetTitle className="sr-only">{title}</SheetTitle>
              <AppSidebar onNavigate={() => setIsMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {variant === "bare" ? (
          <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        ) : (
          <main className={cn("w-full flex-1 px-4 pb-28 pt-7 sm:px-8 lg:px-14 lg:pt-11", WIDTH[variant])}>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-x-5 gap-y-4">
              <div className="min-w-0">
                <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] lg:text-[30px]">
                  {title}
                </h1>
                {subline && <p className="mt-1.5 text-ink-3">{subline}</p>}
              </div>
              {actions && (
                <div className="flex max-w-full flex-wrap items-center gap-2 [&>div]:flex-wrap">{actions}</div>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-10">{children}</div>
          </main>
        )}
      </div>
    </div>
  );
}
