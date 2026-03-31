import { notFound } from "next/navigation";
import { LiveEventExperience } from "@/app/events/passover/page";
import {
  buildLiveEventLegacyMirror,
  fetchLiveEventBySlug,
  getLiveEventCatalogStatus,
} from "@/lib/liveEvent";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

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
