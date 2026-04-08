import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { auth } from "@/auth";
import { defaultLocale, locales, type Locale } from "@/i18n";
import { BottomNav } from "@/components/shell/BottomNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { OfflineDetector } from "@/components/shell/OfflineDetector";
import { SessionGuard } from "@/components/shell/SessionGuard";
import { PastDueBanner } from "@/components/PastDueBanner";
import { checkOnboarding } from "@/lib/actions/check-onboarding";

async function getLocaleMessages(locale: Locale) {
  return (await import(`../../messages/${locale}.json`)).default;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Onboarding gate — skip check when already on onboarding routes to prevent redirect loop
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isOnboardingRoute = pathname.startsWith("/onboarding");

  let settings = null;
  if (!isOnboardingRoute) {
    const result = await checkOnboarding();
    settings = result.settings;
    if (!result.onboarded) {
      redirect("/onboarding");
    }
  }

  const rawLocale = settings?.locale ?? (
    session as { settings?: { locale?: string } } & typeof session
  )?.settings?.locale;
  const locale: Locale =
    rawLocale && locales.includes(rawLocale as Locale)
      ? (rawLocale as Locale)
      : defaultLocale;

  const messages = await getLocaleMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex h-full min-h-screen flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
            <PastDueBanner />
            {children}
          </main>
        <BottomNav />
      </div>
      <OfflineDetector />
      <SessionGuard userId={session.user?.email ?? ""} />
    </NextIntlClientProvider>
  );
}
