import { NextResponse } from "next/server";

import { logAdminAudit } from "@/lib/adminAudit";
import { createServiceClient, missingServiceEnvVars } from "@/lib/forumPublisherQueue";
import { createClient } from "@/utils/supabase/server";

/**
 * פרסום ידני של פריט מהתור ("פרסם עכשיו").
 *
 * publish_forum_thread_queued מורשית ל-service_role בלבד, ולכן הדפדפן לא יכול
 * לקרוא לה ישירות. המסלול הזה מאמת שהמשתמש הוא צוות, ורק אז מפעיל אותה.
 */

const STAFF_ROLES = new Set(["מנהל", "מנחה"]);

export async function POST(request: Request) {
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

    const payload = await request.json().catch(() => null);
    const queueId = String(payload?.queueId || "").trim();
    if (!queueId) {
      return NextResponse.json({ error: "חסר מזהה פריט בתור." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: `חסרים משתני סביבה: ${missingServiceEnvVars().join(", ")}.` },
        { status: 503 },
      );
    }

    // הפונקציה מפרסמת רק פריט במצב approved, אז מסמנים אותו לפני הקריאה.
    const { error: approveError } = await serviceClient
      .from("forum_thread_queue")
      .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", queueId)
      .in("status", ["needs_review", "approved"]);

    if (approveError) {
      return NextResponse.json({ error: approveError.message }, { status: 500 });
    }

    const { data, error } = await serviceClient.rpc("publish_forum_thread_queued", {
      p_queue_id: queueId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const threadId = (data as { thread_id?: string } | null)?.thread_id || null;
    const title = (data as { title?: string } | null)?.title || null;

    if (threadId) {
      await serviceClient.from("activity_events").insert({
        actor_id: user.id,
        actor_name: actorProfile.full_name || null,
        event_type: "forum_thread_created",
        icon: "💬",
        title: "פתח/ה שרשור חדש בפורום",
        subtitle: title,
        target_type: "thread",
        target_id: threadId,
        target_url: `/forums/thread/${threadId}`,
        visibility: "public",
      });
    }

    await logAdminAudit(supabase, {
      actorId: user.id,
      actorName: actorProfile.full_name || null,
      actorRole: actorProfile.role || null,
      action: "publish_queued_forum_thread",
      targetType: "forum_thread_queue",
      targetId: queueId,
      targetLabel: title,
      details: { threadId },
    });

    return NextResponse.json({ ok: true, threadId, title });
  } catch (error) {
    const message = error instanceof Error ? error.message : "הפרסום נכשל.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
