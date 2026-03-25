import type { Metadata } from "next";
import {
  fetchLiveEventBySlug,
  getLiveEventCatalogStatus,
  getLiveEventHref,
  getLiveEventLabel,
} from "@/lib/liveEvent";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type EventLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: EventLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const event = await fetchLiveEventBySlug(supabase, slug);

  if (!event) {
    return {
      title: "איוונט בטירה | LUMOS IL",
      description: "עמוד איוונט מיוחד בטירה של LUMOS IL.",
    };
  }

  const status = getLiveEventCatalogStatus(event);
  const eventLabel = getLiveEventLabel(event);
  const tagline = event.tagline?.trim() || "איוונט חי, חכם ומתעדכן";
  const description = event.description?.trim()
    || `${eventLabel} ב-LUMOS IL עם משימות דינמיות, ניקוד אישי וביתי, טיימר חי ופרסים לקהילה.`;
  const title = `${eventLabel} | ${tagline} | LUMOS IL`;
  const path = getLiveEventHref(event);

  return {
    title,
    description,
    robots: status === "archived" || status === "draft"
      ? { index: false, follow: false }
      : undefined,
    alternates: {
      canonical: `https://lumos-il.co.il${path}`,
    },
    openGraph: {
      title,
      description,
      url: `https://lumos-il.co.il${path}`,
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

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
