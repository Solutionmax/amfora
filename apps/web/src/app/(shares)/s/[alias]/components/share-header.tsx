import Link from "next/link";
import { useTranslations } from "next-intl";

import { Amphora } from "@/components/brand/amphora";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { useAppInfo } from "@/contexts/app-info-context";

export function ShareHeader() {
  const { appName, appLogo } = useAppInfo();
  const t = useTranslations();

  return (
    <header className="w-full border-b bg-background/80 px-6 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl sm:p-0 h-16 flex items-center justify-between">
        <Link className="flex items-center gap-2.5" href="/">
          {appLogo ? (
            <img alt={t("logo.labels.appLogo")} className="h-8 w-8 rounded object-contain" src={appLogo} />
          ) : (
            <Amphora className="h-8 w-8 text-primary" />
          )}
          <span className="font-display text-xl font-bold tracking-tight">{appName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
