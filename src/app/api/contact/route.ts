import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { normalizeContactTopic } from "@/lib/contactTopics";
import { createClient } from "@/utils/supabase/server";

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 160;
const MAX_SUBJECT_LENGTH = 140;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_PATH_LENGTH = 240;

function readText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "גוף הבקשה אינו תקין." }, { status: 400 });
    }

    const website = readText(body.website, 200);
    if (website) {
      return NextResponse.json({ ok: true });
    }

    const topic = normalizeContactTopic(readText(body.topic, 32));
    const name = readText(body.name, MAX_NAME_LENGTH);
    const email = readText(body.email, MAX_EMAIL_LENGTH).toLowerCase();
    const subject = readText(body.subject, MAX_SUBJECT_LENGTH);
    const message = readText(body.message, MAX_MESSAGE_LENGTH);
    const path = readText(body.path, MAX_PATH_LENGTH);

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "צריך למלא שם, אימייל, כותרת ותוכן הפנייה." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "כתובת האימייל לא נראית תקינה." }, { status: 400 });
    }

    if (subject.length < 4) {
      return NextResponse.json({ error: "כותרת הפנייה קצרה מדי." }, { status: 400 });
    }

    if (message.length < 20) {
      return NextResponse.json({ error: "כדאי לפרט קצת יותר כדי שנוכל לעזור." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "מערכת הפניות לא מוגדרת עדיין בשרת." },
        { status: 500 },
      );
    }

    const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await adminClient.from("contact_submissions").insert({
      reporter_id: user?.id || null,
      name,
      email,
      topic,
      subject,
      message,
      source: "contact_form",
      path: path || null,
      metadata: {
        submitted_from: path || null,
        submitted_at: new Date().toISOString(),
        user_agent: request.headers.get("user-agent"),
      },
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "לא הצלחנו לקלוט את הפנייה כרגע.",
      },
      { status: 500 },
    );
  }
}
