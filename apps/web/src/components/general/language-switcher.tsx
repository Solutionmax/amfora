"use client";

import { useRouter } from "next/navigation";
import { IconLanguage } from "@tabler/icons-react";
import Cookies from "js-cookie";
import { useLocale } from "next-intl";
import ReactCountryFlag from "react-country-flag";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES } from "@/i18n/locales";

const COOKIE_LANG_KEY = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const changeLanguage = (fullLocale: string) => {
    Cookies.set(COOKIE_LANG_KEY, fullLocale, {
      expires: COOKIE_MAX_AGE / 86400,
      path: "/",
      sameSite: "lax",
      secure: window.location.protocol === "https:",
    });

    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 p-0">
          <IconLanguage className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(LANGUAGES).map(([code, name]) => {
          const isCurrentLocale = locale === code;

          return (
            <DropdownMenuItem
              key={code}
              onClick={() => changeLanguage(code)}
              className={isCurrentLocale ? "bg-accent" : ""}
            >
              <ReactCountryFlag
                svg
                countryCode={code.split("-")[1]}
                style={{
                  marginInlineEnd: "8px",
                  width: "1em",
                  height: "1em",
                }}
              />
              {name}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
