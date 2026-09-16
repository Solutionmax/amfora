"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconMenu2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { AmphoraMark } from "@/components/brand/amphora-mark";
import { GithubStar } from "@/components/brand/github-star";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";
import { useAppInfo } from "@/contexts/app-info-context";
import { cn } from "@/lib/utils";

export function Navbar() {
  const t = useTranslations();
  const [scrolled, setScrolled] = useState(false);

  // Transparent over the artwork, solid once the sand sections come up.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const { appName, appLogo, refreshAppInfo } = useAppInfo();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    refreshAppInfo();
  }, [refreshAppInfo]);

  return (
    <header
      className={cn(
        "fixed top-0 z-40 w-full px-6 transition-colors duration-300",
        scrolled ? "border-b bg-background/90 backdrop-blur-sm" : "text-background"
      )}
    >
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            {appLogo ? (
              <img
                alt=""
                className={cn(
                  "h-8 w-8 rounded object-contain transition-colors",
                  scrolled ? "" : "bg-background/90 p-0.5"
                )}
                src={appLogo}
              />
            ) : (
              <AmphoraMark className={cn("h-8 w-8", scrolled ? "text-primary" : "text-background")} />
            )}
            <span className="font-display text-xl font-bold tracking-tight">{appName}</span>
          </Link>
          <nav className="hidden gap-6 md:flex">
            {siteConfig.navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative text-sm font-medium transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:transition-all hover:after:w-full",
                  scrolled
                    ? "text-muted-foreground after:bg-foreground hover:text-foreground"
                    : "text-background/80 after:bg-background hover:text-background"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <GithubStar tone={scrolled ? "default" : "light"} />
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <LanguageSwitcher />
          <ModeToggle />
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
                <GithubStar className="self-start" />
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
