import type { Metadata } from "next";
import {
  fetchLiveEventBySlug,
  getLiveEventCatalogStatus,
  getLiveEventHref,
  getLiveEventLabel,
} from "@/lib/liveEvent";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const EVENT_OG_IMAGE = "https://lumos-il.co.il/logo.png";

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
      robots: { index: false, follow: true },
    };
  }

  const status = getLiveEventCatalogStatus(event);
  const eventLabel = getLiveEventLabel(event);
  const tagline = event.tagline?.trim() || "איוונט חי, חכם ומתעדכן";
  const description = event.description?.trim()
    || `${eventLabel} ב-LUMOS IL עם משימות איוונט, ניקוד אישי, טבלת מובילים חיה, טיימר קסום ופרסים לקהילה.`;
  const title = `${eventLabel} | ${tagline} | LUMOS IL`;
  const path = getLiveEventHref(event);
  const canonicalUrl = `https://lumos-il.co.il${path}`;

  return {
    title,
    description,
    keywords: [eventLabel, "איוונט הארי פוטר", "איוונט קהילתי", "נקודות איוונט", "טבלת מובילים", "LUMOS IL"],
    robots: status === "archived" || status === "draft"
      ? { index: false, follow: false }
      : { index: true, follow: true },
    alternates: {
      canonical: canonicalUrl,
    },
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

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
