import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveEventExperience } from "@/app/events/passover/page";
import {
  buildLiveEventLegacyMirror,
  fetchLiveEventBySlug,
  getLiveEventCatalogStatus,
  getLiveEventLabel,
  getLiveEventPhase,
} from "@/lib/liveEvent";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const BASE = "https://lumos-il.co.il";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const event = await fetchLiveEventBySlug(supabase, slug);

  if (!event) return {};

  const status = getLiveEventCatalogStatus(event);
  if (status === "draft" || status === "archived") return {};

  const name = getLiveEventLabel(event) || "איוונט קהילתי";
  const phase = getLiveEventPhase(event);
  const phaseLabel = phase === "live" ? "פעיל עכשיו" : phase === "upcoming" ? "בקרוב" : "הסתיים";
  const description =
    event.description ||
    `${name} — איוונט קהילתי ב-LUMOS IL עם משימות, ניקוד ופרסים. ${phaseLabel}.`;
  const tagline = event.tagline ? ` | ${event.tagline}` : "";
  const url = `${BASE}/events/${slug}`;

  return {
    title: `${name}${tagline}`,
    description,
    openGraph: {
      title: `${name} | LUMOS IL`,
      description,
      url,
      type: "website",
      locale: "he_IL",
      siteName: "LUMOS IL",
      images: [{ url: `${BASE}/images/og-image.png`, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | LUMOS IL`,
      description,
      images: [`${BASE}/images/og-image.png`],
    },
    alternates: { canonical: url },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const event = await fetchLiveEventBySlug(supabase, slug);

  if (!event) {
    notFound();
  }

  const status = getLiveEventCatalogStatus(event);
  if (status === "draft" || status === "archived") {
    notFound();
  }

  return <LiveEventExperience initialEventConfig={buildLiveEventLegacyMirror(event)} />;
}
