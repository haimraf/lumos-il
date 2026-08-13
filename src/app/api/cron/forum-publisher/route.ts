import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  createServiceClient,
  enqueueDrafts,
  loadForumIdBySlug,
  loadMemberNames,
  loadPublisherSettings,
} from "@/lib/forumPublisherQueue";
import { generateForumDrafts } from "@/lib/forumThreadGenerator";

/**
 * הקרון של מנוע פרסום האשכולות.
 *
 * ההרצה עושה שני דברים נפרדים: ממלאת את התור בטיוטות חדשות ומעבירה אותן בשער,
 * ואז מפרסמת לכל היותר פריט אחד מאושר. הפרדה בין השניים מאפשרת למלא את התור גם
 * כשהפרסום חסום (למשל בגלל מרווח זמן מינימלי) בלי לאבד את הטיוטות.
 *
 * הרשאה: Vercel Cron שולח `Authorization: Bearer $CRON_SECRET`.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  // השוואה באורך קבוע כדי לא לדלוף מידע דרך זמן התגובה.
  if (token.length !== secret.length) return false;
  let mismatch = 0;
  for (let index = 0; index < secret.length; index += 1) {
    mismatch |= token.charCodeAt(index) ^ secret.charCodeAt(index);
  }
  return mismatch === 0;
}

async function publishNextApproved(
  supabase: SupabaseClient,
  minHoursBetweenPosts: number,
) {
  const nowMs = Date.now();

  const { data: lastPublished } = await supabase
    .from("forum_thread_queue")
    .select("published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastPublishedAt = lastPublished?.published_at
    ? new Date(String(lastPublished.published_at)).getTime()
    : null;

  if (
    lastPublishedAt !== null &&
    nowMs - lastPublishedAt < minHoursBetweenPosts * 3600000
  ) {
    return { published: null as string | null, reason: "throttled" };
  }

  const nowIso = new Date(nowMs).toISOString();
  const { data: candidate } = await supabase
    .from("forum_thread_queue")
    .select("id, title")
    .eq("status", "approved")
    .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!candidate) {
    return { published: null as string | null, reason: "queue-empty" };
  }

  const { data, error } = await supabase.rpc("publish_forum_thread_queued", {
    p_queue_id: candidate.id,
  });

  if (error) {
    console.error("[forum-publisher] publish failed", error);
    return { published: null as string | null, reason: error.message };
  }

  return {
    published: (data as { thread_id?: string } | null)?.thread_id || null,
    reason: "ok",
    title: candidate.title as string,
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "חסרים NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  const settings = await loadPublisherSettings(supabase);
  if (!settings) {
    return NextResponse.json({ error: "לא נמצאו הגדרות למנוע הפרסום." }, { status: 500 });
  }

  if (!settings.is_enabled) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }
  if (!settings.author_id) {
    return NextResponse.json({ error: "לא הוגדר מחבר לאשכולות האוטומטיים." }, { status: 400 });
  }

  const [forumIdBySlug, memberNames, drafts] = await Promise.all([
    loadForumIdBySlug(supabase),
    loadMemberNames(supabase),
    generateForumDrafts({ supabase, now: new Date() }),
  ]);

  const enqueued = await enqueueDrafts(supabase, drafts, {
    authorId: settings.author_id,
    forumIdBySlug,
    memberNames,
    settings,
  });

  const publishResult = await publishNextApproved(
    supabase,
    settings.min_hours_between_posts,
  );

  // רישום בפיד הפעילות, כדי שאשכול אוטומטי ייראה בדיוק כמו אשכול רגיל.
  if (publishResult.published) {
    const { data: authorProfile } = await supabase
      .from("profiles")
      .select("full_name, house")
      .eq("id", settings.author_id)
      .maybeSingle();

    await supabase.from("activity_events").insert({
      actor_id: settings.author_id,
      actor_name: authorProfile?.full_name || null,
      actor_house: authorProfile?.house || null,
      event_type: "forum_thread_created",
      icon: "💬",
      title: "פתח/ה שרשור חדש בפורום",
      subtitle: publishResult.title || null,
      target_type: "thread",
      target_id: publishResult.published,
      target_url: `/forums/thread/${publishResult.published}`,
      visibility: "public",
    });
  }

  // התראה לצוות רק כשבאמת נוצר משהו שמחכה להחלטה.
  if (enqueued.needsReview > 0) {
    await supabase.from("notifications").insert({
      user_id: settings.author_id,
      type: "system",
      target_url: "/admin-panel",
      content: `${enqueued.needsReview} טיוטות אשכול ממתינות לבדיקה לפני פרסום`,
      is_read: false,
    });
  }

  return NextResponse.json({
    ok: true,
    generated: drafts.length,
    enqueued,
    publish: publishResult,
  });
}
