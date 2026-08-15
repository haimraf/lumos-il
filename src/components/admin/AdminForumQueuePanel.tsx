"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertTriangle, BookOpen, Loader2, Pencil, Send, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import CanonBadge from "@/components/CanonBadge";
import {
  evaluateForumDraft,
  GATE_REASON_LABELS,
  stripHtml,
  type ForumDraftSource,
  type GateReason,
} from "@/lib/forumAutoGate";
import { generateForumDrafts } from "@/lib/forumThreadGenerator";
import { logActivityEvent } from "@/lib/activityEvents";
import type { CanonSource } from "@/lib/wizardingCanon";
import { createClient } from "@/utils/supabase/client";
import { sanitizeHtml } from "@/utils/sanitize";

/**
 * מרכז האשכולות המוכנים.
 *
 * הכל רץ מהדפדפן תחת הסשן של המשתמש המחובר — אין קרון, אין service role ואין
 * משתני סביבה. הפרסום עצמו עובר דרך create_forum_thread_secure, בדיוק אותו
 * מסלול שהאתר משתמש בו כשפותחים אשכול ידנית, כך שהאשכול נרשם על שם המפרסם
 * ומופיע בפיד הפעילות כמו כל אשכול אחר.
 *
 * השער (forumAutoGate) עדיין רץ, אבל תפקידו השתנה: הוא כבר לא חוסם פרסום אלא
 * מסמן מה כדאי לקרוא לפני ששולחים.
 */

type QueueStatus = "needs_review" | "approved" | "published" | "rejected";

type QueueItem = {
  id: string;
  forum_id: string;
  title: string;
  content: string;
  prefix: string | null;
  canon_source: CanonSource;
  sources: ForumDraftSource[] | null;
  status: QueueStatus;
  gate_reasons: GateReason[] | null;
  generator: string | null;
  published_thread_id: string | null;
  published_at: string | null;
  created_at: string;
};

const UNIQUE_VIOLATION = "23505";

/** תואם ל-v_cooldown_seconds של forum_thread_created ב-log_activity_event_secure. */
const FEED_COOLDOWN_SECONDS = 45;

const FILTERS: Array<{ id: "ready" | "published" | "rejected" | "all"; label: string }> = [
  { id: "ready", label: "מוכנים לפרסום" },
  { id: "published", label: "פורסמו" },
  { id: "rejected", label: "נדחו" },
  { id: "all", label: "הכל" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminForumQueuePanel() {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<QueueItem[]>([]);
  const [forumNames, setForumNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"ready" | "published" | "rejected" | "all">("ready");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [lastPublishAt, setLastPublishAt] = useState<number | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // log_activity_event_secure חוסם רישום של אשכול נוסף בתוך 45 שניות מהקודם.
  // האשכול עצמו יתפרסם בכל מקרה, אבל הוא לא יוכרז בפיד — כשל שקט לגמרי.
  useEffect(() => {
    if (lastPublishAt === null) return;

    const tick = () => {
      const left = Math.max(0, FEED_COOLDOWN_SECONDS - Math.floor((Date.now() - lastPublishAt) / 1000));
      setCooldownLeft(left);
      return left;
    };

    if (tick() === 0) return;
    const timer = setInterval(() => {
      if (tick() === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastPublishAt]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [queueResult, forumsResult] = await Promise.all([
        supabase
          .from("forum_thread_queue")
          .select(
            "id, forum_id, title, content, prefix, canon_source, sources, status, gate_reasons, generator, published_thread_id, published_at, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("forums").select("id, name"),
      ]);

      setItems((queueResult.data as QueueItem[]) || []);

      const names: Record<string, string> = {};
      for (const forum of (forumsResult.data as Array<{ id: string; name: string }>) || []) {
        names[forum.id] = forum.name;
      }
      setForumNames(names);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  /** מייצר טיוטות מהנתונים החיים ומכניס אותן לתור. לא מפרסם כלום. */
  const generateDrafts = async () => {
    setIsGenerating(true);
    setFeedback(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setFeedback({ tone: "error", text: "צריך להיות מחובר." });
        return;
      }

      const client = supabase as unknown as SupabaseClient;

      const [{ data: profiles }, { data: forums }, drafts] = await Promise.all([
        supabase.from("profiles").select("full_name").not("full_name", "is", null).limit(2000),
        supabase.from("forums").select("id, slug"),
        generateForumDrafts({ supabase: client, now: new Date() }),
      ]);

      const memberNames = (profiles || [])
        .map((row) => String((row as { full_name: string }).full_name || "").trim())
        .filter((name) => name.length >= 3);

      const forumIdBySlug: Record<string, string> = {};
      for (const forum of (forums as Array<{ id: string; slug: string }>) || []) {
        forumIdBySlug[forum.slug] = forum.id;
      }

      let inserted = 0;
      let skipped = 0;
      let flagged = 0;

      for (const draft of drafts) {
        const forumId = forumIdBySlug[draft.forumSlug];
        if (!forumId) {
          skipped += 1;
          continue;
        }

        const verdict = evaluateForumDraft(draft, { knownMemberNames: memberNames });

        const { error } = await supabase.from("forum_thread_queue").insert({
          forum_id: forumId,
          author_id: user.id,
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
          created_by: user.id,
        });

        if (error) {
          // הנושא כבר בתור או כבר פורסם — המצב התקין ברוב ההרצות.
          if (error.code !== UNIQUE_VIOLATION) {
            console.error("[forum-queue] insert failed", error);
          }
          skipped += 1;
          continue;
        }

        inserted += 1;
        if (verdict.reasons.length > 0) flagged += 1;
      }

      setFeedback({
        tone: "ok",
        text: inserted
          ? `נוספו ${inserted} טיוטות${flagged ? `, ${flagged} עם סימון לבדיקה` : ""}. שום דבר לא פורסם.`
          : `אין נושאים חדשים כרגע${skipped ? ` — ${skipped} כבר קיימים בתור` : ""}.`,
      });
      setFilter("ready");
      void load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "ייצור הטיוטות נכשל.";
      setFeedback({ tone: "error", text: message });
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditing = (item: QueueItem) => {
    setEditingId(item.id);
    setDraftTitle(item.title);
    setDraftContent(item.content);
  };

  const saveEdits = async (item: QueueItem) => {
    setBusyId(item.id);
    try {
      const { error } = await supabase
        .from("forum_thread_queue")
        .update({ title: draftTitle.trim(), content: draftContent })
        .eq("id", item.id);

      if (error) {
        setFeedback({ tone: "error", text: error.message });
        return;
      }

      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, title: draftTitle.trim(), content: draftContent } : row,
        ),
      );
      setEditingId(null);
      setFeedback({ tone: "ok", text: "העריכה נשמרה." });
    } finally {
      setBusyId(null);
    }
  };

  /** מפרסם דרך אותו RPC שהאתר משתמש בו לפתיחת אשכול ידנית. */
  const publish = async (item: QueueItem) => {
    const title = editingId === item.id ? draftTitle.trim() : item.title;
    const content = editingId === item.id ? draftContent : item.content;

    if (stripHtml(content).length < 20) {
      setFeedback({ tone: "error", text: "התוכן קצר מדי לפרסום." });
      return;
    }

    setBusyId(item.id);
    try {
      const { data, error } = await supabase.rpc("create_forum_thread_secure", {
        p_forum_id: item.forum_id,
        p_title: title,
        p_content: content,
        p_prefix: item.prefix,
        p_is_pinned: false,
        p_is_locked: false,
      });

      if (error) {
        setFeedback({ tone: "error", text: error.message });
        return;
      }

      const threadId = (data as { thread_id?: string } | null)?.thread_id;
      if (!threadId) {
        setFeedback({ tone: "error", text: "יצירת השרשור נכשלה." });
        return;
      }

      await supabase
        .from("forum_thread_queue")
        .update({
          title,
          content,
          status: "published",
          published_thread_id: threadId,
          published_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // בלי זה האשכול לא יופיע בפיד הפעילות של האתר.
      await logActivityEvent(supabase as unknown as SupabaseClient, {
        actorId: user?.id || null,
        eventType: "forum_thread_created",
        icon: "💬",
        title: "פתח/ה שרשור חדש בפורום",
        subtitle: title,
        description: forumNames[item.forum_id] || null,
        targetType: "thread",
        targetId: threadId,
        targetUrl: `/forums/thread/${threadId}`,
      });

      const wasThrottled = lastPublishAt !== null && Date.now() - lastPublishAt < FEED_COOLDOWN_SECONDS * 1000;
      setLastPublishAt(Date.now());
      setEditingId(null);
      setFeedback({
        tone: "ok",
        text: wasThrottled
          ? "האשכול פורסם, אבל הוא לא נכנס לפיד הפעילות — פרסמת אשכול קודם לפני פחות מדקה."
          : "האשכול פורסם ונכנס לפיד.",
      });
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (item: QueueItem) => {
    setBusyId(item.id);
    try {
      const { error } = await supabase
        .from("forum_thread_queue")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) {
        setFeedback({ tone: "error", text: error.message });
        return;
      }
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, status: "rejected" } : row)),
      );
    } finally {
      setBusyId(null);
    }
  };

  const visibleItems = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "ready") return item.status === "needs_review" || item.status === "approved";
    return item.status === filter;
  });

  const readyCount = items.filter(
    (item) => item.status === "needs_review" || item.status === "approved",
  ).length;

  return (
    <section className="admin-card rounded-2xl p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-cinzel text-xs font-black text-orange-400 flex items-center gap-2 uppercase tracking-widest">
          <Sparkles size={13} /> אשכולות מוכנים ({readyCount})
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void generateDrafts()}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-300 hover:bg-orange-500 hover:text-white transition-all text-[10px] font-cinzel disabled:opacity-40"
          >
            {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
            ייצר טיוטות
          </button>
          <button
            onClick={() => void load()}
            className="px-3 py-1.5 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 transition-all text-[10px] font-cinzel"
          >
            רענן
          </button>
        </div>
      </div>

      <p className="text-[11px] text-white/35 leading-relaxed">
        שום דבר לא מתפרסם לבד. אתה מייצר טיוטות, קורא, עורך אם בא לך, ולוחץ פרסם. האשכול נרשם על שמך
        ומופיע בפיד כמו כל אשכול רגיל.
      </p>

      {cooldownLeft > 0 && (
        <div className="rounded-xl px-4 py-2.5 text-xs border bg-amber-500/10 border-amber-500/25 text-amber-200 flex items-center gap-2">
          <AlertTriangle size={13} className="shrink-0" />
          <span>
            כדאי להמתין <strong>{cooldownLeft}</strong> שניות לפני האשכול הבא — האתר מכריז על אשכול
            אחד לכל היותר בכל 45 שניות, וכל אשכול שיפורסם עכשיו לא יופיע בפיד הפעילות.
          </span>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-xl px-4 py-2.5 text-xs border ${
            feedback.tone === "ok"
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-200"
              : "bg-rose-500/10 border-rose-500/25 text-rose-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setFilter(entry.id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-cinzel transition-all border ${
              filter === entry.id
                ? "bg-orange-500/15 border-orange-500/30 text-orange-300"
                : "bg-white/[0.02] border-white/[0.05] text-white/35 hover:text-white/70"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-white/30">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : visibleItems.length === 0 ? (
        <p className="text-center text-white/20 font-cinzel text-xs py-8">
          אין כאן כלום — לחץ &quot;ייצר טיוטות&quot;
        </p>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const reasons = item.gate_reasons || [];
            const sources = item.sources || [];
            const isEditing = editingId === item.id;
            const isBusy = busyId === item.id;
            const isDone = item.status === "published" || item.status === "rejected";

            return (
              <div
                key={item.id}
                className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CanonBadge source={item.canon_source} />
                      {item.generator && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-white/5 border border-white/10 text-white/40">
                          {item.generator}
                        </span>
                      )}
                      {item.status === "published" && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-sky-400/10 border border-sky-400/25 text-sky-200">
                          פורסם {formatDate(item.published_at)}
                        </span>
                      )}
                      {item.status === "rejected" && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-400/10 border border-rose-400/25 text-rose-200">
                          נדחה
                        </span>
                      )}
                    </div>
                    {isEditing ? (
                      <input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        dir="rtl"
                        className="w-full bg-black/25 border border-orange-500/25 rounded-lg p-2 text-sm font-bold text-white/85 outline-none focus:border-orange-500/50"
                      />
                    ) : (
                      <p className="font-bold text-sm text-white/85">{item.title}</p>
                    )}
                    <p className="text-[10px] text-white/25">
                      {forumNames[item.forum_id] || "פורום לא ידוע"} · נוצר {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>

                {reasons.length > 0 && !isDone && (
                  <div className="rounded-lg border border-amber-400/15 bg-amber-500/[0.06] p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-cinzel text-amber-300/80 uppercase tracking-widest">
                      <AlertTriangle size={10} /> כדאי לקרוא לפני
                    </div>
                    {reasons.map((reason, index) => (
                      <p key={`${reason.code}-${index}`} className="text-[11px] text-white/60">
                        <span className="text-amber-200/80">
                          {GATE_REASON_LABELS[reason.code] || reason.code}:
                        </span>{" "}
                        {reason.message}
                      </p>
                    ))}
                  </div>
                )}

                {isEditing ? (
                  <textarea
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    dir="rtl"
                    className="w-full h-52 resize-y bg-black/25 border border-orange-500/25 rounded-lg p-3 text-[12px] leading-relaxed text-white/75 outline-none focus:border-orange-500/50 font-mono"
                  />
                ) : (
                  <div
                    className="rounded-lg border border-white/[0.05] bg-black/20 p-3 text-[12px] leading-relaxed text-white/70 [&_ul]:list-disc [&_ul]:pr-5 [&_p]:mb-2"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }}
                  />
                )}

                {sources.length > 0 && (
                  <div className="flex items-start gap-1.5 text-[10px] text-white/35">
                    <BookOpen size={10} className="mt-0.5 shrink-0" />
                    <span>
                      {sources
                        .map((source) => (source.ref ? `${source.label} — ${source.ref}` : source.label))
                        .join(" · ")}
                    </span>
                  </div>
                )}

                {!isDone && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      onClick={() => void publish(item)}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-300 hover:bg-orange-500 hover:text-white transition-all text-[11px] font-cinzel font-black disabled:opacity-40"
                    >
                      {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      פרסם
                    </button>
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => void saveEdits(item)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-cinzel disabled:opacity-40"
                        >
                          שמור עריכה
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-2 rounded-xl bg-white/5 text-white/40 hover:text-white/70 transition-all text-[10px] font-cinzel"
                        >
                          בטל
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEditing(item)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-white/45 hover:bg-white/10 hover:text-white/80 transition-all text-[10px] font-cinzel"
                      >
                        <Pencil size={11} /> ערוך
                      </button>
                    )}
                    <button
                      onClick={() => void reject(item)}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-all text-[10px] font-cinzel disabled:opacity-40 mr-auto"
                    >
                      <Trash2 size={11} /> מחק
                    </button>
                  </div>
                )}

                {item.status === "published" && item.published_thread_id && (
                  <a
                    href={`/forums/thread/${item.published_thread_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-[10px] font-cinzel text-sky-300 hover:text-sky-200 transition-colors"
                  >
                    פתח את האשכול ←
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
