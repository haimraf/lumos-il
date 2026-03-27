"use client";

import { useMemo, useState } from "react";
import { Loader2, Mail, Send, WandSparkles } from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";

type BroadcastAudience = "all" | "sorted" | "unsorted";

type PreviewRecipient = {
  email: string;
  fullName: string | null;
  house: string | null;
};

type BroadcastResponse = {
  mode: "preview" | "test" | "send";
  audience: BroadcastAudience;
  recipientCount: number;
  batchCount?: number;
  sender?: string | null;
  targetEmail?: string | null;
  profileRecipientCount?: number;
  authRecipientCount?: number;
  recipientSource?: string;
  senderConfigured?: boolean;
  apiKeyConfigured?: boolean;
  warning?: string | null;
  sampleRecipients?: PreviewRecipient[];
  audienceBreakdown?: {
    all: number;
    sorted: number;
    unsorted: number;
  };
  error?: string;
};

const DEFAULT_SUBJECT = "מכתב ינשוף חדש מהטירה";
const DEFAULT_BODY = `הטירה שוב בתנועה.

חזרו אלינו לפורומים, לקווסטים, לזירה ולנביא היומי.
יש עכשיו יותר חיבורים בין חלקי האתר, יותר מומנטום ביתי, ויותר הזדמנויות להשאיר חותם.

מחכים לכם,
הנהלת Lumos IL`;

const AUDIENCE_META: Record<
  BroadcastAudience,
  { label: string; hint: string; sendLabel: string }
> = {
  all: {
    label: "כל הרשומים",
    hint: "כולל קוסמים שכבר עברו מיון וגם מי שעדיין מחכים למצנפת.",
    sendLabel: "שלח לכולם",
  },
  sorted: {
    label: "מי שעברו מיון",
    hint: "שימושי להנעה של בתים, גביע הבית, אירועים ומשימות שכבר נשענים על בית.",
    sendLabel: "שלח לממוינים",
  },
  unsorted: {
    label: "מי שעדיין לא מוינו",
    hint: "מעולה לינשוף תזכורת, חזרה לטקס המיון, או החייאת משתמשי בטא ישנים.",
    sendLabel: "שלח ללא־מוינו",
  },
};

export default function EmailBroadcastCard() {
  const { sendOwl } = useOwlMail();
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<BroadcastResponse | null>(null);

  const summaryLabel = useMemo(() => {
    if (!result) return "אפשר לבדוק קהל לפני שליחה";
    if (result.mode === "test") {
      return `נשלח מכתב בדיקה ל-${result.targetEmail || "מייל ההנהלה"}`;
    }
    if (result.mode === "send") {
      return `נשלחו ${result.recipientCount} מיילים לקהל "${AUDIENCE_META[result.audience].label}" ב-${result.batchCount || 0} מחזורים`;
    }
    return `נמצאו ${result.recipientCount} נמענים בקהל "${AUDIENCE_META[result.audience].label}"`;
  }, [result]);

  const missingResendVars = useMemo(() => {
    if (!result) return [];

    const missing: string[] = [];
    if (result.apiKeyConfigured === false) missing.push("RESEND_API_KEY");
    if (result.senderConfigured === false) missing.push("RESEND_FROM_EMAIL");
    return missing;
  }, [result]);

  const runAction = async (mode: "preview" | "test" | "send") => {
    if (!subject.trim() || !body.trim()) {
      sendOwl("חסר תוכן", "צריך למלא גם נושא וגם גוף הודעה לפני שליחה.", "error");
      return;
    }

    if (
      mode === "send" &&
      !confirm(`לשלוח עכשיו את מכתב הינשוף אל הקהל "${AUDIENCE_META[audience].label}"?`)
    ) {
      return;
    }

    const setters = {
      preview: setIsPreviewing,
      test: setIsTesting,
      send: setIsSending,
    } as const;

    setters[mode](true);

    try {
      const response = await fetch("/api/admin/broadcast-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          subject,
          body,
          audience,
        }),
      });

      const payload = (await response.json().catch(() => null)) as BroadcastResponse | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error || "שליחת הדיוור נכשלה.");
      }

      setResult(payload);

      if (mode === "preview") {
        sendOwl("קהל הדיוור נטען", `נמצאו ${payload.recipientCount} נמענים עבור "${AUDIENCE_META[payload.audience].label}".`, "info");
      } else if (mode === "test") {
        sendOwl("מכתב בדיקה נשלח", `בדיקה נשלחה אל ${payload.targetEmail || "מייל ההנהלה"}.`, "magic");
      } else {
        sendOwl("הדיוור יצא לדרך", `נשלחו ${payload.recipientCount} מכתבי ינשוף לקהל "${AUDIENCE_META[payload.audience].label}".`, "success");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "שליחת הדיוור נכשלה.";
      sendOwl("שגיאת דיוור", message, "error");
    } finally {
      setters[mode](false);
    }
  };

  return (
    <section className="admin-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-cinzel text-xs font-black uppercase tracking-widest text-amber-300">
            <Mail size={13} /> דיוור ינשופים
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/45">
            מושך נמענים מהמסד בצורה דינמית, נותן פילוח חכם לפי מצב מיון, ובודק קהל לפני שליחה אמיתית.
          </p>
        </div>
        <div className="rounded-full border border-amber-400/15 bg-amber-500/10 px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.22em] text-amber-100">
          Resend
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {(["all", "sorted", "unsorted"] as const).map((option) => {
          const selected = audience === option;
          const meta = AUDIENCE_META[option];

          return (
            <button
              key={option}
              type="button"
              onClick={() => setAudience(option)}
              className="rounded-2xl border px-4 py-4 text-right transition-all"
              style={{
                borderColor: selected ? "rgba(251,191,36,0.32)" : "rgba(255,255,255,0.08)",
                background: selected ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.03)",
              }}
            >
              <div className="font-cinzel text-[11px] font-black uppercase tracking-[0.2em] text-amber-100">
                {meta.label}
              </div>
              <div className="mt-2 text-xs leading-relaxed text-white/55">{meta.hint}</div>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="נושא המכתב"
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm outline-none transition-all focus:border-amber-400/30"
          dir="rtl"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="גוף מכתב הינשוף"
          className="h-40 w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm leading-relaxed outline-none transition-all focus:border-amber-400/30"
          dir="rtl"
        />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-cinzel uppercase tracking-[0.24em] text-white/30">מצב נוכחי</div>
            <div className="mt-2 text-sm text-white/80">{summaryLabel}</div>
            {typeof result?.profileRecipientCount === "number" && (
              <div className="mt-2 text-xs text-white/45">
                profiles: {result.profileRecipientCount}
                {typeof result.authRecipientCount === "number" ? ` · auth: ${result.authRecipientCount}` : ""}
                {result.recipientSource ? ` · מקור: ${result.recipientSource}` : ""}
              </div>
            )}
          </div>
          {result?.sender && <div className="text-[11px] text-white/35">יישלח מ: {result.sender}</div>}
        </div>

        {result?.audienceBreakdown && (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/65">
              הכול: {result.audienceBreakdown.all}
            </span>
            <span className="rounded-full border border-sky-400/15 bg-sky-500/10 px-2.5 py-1 text-sky-100/85">
              עברו מיון: {result.audienceBreakdown.sorted}
            </span>
            <span className="rounded-full border border-amber-400/15 bg-amber-500/10 px-2.5 py-1 text-amber-100/85">
              טרם מוינו: {result.audienceBreakdown.unsorted}
            </span>
          </div>
        )}

        {result?.warning && (
          <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/85">
            {result.warning}
          </div>
        )}

        {missingResendVars.length > 0 && (
          <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-100/90">
            כדי לשלוח בפועל צריך להוסיף ל-<code>.env.local</code> את: {missingResendVars.join(" + ")} ואז להפעיל מחדש את השרת.
          </div>
        )}

        {result?.sampleRecipients && result.sampleRecipients.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {result.sampleRecipients.map((recipient) => (
              <span
                key={`${recipient.email}-${recipient.house || "none"}`}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60"
              >
                {recipient.fullName || recipient.email}
                {recipient.house ? ` · ${recipient.house}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <button
          onClick={() => void runAction("preview")}
          disabled={isPreviewing || isTesting || isSending}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs font-black uppercase tracking-widest text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPreviewing ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />}
          בדיקת קהל
        </button>
        <button
          onClick={() => void runAction("test")}
          disabled={isPreviewing || isTesting || isSending}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-3 text-xs font-black uppercase tracking-widest text-blue-100 transition-all hover:border-blue-300/35 hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          שלח לעצמי
        </button>
        <button
          onClick={() => void runAction("send")}
          disabled={isPreviewing || isTesting || isSending}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-3 text-xs font-black uppercase tracking-widest text-amber-100 transition-all hover:border-amber-300/35 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {AUDIENCE_META[audience].sendLabel}
        </button>
      </div>
    </section>
  );
}
