import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { resolveSlug } from "@/lib/redis-slug";
import { getCachedSettings, setCachedSettings } from "@/lib/redis-settings-cache";
import { BookingPageClient } from "./BookingPageClient";

interface Settings {
  name?: string;
  professionalTitle?: string;
  bookingSlug?: string;
  [key: string]: unknown;
}

async function getSettings(userId: string): Promise<Settings | null> {
  const cached = await getCachedSettings<Settings>(userId);
  if (cached) return cached;
  // Drive read not available on public page (no doctor token).
  // Settings are populated into cache by the doctor's app on availability save.
  return null;
}

export default async function BookSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;

  const userId = await resolveSlug(slug);
  if (!userId) notFound();

  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("booking-lang")?.value;
  const lang: "es" | "en" =
    langParam === "en" || cookieLang === "en" ? "en" : "es";

  const settings = await getSettings(userId);
  const doctorName = settings?.name ?? slug;
  const doctorTitle =
    settings?.professionalTitle ??
    (lang === "es" ? "Médico / Professional" : "Doctor / Professional");

  return (
    <BookingPageClient
      slug={slug}
      userId={userId}
      doctorName={doctorName}
      doctorTitle={doctorTitle}
      initialLang={lang}
    />
  );
}
