import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import {
  fetchLiveEventSettings,
  getLiveEventHref,
  getLiveEventLabel,
  getLiveEventPhase,
} from "@/lib/liveEvent";

export const dynamic = "force-dynamic";

const EVENT_OG_IMAGE = "https://lumos-il.co.il/logo.png";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const eventConfig = await fetchLiveEventSettings(supabase);
  const eventPhase = getLiveEventPhase(eventConfig);
  const eventLabel = eventPhase === "inactive"
    ? "איוונט בטירה"
    : getLiveEventLabel(eventConfig);
  const tagline = eventConfig.tagline?.trim() || "איוונט חי, חכם ומתעדכן";
  const description = eventConfig.description?.trim()
    || `${eventLabel} ב-LUMOS IL עם משימות דינמיות, ניקוד אישי וביתי, טיימר חי ופרסים לקהילה.`;
  const title = `${eventLabel} | ${tagline} | LUMOS IL`;
  const canonicalPath = getLiveEventHref(eventConfig);
  const canonicalUrl = `https://lumos-il.co.il${canonicalPath}`;
  const isLegacyDuplicate = canonicalPath !== "/events/passover";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: isLegacyDuplicate
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "LUMOS IL",
      type: "website",
      locale: "he_IL",
      images: [
        {
          url: EVENT_OG_IMAGE,
          width: 512,
          height: 512,
          alt: `${eventLabel} | LUMOS IL`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [EVENT_OG_IMAGE],
    },
  };
}

export default function PassoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
