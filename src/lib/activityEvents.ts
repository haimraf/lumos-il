import type { SupabaseClient } from "@supabase/supabase-js";
import { asSafeInternalHref } from "@/lib/hrefs";

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

export async function logActivityEvent(
  supabase: SupabaseClient,
  input: ActivityEventInput,
) {
  try {
    const { error } = await supabase.rpc("log_activity_event_secure", {
      p_event_type: input.eventType,
      p_title: input.title,
      p_subtitle: input.subtitle || null,
      p_description: input.description || null,
      p_target_type: input.targetType || null,
      p_target_id: input.targetId != null ? String(input.targetId) : null,
      p_target_url: asSafeInternalHref(input.targetUrl),
      p_icon: input.icon || null,
      p_metadata: input.metadata || {},
      p_visibility: input.visibility || "public",
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn("[activity-events] failed to log event", error);
  }
}
