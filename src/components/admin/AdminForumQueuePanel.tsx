"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Check, Clock, Loader2, Send, Sparkles, Trash2, Wand2 } from "lucide-react";

import CanonBadge from "@/components/CanonBadge";
import { GATE_REASON_LABELS, type ForumDraftSource, type GateReason } from "@/lib/forumAutoGate";
import type { CanonSource } from "@/lib/wizardingCanon";
import { createClient } from "@/utils/supabase/client";

/**
 * ניהול תור האשכולות האוטומטיים.
 *
 * הפאנל עצמאי ומושך את הנתונים בעצמו (RLS מגביל את הטבלה לצוות בלבד), כדי לא
 * להעמיס עוד עשרה פרופס על עמוד הניהול.
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
  data_snapshot: Record<string, unknown> | null;
  status: QueueStatus;
  gate_reasons: GateReason[] | null;
  generator: string | null;
  scheduled_for: string | null;
  published_thread_id: string | null;
  published_at: string | null;
  created_at: string;
};

type PublisherSettings = {
  is_enabled: boolean;
  author_id: string | null;
  min_hours_between_posts: number;
  blocked_keywords: string[] | null;
};

const STATUS_META: Record<QueueStatus, { label: string; className: string }> = {
  needs_review: {
    label: "ממתין לבדיקה",
    className: "bg-amber-400/10 border-amber-400/25 text-amber-200",
  },
  approved: {
    label: "מאושר לפרסום",
    className: "bg-emerald-400/10 border-emerald-400/25 text-emerald-200",
  },
  published: {
    label: "פורסם",
    className: "bg-sky-400/10 border-sky-400/25 text-sky-200",
  },
  rejected: {
    label: "נדחה",
    className: "bg-rose-400/10 border-rose-400/25 text-rose-200",
  },
};

const FILTERS: Array<{ id: QueueStatus | "all"; label: string }> = [
  { id: "needs_review", label: "ממתינים" },
  { id: "approved", label: "מאושרים" },
  { id: "published", label: "פורסמו" },
  { id: "rejected", label: "נדחו" },
  { id: "all", label: "הכל" },
];

function stripHtml(value: string) {
  return (value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

  const [settings, setSettings] = useState<PublisherSettings | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [forumNames, setForumNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<QueueStatus | "all">("needs_review");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingsResult, queueResult, forumsResult] = await Promise.all([
        supabase
          .from("forum_publisher_settings")
          .select("is_enabled, author_id, min_hours_between_posts, blocked_keywords")
          .eq("id", true)
          .maybeSingle(),
        supabase
          .from("forum_thread_queue")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("forums").select("id, name"),
      ]);

      if (settingsResult.data) {
        const loaded = settingsResult.data as PublisherSettings;
        setSettings(loaded);
        setKeywordDraft((loaded.blocked_keywords || []).join("\n"));
      }
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

  const updateSettings = async (patch: Partial<PublisherSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await supabase.from("forum_publisher_settings").update(patch).eq("id", true);
    if (error) {
      setFeedback({ tone: "error", text: error.message });
      void load();
    }
  };

  const setItemStatus = async (item: QueueItem, status: QueueStatus) => {
    setBusyId(item.id);
    try {
      const { error } = await supabase
        .from("forum_thread_queue")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) {
        setFeedback({ tone: "error", text: error.message });
        return;
      }
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, status } : row)));
      setFeedback({
        tone: "ok",
        text: status === "approved" ? "האשכול יעלה בהרצת הקרון הבאה." : "עודכן.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const generateDrafts = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/admin/forum-queue/generate", { method: "POST" });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback({ tone: "error", text: payload?.error || "ייצור הטיוטות נכשל." });
        return;
      }

      const { inserted = 0, approved = 0, needsReview = 0, skipped = 0 } = payload?.enqueued || {};
      setFeedback({
        tone: "ok",
        text: inserted
          ? `נוספו ${inserted} טיוטות (${approved} מאושרות, ${needsReview} לבדיקה). שום דבר לא פורסם.`
          : `לא נוספו טיוטות חדשות${skipped ? ` — ${skipped} כבר קיימות בתור` : ""}.`,
      });
      setFilter("all");
      void load();
    } finally {
      setIsGenerating(false);
    }
  };

  const publishNow = async (item: QueueItem) => {
    setBusyId(item.id);
    try {
      const response = await fetch("/api/admin/forum-queue/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId: item.id }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback({ tone: "error", text: payload?.error || "הפרסום נכשל." });
        return;
      }
      setFeedback({ tone: "ok", text: "האשכול פורסם." });
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const visibleItems = filter === "all" ? items : items.filter((item) => item.status === filter);
  const pendingCount = items.filter((item) => item.status === "needs_review").length;
  const approvedCount = items.filter((item) => item.status === "approved").length;

  return (
    <section className="admin-card rounded-2xl p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-cinzel text-xs font-black text-orange-400 flex items-center gap-2 uppercase tracking-widest">
          <Sparkles size={13} /> תור אשכולות אוטומטי
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void generateDrafts()}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-300 hover:bg-orange-500 hover:text-white transition-all text-[10px] font-cinzel disabled:opacity-40"
          >
            {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
            ייצר טיוטות עכשיו
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
        טיוטה שעברה את השער מתפרסמת לבד בהרצת הקרון. טיוטה שנעצרה מופיעה כאן עם הסיבה המדויקת.
      </p>

      {/* ── הגדרות המנוע ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
          <div className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">מצב המנוע</div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
            <input
              type="checkbox"
              checked={settings?.is_enabled ?? false}
              onChange={(event) => void updateSettings({ is_enabled: event.target.checked })}
            />
            {settings?.is_enabled ? "פעיל — מפרסם לבד" : "כבוי"}
          </label>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
          <div className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">מרווח בין אשכולות</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={720}
              value={settings?.min_hours_between_posts ?? 48}
              onChange={(event) =>
                void updateSettings({
                  min_hours_between_posts: Math.max(1, parseInt(event.target.value, 10) || 48),
                })
              }
              className="w-20 bg-black/20 border border-white/5 rounded-lg p-2 text-sm text-white/80 outline-none focus:border-orange-500/30"
            />
            <span className="text-xs text-white/40">שעות</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-1">
          <div className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">בתור</div>
          <div className="flex items-baseline gap-3">
            <span className="font-cinzel font-black text-xl text-amber-300">{pendingCount}</span>
            <span className="text-[10px] text-white/30">ממתינים</span>
            <span className="font-cinzel font-black text-xl text-emerald-300">{approvedCount}</span>
            <span className="text-[10px] text-white/30">מאושרים</span>
          </div>
        </div>
      </div>

      {/* ── מילות מפתח שעוצרות פרסום אוטומטי ── */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
        <div className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">
          מילים שעוצרות פרסום אוטומטי
        </div>
        <textarea
          value={keywordDraft}
          onChange={(event) => setKeywordDraft(event.target.value)}
          onBlur={() => {
            const next = keywordDraft
              .split(/[\n,]/)
              .map((word) => word.trim())
              .filter(Boolean);
            void updateSettings({ blocked_keywords: next });
          }}
          dir="rtl"
          placeholder="מילה בכל שורה, או מופרדות בפסיק"
          className="w-full h-20 resize-none bg-black/20 border border-white/5 rounded-xl p-3 text-xs text-white/75 outline-none focus:border-orange-500/30 transition-all"
        />
        <p className="text-[10px] text-white/25 leading-relaxed">
          ההשוואה היא ברמת מילה שלמה (כולל אותיות שימוש כמו &quot;הפרס&quot;), ולכן צריך להוסיף צורות רבים
          בנפרד. רשימה ריקה מחזירה את ברירת המחדל.
        </p>
      </div>

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

      {/* ── מסננים ── */}
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

      {/* ── רשימת התור ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-white/30">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : visibleItems.length === 0 ? (
        <p className="text-center text-white/20 font-cinzel text-xs py-8">אין פריטים בתצוגה הזאת</p>
      ) : (
        <div className="space-y-2">
          {visibleItems.map((item) => {
            const reasons = item.gate_reasons || [];
            const sources = item.sources || [];
            const isExpanded = expandedId === item.id;
            const isBusy = busyId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] border ${STATUS_META[item.status].className}`}
                      >
                        {STATUS_META[item.status].label}
                      </span>
                      <CanonBadge source={item.canon_source} />
                      {item.generator && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-white/5 border border-white/10 text-white/40">
                          {item.generator}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-sm text-white/85">{item.title}</p>
                    <p className="text-[10px] text-white/25">
                      {forumNames[item.forum_id] || "פורום לא ידוע"} · נוצר {formatDate(item.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white/80 transition-all text-[10px] font-cinzel shrink-0"
                  >
                    {isExpanded ? "סגור" : "הצג"}
                  </button>
                </div>

                {/* סיבות עצירה */}
                {reasons.length > 0 && (
                  <div className="rounded-lg border border-amber-400/15 bg-amber-500/[0.06] p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-cinzel text-amber-300/80 uppercase tracking-widest">
                      <AlertTriangle size={10} /> למה נעצר
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

                {isExpanded && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-white/[0.05] bg-black/20 p-3">
                      <div className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest mb-2">
                        תוכן
                      </div>
                      <p className="text-[12px] text-white/65 leading-relaxed whitespace-pre-wrap">
                        {stripHtml(item.content)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/[0.05] bg-black/20 p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[9px] font-cinzel text-white/20 uppercase tracking-widest">
                        <BookOpen size={10} /> מקורות ({sources.length})
                      </div>
                      {sources.length === 0 ? (
                        <p className="text-[11px] text-rose-300/70">אין מקורות מצורפים.</p>
                      ) : (
                        sources.map((source, index) => (
                          <p key={index} className="text-[11px] text-white/55">
                            <span className="text-sky-200/70">{source.label}</span>
                            {source.ref ? <span className="text-white/30"> — {source.ref}</span> : null}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* פעולות */}
                {item.status !== "published" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.status !== "approved" && (
                      <button
                        onClick={() => void setItemStatus(item, "approved")}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-cinzel disabled:opacity-40"
                      >
                        <Check size={11} /> אשר
                      </button>
                    )}
                    <button
                      onClick={() => void publishNow(item)}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-300 hover:bg-orange-500 hover:text-white transition-all text-[10px] font-cinzel disabled:opacity-40"
                    >
                      {isBusy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} פרסם עכשיו
                    </button>
                    {item.status !== "rejected" && (
                      <button
                        onClick={() => void setItemStatus(item, "rejected")}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-all text-[10px] font-cinzel disabled:opacity-40"
                      >
                        <Trash2 size={11} /> דחה
                      </button>
                    )}
                  </div>
                )}

                {item.status === "published" && item.published_thread_id && (
                  <a
                    href={`/forums/thread/${item.published_thread_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-cinzel text-sky-300 hover:text-sky-200 transition-colors"
                  >
                    <Clock size={10} /> פורסם {formatDate(item.published_at)} — פתח אשכול
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
