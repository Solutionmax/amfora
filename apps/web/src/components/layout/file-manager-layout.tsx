"use client";

import { ReactNode, useState } from "react";
import { IconChevronRight, IconMenu2 } from "@tabler/icons-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppInfo } from "@/contexts/app-info-context";

interface FileManagerLayoutProps {
  children: ReactNode;
  title: string;
  icon?: ReactNode;
  breadcrumbLabel?: string;
  showBreadcrumb?: boolean;
  actions?: ReactNode;
}

export function FileManagerLayout({ children, title, actions }: FileManagerLayoutProps) {
  const { appName } = useAppInfo();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh w-full">
      <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 lg:block">
        <AppSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm lg:hidden">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <IconMenu2 className="size-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetTitle className="sr-only">{title}</SheetTitle>
              <AppSidebar onNavigate={() => setIsMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="font-display text-lg font-bold tracking-tight">{title}</h1>
        </div>

        <header className="hidden h-20 shrink-0 items-center gap-3 border-b border-border/70 px-8 text-xs lg:flex xl:px-10">
          <span className="font-semibold text-muted-foreground">{appName}</span>
          <IconChevronRight className="size-3 text-muted-foreground/60" aria-hidden="true" />
          <span className="text-foreground">{title}</span>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-9 xl:px-10">
          <div
            className={
              actions
                ? "mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-7"
                : "mb-7 hidden border-b border-border/70 pb-7 lg:flex"
            }
          >
            <h1 className="hidden font-display text-[32px] font-semibold leading-tight tracking-tight lg:block">
              {title}
            </h1>
            {actions && <div className="flex max-w-full flex-wrap items-center gap-2 [&>div]:flex-wrap">{actions}</div>}
          </div>
          <div className="flex min-w-0 flex-col gap-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
