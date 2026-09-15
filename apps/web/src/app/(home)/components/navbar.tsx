"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconMenu2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Amphora } from "@/components/brand/amphora";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";
import { useAppInfo } from "@/contexts/app-info-context";

export function Navbar() {
  const t = useTranslations();
  const { appName, appLogo, refreshAppInfo } = useAppInfo();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    refreshAppInfo();
  }, [refreshAppInfo]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 px-6 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            {appLogo ? (
              <img alt="" className="h-8 w-8 rounded object-contain" src={appLogo} />
            ) : (
              <Amphora className="h-8 w-8 text-primary" />
            )}
            <span className="font-display text-xl font-bold tracking-tight">{appName}</span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            {siteConfig.navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-1 lg:flex">
          <LanguageSwitcher />
          <ModeToggle />
          <Button asChild className="ml-2">
            <Link href="/login">{t("login.signIn")}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <LanguageSwitcher />
          <ModeToggle />
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
                <IconMenu2 className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-5 pt-10">
                {siteConfig.navMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-lg font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Button asChild className="mt-2">
                  <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                    {t("login.signIn")}
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
