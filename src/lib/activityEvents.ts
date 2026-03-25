import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchLiveEventSettings,
  getProfileLiveEventPoints,
  isLiveEventOpen,
} from "@/lib/liveEvent";

type JsonRecord = Record<string, unknown>;

type ActivityActor = {
  actorId?: string | null;
  actorName?: string | null;
  actorHouse?: string | null;
  actorGroupColor?: string | null;
};

export type ActivityEventInput = ActivityActor & {
  eventType: string;
  icon?: string | null;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  targetType?: string | null;
  targetId?: string | number | null;
  targetUrl?: string | null;
  metadata?: JsonRecord;
  visibility?: "public" | "private";
};

async function resolveActor(
  supabase: SupabaseClient,
  actorId?: string | null,
  fallback?: ActivityActor,
) {
  if (!actorId) {
    return {
      actorName: fallback?.actorName || "קוסמ׳",
      actorHouse: fallback?.actorHouse || null,
      actorGroupColor: fallback?.actorGroupColor || null,
    };
  }

  if (fallback?.actorName && (fallback.actorHouse || fallback.actorGroupColor)) {
    return {
      actorName: fallback.actorName,
      actorHouse: fallback.actorHouse || null,
      actorGroupColor: fallback.actorGroupColor || null,
    };
  }

  const { data } = await supabase
    .from("profiles")
    .select("full_name, house, user_groups(color)")
    .eq("id", actorId)
    .maybeSingle();

  const group = data?.user_groups as { color?: string | null } | null | undefined;

  return {
    actorName: fallback?.actorName || data?.full_name || "קוסמ׳",
    actorHouse: fallback?.actorHouse || data?.house || null,
    actorGroupColor: fallback?.actorGroupColor || group?.color || null,
  };
}

const EVENT_POINTS: Record<string, number> = {
  "quest_trivia_completed": 10,
  "quest_niffler_found": 10,
  "quest_snitch_caught": 15,
  "quest_reward_claimed": 5,
  "forum_post_created": 10,
  "forum_thread_created": 15,
  "forum_reply_created": 10,
  "news_poll_voted": 8,
  "news_comment_created": 5,
  "arena_duel_completed": 15,
  "library_chapter_read": 5,
  "story_published": 25,
  "chapter_published": 15,
  "shop_purchase": 5,
  "house_sorted": 10,
};

function resolveMissionPointsOverride(
  liveEvent: Awaited<ReturnType<typeof fetchLiveEventSettings>>,
  eventType: string,
) {
  for (const mission of liveEvent.missions || []) {
    const missionEventType = typeof mission.event_type === "string"
      ? mission.event_type
      : typeof mission.eventType === "string"
        ? mission.eventType
        : "";

    if (missionEventType !== eventType) continue;

    const missionPoints = Number(mission.points);
    if (Number.isFinite(missionPoints)) return missionPoints;
  }

  return null;
}

type EventPointsSupport = {
  points: number;
  supportsEventPoints: boolean;
  supportsLegacyPoints: boolean;
};

async function resolveEventPointsSupport(
  supabase: SupabaseClient,
  actorId: string,
): Promise<EventPointsSupport> {
  const combined = await supabase
    .from("profiles")
    .select("event_points, passover_points")
    .eq("id", actorId)
    .maybeSingle();

  if (!combined.error) {
    return {
      points: getProfileLiveEventPoints(combined.data as Record<string, unknown> | null),
      supportsEventPoints: true,
      supportsLegacyPoints: true,
    };
  }

  const eventOnly = await supabase
    .from("profiles")
    .select("event_points")
    .eq("id", actorId)
    .maybeSingle();

  if (!eventOnly.error) {
    return {
      points: Number(eventOnly.data?.event_points || 0),
      supportsEventPoints: true,
      supportsLegacyPoints: false,
    };
  }

  const legacyOnly = await supabase
    .from("profiles")
    .select("passover_points")
    .eq("id", actorId)
    .maybeSingle();

  if (!legacyOnly.error) {
    return {
      points: Number(legacyOnly.data?.passover_points || 0),
      supportsEventPoints: false,
      supportsLegacyPoints: true,
    };
  }

  return {
    points: 0,
    supportsEventPoints: false,
    supportsLegacyPoints: false,
  };
}

async function persistEventPoints(
  supabase: SupabaseClient,
  actorId: string,
  nextPoints: number,
  support: EventPointsSupport,
) {
  if (support.supportsEventPoints && support.supportsLegacyPoints) {
    const { error } = await supabase
      .from("profiles")
      .update({ event_points: nextPoints, passover_points: nextPoints })
      .eq("id", actorId);

    if (!error) return;
  }

  if (support.supportsEventPoints) {
    const { error } = await supabase
      .from("profiles")
      .update({ event_points: nextPoints })
      .eq("id", actorId);

    if (!error) return;
  }

  if (support.supportsLegacyPoints) {
    await supabase
      .from("profiles")
      .update({ passover_points: nextPoints })
      .eq("id", actorId);
  }
}

export async function logActivityEvent(
  supabase: SupabaseClient,
  input: ActivityEventInput,
) {
  try {
    const actor = await resolveActor(supabase, input.actorId, input);

    // 1. Log the event
    await supabase.from("activity_events").insert({
      actor_id: input.actorId || null,
      actor_name: actor.actorName,
      actor_house: actor.actorHouse,
      actor_group_color: actor.actorGroupColor,
      event_type: input.eventType,
      icon: input.icon || null,
      title: input.title,
      subtitle: input.subtitle || null,
      description: input.description || null,
      target_type: input.targetType || null,
      target_id: input.targetId != null ? String(input.targetId) : null,
      target_url: input.targetUrl || null,
      metadata: input.metadata || {},
      visibility: input.visibility || "public",
    });

    // 2. Handle live event points
    const liveEvent = await fetchLiveEventSettings(supabase);
    if (input.actorId && isLiveEventOpen(liveEvent, Date.now())) {
      const missionOverride = resolveMissionPointsOverride(liveEvent, input.eventType);
      const points = missionOverride ?? (EVENT_POINTS[input.eventType] || 0);
      if (points > 0) {
        const support = await resolveEventPointsSupport(supabase, input.actorId);
        await persistEventPoints(
          supabase,
          input.actorId,
          support.points + points,
          support,
        );
      }
    }

  } catch (error) {
    console.warn("[activity-events] failed to log event", error);
  }
}
