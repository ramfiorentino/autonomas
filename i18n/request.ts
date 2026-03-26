import { getRequestConfig } from "next-intl/server";
import { auth } from "@/auth";
import { defaultLocale, locales, type Locale } from "@/i18n";

export default getRequestConfig(async () => {
  const session = await auth();

  // Locale from session settings, fallback to default
  const rawLocale = (session as { settings?: { locale?: string } } | null)
    ?.settings?.locale;
  const locale: Locale =
    rawLocale && locales.includes(rawLocale as Locale)
      ? (rawLocale as Locale)
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
