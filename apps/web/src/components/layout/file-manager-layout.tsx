"use client";

import { ReactNode, useState } from "react";
import { IconMenu2 } from "@tabler/icons-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface FileManagerLayoutProps {
  children: ReactNode;
  title: string;
  icon?: ReactNode;
  breadcrumbLabel?: string;
  showBreadcrumb?: boolean;
  actions?: ReactNode;
}

export function FileManagerLayout({ children, title, actions }: FileManagerLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 lg:block">
        <AppSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3 lg:hidden">
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

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 lg:px-10 lg:py-10">
          <div className="mb-8 hidden items-end justify-between gap-4 lg:flex">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
            {actions}
          </div>
          <div className="flex flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
