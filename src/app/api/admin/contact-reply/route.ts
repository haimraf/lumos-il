import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { logAdminAudit } from "@/lib/adminAudit";
import { sanitizeHtml } from "@/utils/sanitize";
import { appendContactReplyEntry, type ContactReplyEntry } from "@/lib/contactReplies";

const STAFF_ROLES = new Set(["מנהל", "מנחה"]);
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeMailbox(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function normalizeReplyHtml(value: string) {
  return sanitizeHtml(value || "").trim();
}

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/li>\s*<li[^>]*>/gi, "\n• ")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildContactReplyEmailHtml(args: {
  subject: string;
  bodyHtml: string;
  recipientName: string | null;
  originalSubject: string | null;
  originalMessage: string | null;
}) {
  const safeSubject = escapeHtml(args.subject);
  const safeRecipient = args.recipientName?.trim() ? escapeHtml(args.recipientName.trim()) : null;
  const safeOriginalSubject = args.originalSubject?.trim()
    ? escapeHtml(args.originalSubject.trim())
    : "ללא כותרת";
  const safeOriginalMessage = escapeHtml((args.originalMessage || "").trim() || "לא צורף תוכן נוסף.").replace(
    /\n/g,
    "<br />",
  );

  return `
    <div dir="rtl" style="margin:0;background:#020617;padding:32px 16px;font-family:Assistant,Arial,sans-serif;color:#e2e8f0;">
      <div style="max-width:680px;margin:0 auto;border:1px solid rgba(251,191,36,0.18);border-radius:28px;overflow:hidden;background:linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94));box-shadow:0 24px 80px rgba(2,6,23,0.42);">
        <div style="padding:28px 28px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:radial-gradient(circle at top right,rgba(251,191,36,0.14),transparent 34%),radial-gradient(circle at bottom left,rgba(59,130,246,0.12),transparent 30%);">
          <div style="font-size:11px;letter-spacing:0.26em;text-transform:uppercase;color:rgba(251,191,36,0.8);font-weight:800;margin-bottom:12px;">Lumos IL</div>
          <h1 style="margin:0;font-family:Cinzel,Georgia,serif;font-size:32px;line-height:1.2;color:#fff5d6;">${safeSubject}</h1>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.8;color:rgba(226,232,240,0.78);">
            ${safeRecipient ? `היי ${safeRecipient}, ` : ""}ינשוף התשובה שלנו יצא מהטירה והגיע אליך.
          </p>
        </div>
        <div style="padding:28px;">
          <div style="font-size:17px;line-height:1.9;color:rgba(226,232,240,0.88);">${args.bodyHtml}</div>
          <div style="margin-top:24px;padding:18px 20px;border-radius:20px;border:1px solid rgba(96,165,250,0.16);background:rgba(59,130,246,0.08);">
            <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(191,219,254,0.72);font-weight:800;margin-bottom:10px;">הפנייה המקורית</div>
            <div style="font-size:15px;line-height:1.9;color:rgba(226,232,240,0.86);margin-bottom:10px;"><strong>${safeOriginalSubject}</strong></div>
            <div style="font-size:14px;line-height:1.8;color:rgba(226,232,240,0.72);">${safeOriginalMessage}</div>
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

async function sendViaResend(args: {
  apiKey: string;
  sender: string;
  recipient: string;
  subject: string;
  html: string;
  text: string;
}) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "lumos-il-contact-reply/1.0",
    },
    body: JSON.stringify({
      from: args.sender,
      to: [args.recipient],
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Resend returned ${response.status}`);
  }

  return {
    deliveryId: payload?.id ? String(payload.id) : null,
  };
}

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

    const { data: actorProfile, error: actorError } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (actorError || !actorProfile || !STAFF_ROLES.has(actorProfile.role || "")) {
      return NextResponse.json({ error: "הפעולה זמינה לצוות ההנהלה בלבד." }, { status: 403 });
    }

    const payload = await request.json().catch(() => null);
    const submissionId = String(payload?.submissionId || "").trim();
    const subject = String(payload?.subject || "").trim();
    const bodyHtml = normalizeReplyHtml(String(payload?.body || ""));
    const bodyText = htmlToText(bodyHtml);

    if (!submissionId || !subject || !bodyText) {
      return NextResponse.json({ error: "צריך למלא נושא ותוכן לפני השליחה." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json(
        { error: "חסרים משתני הסביבה של Resend. צריך להגדיר RESEND_API_KEY ו-RESEND_FROM_EMAIL." },
        { status: 503 },
      );
    }

    const { data: submission, error: submissionError } = await supabase
      .from("contact_submissions")
      .select("id, reporter_id, email, name, subject, message, status, metadata")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError || !submission) {
      return NextResponse.json({ error: submissionError?.message || "הפנייה לא נמצאה." }, { status: 404 });
    }

    const recipientEmail = normalizeMailbox(submission.email);
    if (!recipientEmail) {
      return NextResponse.json({ error: "אין כתובת מייל תקינה לפנייה הזאת." }, { status: 400 });
    }

    const emailHtml = buildContactReplyEmailHtml({
      subject,
      bodyHtml,
      recipientName: submission.name || null,
      originalSubject: submission.subject || null,
      originalMessage: submission.message || null,
    });

    const sendResult = await sendViaResend({
      apiKey: process.env.RESEND_API_KEY,
      sender: process.env.RESEND_FROM_EMAIL,
      recipient: recipientEmail,
      subject,
      html: emailHtml,
      text: bodyText,
    });

    const timestamp = new Date().toISOString();
    const replyEntry: ContactReplyEntry = {
      id: crypto.randomUUID(),
      subject,
      html: bodyHtml,
      text: bodyText,
      sent_at: timestamp,
      actor_id: user.id,
      actor_name: actorProfile.full_name || null,
      recipient_email: recipientEmail,
      delivery_id: sendResult.deliveryId,
    };

    const nextMetadata = appendContactReplyEntry(submission.metadata, replyEntry);
    const nextStatus = submission.status === "resolved" ? "resolved" : "in_progress";

    const { error: updateError } = await supabase
      .from("contact_submissions")
      .update({
        metadata: nextMetadata,
        status: nextStatus,
        handled_by: user.id,
        updated_at: timestamp,
      })
      .eq("id", submission.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (submission.reporter_id) {
      await supabase.from("notifications").insert({
        user_id: submission.reporter_id,
        actor_id: user.id,
        type: "reply",
        target_url: "/contact",
        content: "השיב/ה לפנייה שלך בטופס צור קשר",
        is_read: false,
      });
    }

    await logAdminAudit(supabase, {
      actorId: user.id,
      actorName: actorProfile.full_name || null,
      actorRole: actorProfile.role || null,
      action: "reply_contact_submission",
      targetType: "contact_submission",
      targetId: submission.id,
      targetLabel: submission.subject || null,
      details: {
        email: recipientEmail,
        replySubject: subject,
        deliveryId: sendResult.deliveryId,
      },
    });

    return NextResponse.json({
      ok: true,
      submissionId: submission.id,
      deliveryId: sendResult.deliveryId,
      reply: replyEntry,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שליחת המענה נכשלה.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
