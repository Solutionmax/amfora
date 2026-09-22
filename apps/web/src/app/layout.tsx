import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import {
  archivo,
  inter,
  jetbrains,
  lato,
  montserrat,
  nunito,
  openSans,
  outfit,
  poppins,
  publicSans,
  raleway,
  roboto,
  sourceSans,
  workSans,
} from "./fonts";

import "./globals.css";

import { RedirectHandler } from "@/components/auth/redirect-handler";
import { BrandStyle } from "@/components/brand/brand-style";
import { Favicon } from "@/components/layout/favicon";
import { DynamicToaster } from "@/components/ui/dynamic-toaster";
import { useAppInfo } from "@/contexts/app-info-context";
import { AuthProvider } from "@/contexts/auth-context";
import { ShareProvider } from "@/contexts/share-context";
import { ThemeProvider } from "../providers/theme-provider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const isRTL = ["ar-SA", "fa-IR", "he-IL"].includes(locale);

  if (typeof window !== "undefined") {
    useAppInfo.getState().refreshAppInfo();
  }

  return (
    <html lang={locale} dir={isRTL ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <Favicon />
      </head>
      <body
        className={`${archivo.variable} ${jetbrains.variable} ${publicSans.variable} ${outfit.variable} ${inter.variable} ${roboto.variable} ${openSans.variable} ${poppins.variable} ${nunito.variable} ${lato.variable} ${montserrat.variable} ${sourceSans.variable} ${raleway.variable} ${workSans.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <BrandStyle />
            <AuthProvider>
              <RedirectHandler>
                <ShareProvider>{children}</ShareProvider>
              </RedirectHandler>
            </AuthProvider>
            <DynamicToaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
