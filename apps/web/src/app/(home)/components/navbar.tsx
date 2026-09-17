"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconMenu2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppInfo } from "@/contexts/app-info-context";

export function Navbar() {
  const t = useTranslations();
  const { appName, appLogo, refreshAppInfo } = useAppInfo();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    refreshAppInfo();
  }, [refreshAppInfo]);

  return (
    <header className="relative z-40 w-full border-b border-white/10 bg-[#071827] px-6 text-white backdrop-blur-sm">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            {appLogo ? (
              <img alt="" className="h-8 w-8 shrink-0 rounded-lg bg-white/95 p-1 object-contain" src={appLogo} />
            ) : (
              <AmphoraMark className="h-8 w-8 shrink-0 text-sky-300" />
            )}
            <span className="truncate font-display text-xl font-bold tracking-tight text-white">{appName}</span>
          </Link>
        </div>

        <div className="hidden items-center gap-1 lg:flex">
          <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] p-1 text-white [&_button]:text-white [&_button:hover]:bg-white/10">
            <LanguageSwitcher />
            <ModeToggle />
          </div>
          <Button asChild className="ml-1">
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
            <SheetContent side="right" className="border-white/10 bg-[#071827] text-white">
              <SheetTitle className="sr-only">{t("home.pageTitle")}</SheetTitle>
              <div className="flex flex-col gap-5 pt-10">
                <Link href="#privacy" className="text-lg font-medium" onClick={() => setIsMenuOpen(false)}>
                  {t("home.points.noTracking")}
                </Link>
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
