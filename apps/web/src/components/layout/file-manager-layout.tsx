"use client";

import { ReactNode, useState } from "react";
import { IconMenu2 } from "@tabler/icons-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface FileManagerLayoutProps {
  children: ReactNode;
  title: string;
  subline?: ReactNode;
  actions?: ReactNode;
  /** Kept for callers that still pass them; the frame no longer renders a breadcrumb. */
  icon?: ReactNode;
  breadcrumbLabel?: string;
  showBreadcrumb?: boolean;
}

/** The signed-in frame: sidebar, soft colour wash, page header with title, subline and actions. */
export function FileManagerLayout({ children, title, subline, actions }: FileManagerLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh w-full">
      <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 lg:block">
        <AppSidebar />
      </aside>

      <div className="stage-soft flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-line bg-surface/90 px-3 backdrop-blur-sm lg:hidden">
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
          <h1 className="min-w-0 truncate font-display text-base font-semibold tracking-tight">{title}</h1>
        </div>

        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="hidden font-display text-[34px] font-semibold leading-tight tracking-[-0.025em] lg:block">
                {title}
              </h1>
              {subline && <p className="mt-1 text-[15px] text-ink-3">{subline}</p>}
            </div>
            {actions && <div className="flex max-w-full flex-wrap items-center gap-2 [&>div]:flex-wrap">{actions}</div>}
          </div>
          <div className="flex min-w-0 flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
