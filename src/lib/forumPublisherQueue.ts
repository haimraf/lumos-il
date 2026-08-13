import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { evaluateForumDraft } from "@/lib/forumAutoGate";
import type { GeneratedDraft } from "@/lib/forumThreadGenerator";

/**
 * לוגיקה משותפת למנוע פרסום האשכולות.
 *
 * גם הקרון וגם כפתור "ייצר טיוטות" באדמין ממלאים את אותו תור באותם כללים,
 * ולכן המילוי יושב כאן ולא בתוך אחד המסלולים.
 */

const UNIQUE_VIOLATION = "23505";

export type PublisherSettings = {
  is_enabled: boolean;
  author_id: string | null;
  min_hours_between_posts: number;
  blocked_keywords: string[] | null;
  allowed_link_hosts: string[] | null;
};

export const PUBLISHER_SETTINGS_COLUMNS =
  "is_enabled, author_id, min_hours_between_posts, blocked_keywords, allowed_link_hosts";

export function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function loadPublisherSettings(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("forum_publisher_settings")
    .select(PUBLISHER_SETTINGS_COLUMNS)
    .eq("id", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as PublisherSettings;
}

/** שמות חברי קהילה — השער משתמש בהם כדי לעצור אשכול שמזכיר אדם ספציפי. */
export async function loadMemberNames(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .not("full_name", "is", null)
    .limit(2000);

  return (data || [])
    .map((row) => String((row as { full_name: string }).full_name || "").trim())
    .filter((name) => name.length >= 3);
}

export type EnqueueResult = {
  inserted: number;
  approved: number;
  needsReview: number;
  skipped: number;
};

/** מעביר טיוטות בשער ומכניס אותן לתור. לא מפרסם כלום. */
export async function enqueueDrafts(
  supabase: SupabaseClient,
  drafts: GeneratedDraft[],
  args: {
    authorId: string;
    forumIdBySlug: Record<string, string>;
    memberNames: string[];
    settings: PublisherSettings;
  },
): Promise<EnqueueResult> {
  const result: EnqueueResult = { inserted: 0, approved: 0, needsReview: 0, skipped: 0 };

  for (const draft of drafts) {
    const forumId = args.forumIdBySlug[draft.forumSlug];
    if (!forumId) {
      result.skipped += 1;
      continue;
    }

    const verdict = evaluateForumDraft(draft, {
      blockedKeywords: args.settings.blocked_keywords || undefined,
      allowedLinkHosts: args.settings.allowed_link_hosts || undefined,
      knownMemberNames: args.memberNames,
    });

    const { error } = await supabase.from("forum_thread_queue").insert({
      forum_id: forumId,
      author_id: args.authorId,
      title: draft.title,
      content: draft.content,
      prefix: draft.prefix || null,
      canon_source: draft.canonSource,
      sources: draft.sources,
      data_snapshot: draft.dataSnapshot || {},
      status: verdict.status,
      gate_reasons: verdict.reasons,
      generator: draft.generator,
      dedupe_key: draft.dedupeKey,
      created_by: args.authorId,
    });

    if (error) {
      // הנושא כבר בתור או כבר פורסם — זה המצב התקין ברוב ההרצות.
      if (error.code === UNIQUE_VIOLATION) {
        result.skipped += 1;
        continue;
      }
      console.error("[forum-publisher] enqueue failed", error);
      result.skipped += 1;
      continue;
    }

    result.inserted += 1;
    if (verdict.status === "approved") result.approved += 1;
    else result.needsReview += 1;
  }

  return result;
}

export async function loadForumIdBySlug(supabase: SupabaseClient) {
  const { data } = await supabase.from("forums").select("id, slug");
  const forumIdBySlug: Record<string, string> = {};

  for (const forum of data || []) {
    const row = forum as { id: string; slug: string };
    forumIdBySlug[row.slug] = row.id;
  }

  return forumIdBySlug;
}
