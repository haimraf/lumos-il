"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Feather,
  Loader2,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import {
  CONTACT_TOPICS,
  getContactTopicConfig,
  normalizeContactTopic,
  type ContactTopicId,
} from "@/lib/contactTopics";
import { createClient } from "@/utils/supabase/client";

type ContactFormState = {
  name: string;
  email: string;
  topic: ContactTopicId;
  subject: string;
  message: string;
  website: string;
};

const INITIAL_FORM: ContactFormState = {
  name: "",
  email: "",
  topic: "other",
  subject: "",
  message: "",
  website: "",
};

function applyTopicPreset(form: ContactFormState, nextTopicId: ContactTopicId): ContactFormState {
  const previousTopic = getContactTopicConfig(form.topic);
  const nextTopic = getContactTopicConfig(nextTopicId);
  const shouldReplaceSubject =
    !form.subject.trim() || form.subject.trim() === previousTopic.subjectSuggestion;
  const shouldReplaceMessage =
    !form.message.trim() || form.message.trim() === previousTopic.messageTemplate;

  return {
    ...form,
    topic: nextTopicId,
    subject: shouldReplaceSubject ? nextTopic.subjectSuggestion : form.subject,
    message: shouldReplaceMessage ? nextTopic.messageTemplate : form.message,
  };
}

export default function ContactSupportPage() {
  const [supabase] = useState(() => createClient());
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { sendOwl } = useOwlMail();
  const requestedTopic = useMemo(
    () => normalizeContactTopic(searchParams.get("topic")),
    [searchParams],
  );
  const [form, setForm] = useState<ContactFormState>(() => applyTopicPreset(INITIAL_FORM, requestedTopic));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setForm((current) => {
      if (current.topic === requestedTopic) return current;
      return applyTopicPreset(current, requestedTopic);
    });
  }, [requestedTopic]);

  useEffect(() => {
    let isMounted = true;

    const hydrateAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted || !user) return;

      const nextName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : "";

      setIsAuthenticated(true);
      setForm((current) => ({
        ...current,
        name: current.name || nextName,
        email: current.email || user.email || "",
      }));
    };

    void hydrateAuth();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const activeTopic = useMemo(() => getContactTopicConfig(form.topic), [form.topic]);

  const handleFieldChange = <K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleTopicSelect = (topicId: ContactTopicId) => {
    setForm((current) => applyTopicPreset(current, topicId));
  };

  const handleUseTopicTemplate = () => {
    setForm((current) => {
      const topic = getContactTopicConfig(current.topic);
      return {
        ...current,
        subject: topic.subjectSuggestion,
        message: topic.messageTemplate,
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          path: pathname,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "הינשוף איבד את הדרך, נסו לשלוח שוב בעוד רגע.");
      }

      sendOwl(
        "הינשוף המריא בהצלחה",
        "הפנייה שלכם נחתה בלוח הבקרה של הטירה. נחזור אליכם ברגע שנפענח את הכתב.",
        "success",
      );

      setForm((current) => ({
        ...current,
        subject: "",
        message: "",
        website: "",
      }));
    } catch (error) {
      sendOwl(
        "הינשוף סטה מהמסלול",
        error instanceof Error ? error.message : "משהו השתבש בשליחה, כדאי לנסות שוב.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050816] px-6 pb-20 pt-28 text-white" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[2.8rem] border border-amber-500/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.16),transparent_30%),linear-gradient(135deg,rgba(8,15,32,0.95),rgba(6,10,24,0.98))] shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
          <div className="grid gap-10 px-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-14">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-amber-200/85">
                <Feather size={14} />
                הינשופייה
              </div>

              <div className="space-y-4">
                <h1 className="max-w-2xl font-cinzel text-4xl font-black leading-tight text-amber-50 md:text-6xl">
                  שלחו ינשוף, ואנחנו נדאג שהוא ינחת במקום הנכון
                </h1>
                <p className="max-w-xl text-lg leading-8 text-white/72">
                  השרביט לא מגיב, יש לכם רעיון קסום, או שבא לכם לדבר איתנו על הצטרפות לצוות ושיתופי פעולה.
                  פשוט בוחרים נושא וכותבים חופשי. אנחנו כבר ניקח את זה משם.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-300">
                    <ShieldCheck size={18} />
                  </div>
                  <h2 className="font-cinzel text-lg font-black text-white">מיון מהיר</h2>
                  <p className="mt-2 text-sm leading-7 text-white/58">
                    באגים, פורומים, פעילויות או צוות. כל בחירה תפתח מסלול קצת אחר שיעזור לכם למקד את הפנייה.
                  </p>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sky-300">
                    <MessageSquareText size={18} />
                  </div>
                  <h2 className="font-cinzel text-lg font-black text-white">קסם של פנייה</h2>
                  <p className="mt-2 text-sm leading-7 text-white/58">
                    לכל נושא הכנו שאלות מכוונות והתחלה מוצעת שיעזרו לכם לכתוב את הינשוף בלי להיתקע מול דף ריק.
                  </p>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                    <CheckCircle2 size={18} />
                  </div>
                  <h2 className="font-cinzel text-lg font-black text-white">מגיע להנהלה</h2>
                  <p className="mt-2 text-sm leading-7 text-white/58">
                    הינשוף לא ילך לאיבוד בדרך. הוא נשמר בבטחה במערכת ומחכה לנו בלוח הבקרה של הטירה.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2.4rem] border border-white/10 bg-black/30 p-6 shadow-[0_18px_60px_rgba(2,6,23,0.32)] backdrop-blur-xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300/80">
                    המסלול שבחרתם
                  </p>
                  <h2 className="mt-2 font-cinzel text-2xl font-black text-white">
                    {activeTopic.label}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-white/60">
                    {activeTopic.description}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-amber-300">
                  <Sparkles size={20} />
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">שם הקוסם/ת</span>
                    <input
                      required
                      value={form.name}
                      onChange={(event) => handleFieldChange("name", event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none transition focus:border-amber-400/35 focus:bg-white/[0.06]"
                      placeholder="איך נקרא לכם בטירה?"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">אימייל לתשובה</span>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(event) => handleFieldChange("email", event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none transition focus:border-amber-400/35 focus:bg-white/[0.06]"
                      placeholder="name@example.com"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">על מה נדבר</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CONTACT_TOPICS.map((topic) => {
                      const isActive = topic.id === form.topic;

                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => handleTopicSelect(topic.id)}
                          className={`rounded-[1.4rem] border px-4 py-3 text-right transition ${
                            isActive
                              ? "border-amber-400/35 bg-amber-500/12 text-amber-50"
                              : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="font-cinzel text-sm font-black">{topic.label}</div>
                          <div className="mt-1 text-xs leading-6 opacity-80">{topic.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[1.7rem] border border-amber-400/15 bg-amber-500/[0.07] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2 text-right">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200/80">
                        התחלה טובה לפנייה
                      </p>
                      <p className="text-sm leading-7 text-white/72">
                        {activeTopic.hint}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUseTopicTemplate}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-amber-300/20 bg-white/[0.04] px-4 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-amber-100 transition hover:border-amber-300/35 hover:bg-white/[0.08]"
                    >
                      <Sparkles size={14} />
                      תנו לי התחלה
                    </button>
                  </div>
                </div>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">כותרת</span>
                  <input
                    required
                    value={form.subject}
                    onChange={(event) => handleFieldChange("subject", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-base text-white outline-none transition focus:border-amber-400/35 focus:bg-white/[0.06]"
                    placeholder={activeTopic.subjectPlaceholder}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">הפרטים</span>
                  <textarea
                    required
                    value={form.message}
                    onChange={(event) => handleFieldChange("message", event.target.value)}
                    className="min-h-40 w-full resize-y rounded-[1.8rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-base leading-8 text-white outline-none transition focus:border-amber-400/35 focus:bg-white/[0.06]"
                    placeholder={activeTopic.hint}
                  />
                </label>

                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(event) => handleFieldChange("website", event.target.value)}
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="rounded-[1.6rem] border border-sky-400/15 bg-sky-500/[0.07] px-4 py-3 text-sm leading-7 text-sky-100/80">
                  {isAuthenticated
                    ? "אתם כבר מחוברים לטירה, אז יהיה לנו קל הרבה יותר לקשר את הינשוף לחשבון שלכם ולעזור מהר."
                    : "אפשר לשלוח ינשוף גם בלי להתחבר, אבל אם אתם כבר חלק מהטירה עדיף להיכנס קודם כדי שנוכל לעקוב בקלות."}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-start gap-2 text-sm leading-7 text-white/50">
                    <AlertCircle size={16} className="mt-1 shrink-0 text-amber-300/80" />
                    אם תספרו לנו איפה זה קרה, איזה לחש ניסיתם להפעיל ומה בדיוק השתבש, נוכל לעזור הרבה יותר מהר.
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-3.5 font-cinzel text-sm font-black uppercase tracking-[0.22em] text-[#1b1205] transition hover:scale-[1.02] hover:shadow-[0_14px_34px_rgba(245,158,11,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        שולח ינשוף...
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        שליחת ינשוף
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[2.2rem] border border-white/10 bg-white/[0.03] p-7">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300/80">
              לפני ששולחים
            </p>
            <h2 className="mt-3 font-cinzel text-2xl font-black text-white">
              מה יעזור לנו להבין מהר כשמדובר ב{activeTopic.label}
            </h2>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-white/62">
              {activeTopic.checklist.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-1 shrink-0 text-amber-300/80" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2.2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(13,20,39,0.92),rgba(9,13,28,0.98))] p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200/75">
                  מסלולים מהירים
                </p>
                <h2 className="mt-3 font-cinzel text-2xl font-black text-white">
                  אפשר וכדאי לבדוק קודם לבד
                </h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/45">
                לפעמים התשובה כבר כאן
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <Link
                href="/forums"
                className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-cinzel text-lg font-black text-white">פורומים</span>
                  <ArrowUpRight size={18} className="text-white/35" />
                </div>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  שווה לבדוק אם הבעיה היא במועדון אחד ספציפי או ברמת כל המסדרונות בטירה.
                </p>
              </Link>

              <Link
                href="/events/passover"
                className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-cinzel text-lg font-black text-white">איוונטים</span>
                  <ArrowUpRight size={18} className="text-white/35" />
                </div>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  אם גליאונים לא נספרו או שקישור נשבר, מומלץ לחזור לאיוונט ולהעתיק משם פרטים מדויקים.
                </p>
              </Link>

              <Link
                href="/faq"
                className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-cinzel text-lg font-black text-white">שאלות נפוצות</span>
                  <ArrowUpRight size={18} className="text-white/35" />
                </div>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  אם זו שאלה כללית ולא קללה שהשתבשה, יכול מאוד להיות שהתשובה שלכם כבר שם.
                </p>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}