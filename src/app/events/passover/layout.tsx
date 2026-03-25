import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import {
  fetchLiveEventSettings,
  getLiveEventLabel,
  getLiveEventPhase,
} from "@/lib/liveEvent";

export const dynamic = "force-dynamic";

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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: "https://lumos-il.co.il/events/passover",
      siteName: "LUMOS IL",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function PassoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
