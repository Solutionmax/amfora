import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { isSupportedLocale } from "./locales";

const envDefault = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "en-US";
const DEFAULT_LOCALE = isSupportedLocale(envDefault) ? envDefault : "en-US";

export default getRequestConfig(async ({ locale }) => {
  const cookieStore = cookies();
  const cookiesList = await cookieStore;
  const localeCookie = cookiesList.get("NEXT_LOCALE");

  const resolvedLocale = localeCookie?.value || locale || DEFAULT_LOCALE;
  const finalLocale = isSupportedLocale(resolvedLocale) ? resolvedLocale : DEFAULT_LOCALE;

  try {
    return {
      locale: finalLocale,
      messages: (await import(`../../messages/${finalLocale}.json`)).default,
    };
  } catch {
    return {
      locale: DEFAULT_LOCALE,
      messages: (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default,
    };
  }
});
