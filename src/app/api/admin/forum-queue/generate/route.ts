import { NextResponse } from "next/server";

import { logAdminAudit } from "@/lib/adminAudit";
import {
  createServiceClient,
  enqueueDrafts,
  loadForumIdBySlug,
  loadMemberNames,
  loadPublisherSettings,
  missingServiceEnvVars,
} from "@/lib/forumPublisherQueue";
import { generateForumDrafts } from "@/lib/forumThreadGenerator";
import { createClient } from "@/utils/supabase/server";

/**
 * "ייצר טיוטות עכשיו" — ממלא את התור בלי לפרסם כלום.
 *
 * זה המסלול שמאפשר לראות מה המנוע כותב לפני שמדליקים אותו: הוא עובד גם כאשר
 * is_enabled=false, ובשום מצב הוא לא קורא ל-publish_forum_thread_queued.
 */

const STAFF_ROLES = new Set(["מנהל", "מנחה"]);

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "אין הרשאה פעילה." }, { status: 401 });
    }

    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!actorProfile || !STAFF_ROLES.has(actorProfile.role || "")) {
      return NextResponse.json({ error: "הפעולה זמינה לצוות ההנהלה בלבד." }, { status: 403 });
    }

    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: `חסרים משתני סביבה: ${missingServiceEnvVars().join(", ")}.` },
        { status: 503 },
      );
    }

    const settings = await loadPublisherSettings(serviceClient);
    if (!settings) {
      return NextResponse.json({ error: "לא נמצאו הגדרות למנוע הפרסום." }, { status: 500 });
    }

    // אם עוד לא נבחר מחבר, מי שלוחץ הוא המחבר.
    const authorId = settings.author_id || user.id;

    const [forumIdBySlug, memberNames, drafts] = await Promise.all([
      loadForumIdBySlug(serviceClient),
      loadMemberNames(serviceClient),
      generateForumDrafts({ supabase: serviceClient, now: new Date() }),
    ]);

    const enqueued = await enqueueDrafts(serviceClient, drafts, {
      authorId,
      forumIdBySlug,
      memberNames,
      settings,
    });

    await logAdminAudit(supabase, {
      actorId: user.id,
      actorName: actorProfile.full_name || null,
      actorRole: actorProfile.role || null,
      action: "generate_forum_thread_drafts",
      targetType: "forum_thread_queue",
      details: { generated: drafts.length, ...enqueued },
    });

    return NextResponse.json({ ok: true, generated: drafts.length, enqueued });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ייצור הטיוטות נכשל.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
