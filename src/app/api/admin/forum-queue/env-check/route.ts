import { NextResponse } from "next/server";

import { missingServiceEnvVars } from "@/lib/forumPublisherQueue";
import { createClient } from "@/utils/supabase/server";

/**
 * אבחון סביבה למנוע הפרסום.
 *
 * מחזיר רק *שמות* של משתני סביבה, אף פעם לא ערכים, ורק לצוות ההנהלה. נועד
 * לענות על שאלה אחת שאי אפשר לראות בלוח הבקרה: האם השם שנשמר הוא בדיוק השם
 * שהקוד מחפש. רווח נסתר בסוף השם או ערך ריק נראים זהים בממשק, וכאן הם בולטים.
 */

const STAFF_ROLES = new Set(["מנהל", "מנחה"]);

export const dynamic = "force-dynamic";

export async function GET() {
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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!actorProfile || !STAFF_ROLES.has(actorProfile.role || "")) {
    return NextResponse.json({ error: "הפעולה זמינה לצוות ההנהלה בלבד." }, { status: 403 });
  }

  // JSON.stringify חושף רווחים נסתרים בשם, שבלוח הבקרה נראים כמו שם תקין.
  const relatedKeys = Object.keys(process.env)
    .filter((key) => /SUPABASE|CRON/i.test(key))
    .sort()
    .map((key) => ({
      name: JSON.stringify(key),
      valueLength: (process.env[key] || "").length,
      blankValue: (process.env[key] || "").trim().length === 0,
    }));

  return NextResponse.json({
    missing: missingServiceEnvVars(),
    vercelEnv: process.env.VERCEL_ENV || null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
    relatedKeys,
  });
}
