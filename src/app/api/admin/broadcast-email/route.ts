import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { logAdminAudit } from "@/lib/adminAudit";
import { isUnsortedHouse } from "@/lib/houses";

type BroadcastMode = "preview" | "test" | "send";
type BroadcastAudience = "all" | "sorted" | "unsorted";

type RecipientRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  house: string | null;
};

type AuthRecipient = {
  id: string;
  email: string;
  fullName: string | null;
};

type NormalizedRecipient = {
  id: string | null;
  email: string;
  fullName: string | null;
  house: string | null;
};

const STAFF_ROLES = new Set(["מנהל", "מנחה"]);
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const MAX_RECIPIENTS_PER_REQUEST = 49;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "");
}

function normalizeBody(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function buildEmailHtml(subject: string, body: string) {
  const safeSubject = escapeHtml(subject);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br />");

  return `
    <div dir="rtl" style="margin:0;background:#020617;padding:32px 16px;font-family:Assistant,Arial,sans-serif;color:#e2e8f0;">
      <div style="max-width:640px;margin:0 auto;border:1px solid rgba(251,191,36,0.18);border-radius:28px;overflow:hidden;background:linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94));box-shadow:0 24px 80px rgba(2,6,23,0.42);">
        <div style="padding:28px 28px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:radial-gradient(circle at top right,rgba(251,191,36,0.14),transparent 34%),radial-gradient(circle at bottom left,rgba(59,130,246,0.12),transparent 30%);">
          <div style="font-size:11px;letter-spacing:0.26em;text-transform:uppercase;color:rgba(251,191,36,0.8);font-weight:800;margin-bottom:12px;">Lumos IL</div>
          <h1 style="margin:0;font-family:Cinzel,Georgia,serif;font-size:32px;line-height:1.2;color:#fff5d6;">${safeSubject}</h1>
        </div>
        <div style="padding:28px;">
          <div style="font-size:17px;line-height:1.9;color:rgba(226,232,240,0.88);">${safeBody}</div>
          <div style="margin-top:24px;padding:18px 20px;border-radius:20px;border:1px solid rgba(96,165,250,0.16);background:rgba(59,130,246,0.08);font-size:14px;line-height:1.8;color:rgba(191,219,254,0.86);">
            אם שכחת מה קורה עכשיו בטירה, מחכים לך בפורומים, בקווסטים, בזירה ובנביא היומי.
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

function extractMailbox(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() || "";
  return normalized || null;
}

function dedupeProfileRecipients(rows: RecipientRow[]) {
  const recipients = new Map<string, NormalizedRecipient>();

  rows.forEach((row) => {
    const email = normalizeEmail(row.email);
    if (!email) return;

    recipients.set(email, {
      id: row.id || null,
      email,
      fullName: row.full_name?.trim() || null,
      house: row.house || null,
    });
  });

  return recipients;
}

async function fetchAuthRecipientsFromAdminApi() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return {
      enabled: false,
      recipients: [] as AuthRecipient[],
    };
  }

  const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const recipients: AuthRecipient[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    users.forEach((user) => {
      const email = normalizeEmail(user.email);
      if (!email) return;

      const metadataName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : null;

      recipients.push({
        id: user.id,
        email,
        fullName: metadataName,
      });
    });

    if (users.length < 1000) break;
    page += 1;
  }

  return {
    enabled: true,
    recipients,
  };
}

function mergeRecipients(profileRecipients: Map<string, NormalizedRecipient>, authRecipients: AuthRecipient[]) {
  const merged = new Map<string, NormalizedRecipient>();

  authRecipients.forEach((recipient) => {
    merged.set(recipient.email, {
      id: recipient.id || null,
      email: recipient.email,
      fullName: recipient.fullName || null,
      house: null,
    });
  });

  profileRecipients.forEach((recipient, email) => {
    const existing = merged.get(email);
    merged.set(email, {
      id: recipient.id || existing?.id || null,
      email,
      fullName: recipient.fullName || existing?.fullName || null,
      house: recipient.house || existing?.house || null,
    });
  });

  return [...merged.values()];
}

function getAudienceBreakdown(recipients: NormalizedRecipient[]) {
  return recipients.reduce(
    (summary, recipient) => {
      if (isUnsortedHouse(recipient.house)) {
        summary.unsorted += 1;
      } else {
        summary.sorted += 1;
      }

      summary.all += 1;
      return summary;
    },
    { all: 0, sorted: 0, unsorted: 0 },
  );
}

function filterRecipientsByAudience(recipients: NormalizedRecipient[], audience: BroadcastAudience) {
  if (audience === "all") return recipients;
  if (audience === "sorted") return recipients.filter((recipient) => !isUnsortedHouse(recipient.house));
  return recipients.filter((recipient) => isUnsortedHouse(recipient.house));
}

async function sendViaResend(args: {
  apiKey: string;
  sender: string;
  subject: string;
  html: string;
  text: string;
  recipients: string[];
}) {
  const senderMailbox = extractMailbox(args.sender);
  if (!senderMailbox) {
    throw new Error("כתובת השולח אינה תקינה.");
  }

  const deliveryIds: string[] = [];
  const batches = chunkArray(args.recipients, MAX_RECIPIENTS_PER_REQUEST);

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `lumos-broadcast-${Date.now()}-${index}`,
        "User-Agent": "lumos-il-admin-broadcast/1.0",
      },
      body: JSON.stringify({
        from: args.sender,
        to: [senderMailbox],
        bcc: batch,
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || `Resend returned ${response.status}`);
    }

    if (payload?.id) {
      deliveryIds.push(String(payload.id));
    }
  }

  return {
    batchCount: batches.length,
    deliveryIds,
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
      return NextResponse.json({ error: "הפעולה זמינה לצוות הנהלה בלבד." }, { status: 403 });
    }

    const payload = await request.json().catch(() => null);
    const mode = (payload?.mode || "preview") as BroadcastMode;
    const audience = (payload?.audience || "all") as BroadcastAudience;
    const subject = String(payload?.subject || "").trim();
    const body = normalizeBody(String(payload?.body || ""));

    if (!["preview", "test", "send"].includes(mode)) {
      return NextResponse.json({ error: "מצב דיוור לא נתמך." }, { status: 400 });
    }

    if (!["all", "sorted", "unsorted"].includes(audience)) {
      return NextResponse.json({ error: "קהל יעד לא נתמך." }, { status: 400 });
    }

    if (!subject || !body) {
      return NextResponse.json({ error: "צריך למלא גם נושא וגם גוף הודעה." }, { status: 400 });
    }

    const { data: profileRows, error: recipientsError } = await supabase
      .from("profiles")
      .select("id, email, full_name, house")
      .not("email", "is", null);

    if (recipientsError) {
      return NextResponse.json({ error: recipientsError.message }, { status: 500 });
    }

    const profileRecipients = dedupeProfileRecipients((profileRows as RecipientRow[] | null) || []);
    const authRecipientsResult = await fetchAuthRecipientsFromAdminApi();
    const mergedRecipients = mergeRecipients(profileRecipients, authRecipientsResult.recipients);
    const recipientSource = authRecipientsResult.enabled ? "profiles+auth" : "profiles-only";
    const audienceBreakdown = getAudienceBreakdown(mergedRecipients);
    const filteredRecipients = filterRecipientsByAudience(mergedRecipients, audience);
    const sender = process.env.RESEND_FROM_EMAIL || null;
    const apiKeyConfigured = Boolean(process.env.RESEND_API_KEY);
    const senderConfigured = Boolean(sender);
    const warning =
      !authRecipientsResult.enabled && profileRecipients.size <= 5
        ? "נמצאו מעט מיילים ב-profiles.email. כדי להגיע לכל הרשומים, הוסף SUPABASE_SERVICE_ROLE_KEY או סנכרן auth.users לתוך profiles.email."
        : null;

    if (mode === "preview") {
      await logAdminAudit(supabase, {
        actorId: user.id,
        actorName: actorProfile.full_name || null,
        actorRole: actorProfile.role || null,
        action: "broadcast_email_preview",
        targetType: "email_broadcast",
        targetLabel: subject,
        details: {
          audience,
          recipientCount: filteredRecipients.length,
          audienceBreakdown,
          profileRecipientCount: profileRecipients.size,
          authRecipientCount: authRecipientsResult.recipients.length,
          recipientSource,
          senderConfigured,
          apiKeyConfigured,
          warning,
        },
      });

      return NextResponse.json({
        mode,
        audience,
        recipientCount: filteredRecipients.length,
        sampleRecipients: filteredRecipients.slice(0, 5).map((recipient) => ({
          email: recipient.email,
          fullName: recipient.fullName,
          house: recipient.house,
        })),
        profileRecipientCount: profileRecipients.size,
        authRecipientCount: authRecipientsResult.recipients.length,
        recipientSource,
        warning,
        sender,
        senderConfigured,
        apiKeyConfigured,
        audienceBreakdown,
      });
    }

    if (!process.env.RESEND_API_KEY || !sender) {
      return NextResponse.json(
        {
          error: "חסרים משתני סביבה ל-Resend. צריך RESEND_API_KEY ו-RESEND_FROM_EMAIL.",
        },
        { status: 503 },
      );
    }

    if (mode === "test") {
      const selfEmail = normalizeEmail(user.email);
      if (!selfEmail) {
        return NextResponse.json({ error: "לחשבון ההנהלה אין כתובת מייל זמינה לבדיקה." }, { status: 400 });
      }

      const result = await sendViaResend({
        apiKey: process.env.RESEND_API_KEY,
        sender,
        subject,
        html: buildEmailHtml(subject, body),
        text: stripHtml(body),
        recipients: [selfEmail],
      });

      await logAdminAudit(supabase, {
        actorId: user.id,
        actorName: actorProfile.full_name || null,
        actorRole: actorProfile.role || null,
        action: "broadcast_email_test",
        targetType: "email_broadcast",
        targetLabel: subject,
        details: {
          audience,
          recipientCount: 1,
          recipient: selfEmail,
          deliveryIds: result.deliveryIds,
        },
      });

      return NextResponse.json({
        mode,
        audience,
        recipientCount: 1,
        batchCount: result.batchCount,
        sender,
        targetEmail: selfEmail,
        audienceBreakdown,
      });
    }

    if (filteredRecipients.length === 0) {
      return NextResponse.json({ error: "לא נמצאו כתובות מייל לקהל היעד שבחרת." }, { status: 400 });
    }

    const sendResult = await sendViaResend({
      apiKey: process.env.RESEND_API_KEY,
      sender,
      subject,
      html: buildEmailHtml(subject, body),
      text: stripHtml(body),
      recipients: filteredRecipients.map((recipient) => recipient.email),
    });

    await logAdminAudit(supabase, {
      actorId: user.id,
      actorName: actorProfile.full_name || null,
      actorRole: actorProfile.role || null,
      action: "broadcast_email_send",
      targetType: "email_broadcast",
      targetLabel: subject,
      details: {
        audience,
        recipientCount: filteredRecipients.length,
        batchCount: sendResult.batchCount,
        audienceBreakdown,
        profileRecipientCount: profileRecipients.size,
        authRecipientCount: authRecipientsResult.recipients.length,
        recipientSource,
        deliveryIds: sendResult.deliveryIds,
      },
    });

    return NextResponse.json({
      mode,
      audience,
      recipientCount: filteredRecipients.length,
      batchCount: sendResult.batchCount,
      sender,
      audienceBreakdown,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שליחת המכתב נכשלה.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
