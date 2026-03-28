"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Coins, Plus, RefreshCw, Save, Search, Trash2, Trophy, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  createQuestDraft,
  DEFAULT_QUEST_CATALOG,
  fetchQuestCatalog,
  QUEST_ACTIVITY_EVENT_OPTIONS,
  QUEST_CATALOG_KEY,
  QUEST_PROFILE_FLAG_OPTIONS,
  QUEST_PROFILE_NUMBER_OPTIONS,
  subscribeToQuestCatalogChanges,
  type QuestCatalogEntry,
  type QuestMetricSource,
  type QuestMetricWindow,
} from "@/lib/gameplay/questCatalog";

const QUEST_TYPE_OPTIONS = [
  { value: "daily", label: "יומי" },
  { value: "weekly", label: "שבועי" },
  { value: "main", label: "ראשי" },
  { value: "house", label: "בית" },
  { value: "exploration", label: "חקירה" },
] as const;

const METRIC_SOURCE_OPTIONS: Array<{ value: QuestMetricSource; label: string }> = [
  { value: "profile_flag", label: "דגל דף קוסם" },
  { value: "activity_total", label: "סך פעילות" },
  { value: "activity_types", label: "סוגי פעילות" },
  { value: "activity_unique_types", label: "סוגי פעילות ייחודיים" },
  { value: "profile_number", label: "שדה מספרי בדף הקוסם" },
];

const WINDOW_OPTIONS: Array<{ value: QuestMetricWindow; label: string }> = [
  { value: "daily", label: "יומי" },
  { value: "weekly", label: "שבועי" },
  { value: "lifetime", label: "מצטבר" },
];

type AdminQuestCatalogTabProps = {
  sendOwl: (title: string, body: string, tone?: "success" | "error" | "magic" | "info") => void;
  onSaved?: () => void;
};

function sortCatalog(entries: QuestCatalogEntry[]) {
  return [...entries].sort((left, right) => left.order - right.order);
}

export default function AdminQuestCatalogTab({ sendOwl, onSaved }: AdminQuestCatalogTabProps) {
  const [supabase] = useState(() => createClient());
  const [catalog, setCatalog] = useState<QuestCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    const data = await fetchQuestCatalog(supabase);
    setCatalog(sortCatalog(data));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const channel = subscribeToQuestCatalogChanges(supabase, "admin-quest-catalog", loadCatalog);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadCatalog, supabase]);

  const updateEntry = useCallback((questId: string, updater: (entry: QuestCatalogEntry) => QuestCatalogEntry) => {
    setCatalog((prev) => sortCatalog(prev.map((entry) => (entry.id === questId ? updater(entry) : entry))));
  }, []);

  const removeEntry = useCallback((questId: string) => {
    setCatalog((prev) => prev.filter((entry) => entry.id !== questId));
  }, []);

  const addEntry = () => {
    const nextOrder = (catalog[catalog.length - 1]?.order || 0) + 10;
    setCatalog((prev) => sortCatalog([...prev, createQuestDraft(nextOrder)]));
  };

  const resetDefaults = () => {
    setCatalog(sortCatalog(DEFAULT_QUEST_CATALOG));
    sendOwl("קטלוג ברירת המחדל נטען", "הקווסטים הוחזרו להגדרות ברירת המחדל. שמור כדי לפרסם.", "info");
  };

  const saveCatalog = async () => {
    setSaving(true);
    const payload = {
      key: QUEST_CATALOG_KEY,
      value: catalog,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("site_settings")
      .upsert(payload, { onConflict: "key" });

    setSaving(false);

    if (error) {
      sendOwl("שמירת הקווסטים נכשלה", error.message, "error");
      return;
    }

    setLastSavedAt(new Date().toISOString());
    sendOwl("קטלוג הקווסטים נשמר", "המשימות יעודכנו לפי ההגדרות החדשות בכל מקום שקורא את הקטלוג.", "success");
    onSaved?.();
  };

  const summary = useMemo(() => ({
    enabled: catalog.filter((entry) => entry.enabled).length,
    daily: catalog.filter((entry) => entry.type === "daily" && entry.enabled).length,
    weekly: catalog.filter((entry) => entry.type === "weekly" && entry.enabled).length,
    totalPoints: catalog.filter((entry) => entry.enabled).reduce((sum, entry) => sum + entry.reward.points, 0),
  }), [catalog]);

  const questHealth = useMemo(() => {
    const enabledEntries = catalog.filter((entry) => entry.enabled);
    const quickDailyEntries = enabledEntries.filter(
      (entry) => entry.type === "daily" && entry.metric.source === "profile_flag",
    );
    const liveDailyEntries = enabledEntries.filter(
      (entry) => (entry.type === "daily" || entry.metric.window === "daily")
        && entry.metric.source !== "profile_flag",
    );
    const missingAction = enabledEntries.filter(
      (entry) => !entry.actionHref?.trim() || !entry.actionLabel?.trim(),
    );
    const missingEventTypes = enabledEntries.filter(
      (entry) => (entry.metric.source === "activity_types" || entry.metric.source === "activity_unique_types")
        && (!entry.metric.eventTypes || entry.metric.eventTypes.length === 0),
    );
    const duplicateIds = enabledEntries.filter(
      (entry, index, entries) => entries.findIndex((candidate) => candidate.id === entry.id) !== index,
    );

    return {
      quickDailyEntries,
      liveDailyEntries,
      missingAction,
      missingEventTypes,
      duplicateIds,
    };
  }, [catalog]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "קווסטים פעילים", value: summary.enabled, color: "text-emerald-300", icon: Trophy },
          { label: "יומיים", value: summary.daily, color: "text-amber-300", icon: Coins },
          { label: "שבועיים", value: summary.weekly, color: "text-sky-300", icon: BookOpenCheck },
          { label: "נקודות כוללות", value: summary.totalPoints, color: "text-fuchsia-300", icon: Zap },
        ].map((item) => (
          <div key={item.label} className="admin-card rounded-2xl p-5 text-center space-y-2 border border-white/[0.05]">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto text-white/40">
              <item.icon size={20} className={item.color} />
            </div>
            <div className={`font-cinzel font-black text-2xl ${item.color}`}>{item.value}</div>
            <div className="font-cinzel text-[9px] text-white/25 uppercase tracking-widest">{item.label}</div>
          </div>
        ))}
      </section>

      <section className="admin-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-cinzel text-sm font-black text-white uppercase tracking-widest">קטלוג קווסטים דינמי</h3>
            <p className="mt-2 text-sm text-white/45 leading-relaxed">
              כל קווסט כאן מגדיר איך ההתקדמות מחושבת, כמה הוא מחלק, ולאן הוא שולח. אותו קטלוג מזין את היעדים החיים, מענקי הקסם היומיים, הדאשבורד וה־Header.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lastSavedAt && (
              <span className="text-[10px] font-cinzel uppercase tracking-[0.18em] text-white/30">
                נשמר {new Date(lastSavedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={() => void loadCatalog()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-cinzel font-black text-white/70 transition-all hover:bg-white/[0.06]"
            >
              <RefreshCw size={12} />
              טען מחדש
            </button>
            <button
              onClick={resetDefaults}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[10px] font-cinzel font-black text-amber-200 transition-all hover:bg-amber-500/20"
            >
              <Trophy size={12} />
              ברירות מחדל
            </button>
            <button
              onClick={addEntry}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-cinzel font-black text-cyan-200 transition-all hover:bg-cyan-500/20"
            >
              <Plus size={12} />
              קווסט חדש
            </button>
            <button
              onClick={saveCatalog}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-cinzel font-black text-emerald-200 transition-all hover:bg-emerald-500/20 disabled:opacity-40"
            >
              <Save size={12} />
              {saving ? "שומר..." : "שמור קטלוג"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          {[
            {
              title: "מה קובע התקדמות",
    body: "מקור ההתקדמות מחליט אם הקווסט נסגר משדה בדף הקוסם, ממסך פעילויות כולל, או מסוגי אירועים מסוימים.",
            },
            {
              title: "מתי המשתמש רואה שינוי",
              body: "שמירה כאן דוחפת את הקטלוג החי ל־/quests, לדאשבורד ול־Header. לא צריך להמתין לרענון ידני.",
            },
            {
              title: "איך לחשוב על תגמול",
              body: "נקודות משפיעות על הבית ועל קצב היומי, וגליאונים מייצרים סיבה לחזור גם כשהנקודות כבר נסגרו.",
            },
            {
              title: "לאן הולך הצעד הבא",
              body: "כל קווסט יכול להגדיר גם לאיזה מסך לשלוח את המשתמש ואיך לקרוא לכפתור, כדי שהמסלול יישאר מסונכרן עם העריכה שלך.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-cyan-400/10 bg-cyan-500/[0.05] p-4 text-sm text-white/55">
              <div className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">{item.title}</div>
              <p className="mt-2 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-card rounded-2xl p-5 space-y-4 border border-emerald-400/10 bg-emerald-500/[0.04]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="font-cinzel text-sm font-black text-white uppercase tracking-widest">בריאות הקווסטים</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              שכבת בדיקה מהירה שמראה אם הקטלוג שאתה עורך באמת יופיע נכון ב־/quests ולאן כל מסלול יישלח בפועל.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-amber-100">
              מענקים מהירים: {questHealth.quickDailyEntries.length}
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-100">
              יעדים חיים: {questHealth.liveDailyEntries.length}
            </span>
            <span className={`rounded-full border px-3 py-1 ${questHealth.missingAction.length > 0 ? "border-rose-400/20 bg-rose-500/10 text-rose-100" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"}`}>
              חסרי מסלול: {questHealth.missingAction.length}
            </span>
            <span className={`rounded-full border px-3 py-1 ${questHealth.missingEventTypes.length > 0 ? "border-rose-400/20 bg-rose-500/10 text-rose-100" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"}`}>
              חסרי אירועים: {questHealth.missingEventTypes.length}
            </span>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-cinzel text-[10px] uppercase tracking-[0.18em] text-white/30">מפת חשיפה</p>
                <h4 className="mt-1 font-cinzel text-base font-black text-white">מה המשתמש יראה ב־/quests</h4>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-amber-400/10 bg-amber-500/[0.05] p-4">
                <div className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">מענקי הקסם היומיים</div>
                <div className="mt-2 space-y-2 text-sm text-white/65">
                  {questHealth.quickDailyEntries.length > 0 ? questHealth.quickDailyEntries.map((entry) => (
                    <div key={`quick-${entry.id}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                      <div className="font-bold text-white">{entry.title}</div>
                      <div className="mt-1 text-xs text-white/45">{entry.actionLabel} · {entry.actionHref}</div>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-white/45">
                      עדיין אין קווסטים שמסווגים כמענקים מהירים.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/10 bg-cyan-500/[0.05] p-4">
                <div className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">יומיות חיות של הטירה</div>
                <div className="mt-2 space-y-2 text-sm text-white/65">
                  {questHealth.liveDailyEntries.length > 0 ? questHealth.liveDailyEntries.map((entry) => (
                    <div key={`live-${entry.id}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                      <div className="font-bold text-white">{entry.title}</div>
                      <div className="mt-1 text-xs text-white/45">{entry.actionLabel} · {entry.actionHref}</div>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-white/45">
                      עדיין אין קווסטים חיים עם חיבור לפעולה אמיתית.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="font-cinzel text-[10px] uppercase tracking-[0.18em] text-white/30">תקלות שכדאי לסגור</p>
            <h4 className="mt-1 font-cinzel text-base font-black text-white">אבחון מהיר</h4>
            <div className="mt-3 space-y-3 text-sm text-white/65">
              {questHealth.missingAction.length === 0 && questHealth.missingEventTypes.length === 0 && questHealth.duplicateIds.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-emerald-100">
                  הכול נראה מחובר: לכל הקווסטים הפעילים יש מסלול, CTA, וחיבור נתונים בסיסי.
                </div>
              ) : (
                <>
                  {questHealth.missingAction.length > 0 && (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4">
                      <div className="font-black text-rose-100">חסר יעד או טקסט כפתור</div>
                      <div className="mt-2 text-xs text-rose-100/80">{questHealth.missingAction.map((entry) => entry.title).join(" • ")}</div>
                    </div>
                  )}
                  {questHealth.missingEventTypes.length > 0 && (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4">
                      <div className="font-black text-rose-100">חסרים סוגי אירועים</div>
                      <div className="mt-2 text-xs text-rose-100/80">{questHealth.missingEventTypes.map((entry) => entry.title).join(" • ")}</div>
                    </div>
                  )}
                  {questHealth.duplicateIds.length > 0 && (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-4">
                      <div className="font-black text-amber-100">יש מזהים כפולים</div>
                      <div className="mt-2 text-xs text-amber-100/80">{questHealth.duplicateIds.map((entry) => entry.id).join(" • ")}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="admin-card rounded-2xl p-6 text-center text-white/40">טוען את קטלוג הקווסטים...</section>
      ) : (
        <div className="space-y-4">
          {catalog.map((entry) => (
            <section key={entry.id} className="admin-card rounded-2xl p-5 border border-white/[0.06] space-y-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 flex-1">
                  <label className="space-y-1 text-xs text-white/45">
                    <span className="font-cinzel uppercase tracking-widest text-white/30">מזהה</span>
                    <input
                      value={entry.id}
                      onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, id: event.target.value.trim() || current.id }))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                      dir="ltr"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-white/45">
                    <span className="font-cinzel uppercase tracking-widest text-white/30">סוג</span>
                    <select
                      value={entry.type}
                      onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, type: event.target.value as QuestCatalogEntry["type"] }))}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                    >
                      {QUEST_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs text-white/45">
                    <span className="font-cinzel uppercase tracking-widest text-white/30">סדר תצוגה</span>
                    <input
                      type="number"
                      value={entry.order}
                      onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, order: Number(event.target.value) || current.order }))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                    />
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80 mt-6 xl:mt-0">
                    <input
                      type="checkbox"
                      checked={entry.enabled}
                      onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, enabled: event.target.checked }))}
                    />
                    פעיל למשתמשים
                  </label>
                </div>
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[10px] font-cinzel font-black text-red-200 transition-all hover:bg-red-500/20"
                >
                  <Trash2 size={12} />
                  הסר קווסט
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-1 text-xs text-white/45">
                  <span className="font-cinzel uppercase tracking-widest text-white/30">כותרת</span>
                  <input
                    value={entry.title}
                    onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                    dir="rtl"
                  />
                </label>
                <label className="space-y-1 text-xs text-white/45">
                  <span className="font-cinzel uppercase tracking-widest text-white/30">יעד</span>
                  <input
                    type="number"
                    min={1}
                    value={entry.target}
                    onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, target: Math.max(1, Number(event.target.value) || 1) }))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
                <label className="space-y-1 text-xs text-white/45 md:col-span-2">
                  <span className="font-cinzel uppercase tracking-widest text-white/30">תיאור</span>
                  <textarea
                    value={entry.description}
                    onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, description: event.target.value }))}
                    className="h-20 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none resize-none"
                    dir="rtl"
                  />
                </label>
                <label className="space-y-1 text-xs text-white/45">
                  <span className="font-cinzel uppercase tracking-widest text-white/30">טקסט יעד</span>
                  <input
                    value={entry.objectiveLabel}
                    onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, objectiveLabel: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                    dir="rtl"
                  />
                </label>
                <label className="space-y-1 text-xs text-white/45">
                  <span className="font-cinzel uppercase tracking-widest text-white/30">מסר השפעה</span>
                  <input
                    value={entry.houseImpactLabel}
                    onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, houseImpactLabel: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                    dir="rtl"
                  />
                </label>
                <label className="space-y-1 text-xs text-white/45">
                  <span className="font-cinzel uppercase tracking-widest text-white/30">קישור לצעד הבא</span>
                  <input
                    value={entry.actionHref}
                    onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, actionHref: event.target.value || "/quests" }))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                    dir="ltr"
                  />
                </label>
                <label className="space-y-1 text-xs text-white/45">
                  <span className="font-cinzel uppercase tracking-widest text-white/30">טקסט כפתור</span>
                  <input
                    value={entry.actionLabel}
                    onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, actionLabel: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                    dir="rtl"
                  />
                </label>
              </div>

              <div className="grid gap-3 xl:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/45 leading-relaxed">
                  <div className="font-cinzel uppercase tracking-widest text-white/30 mb-2">איך לקרוא יעד</div>
                  <div>היעד הוא כמה פעמים צריך לסגור את המדד כדי שהקווסט ייחשב מושלם.</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/45 leading-relaxed">
                  <div className="font-cinzel uppercase tracking-widest text-white/30 mb-2">חלון זמן</div>
                  <div>יומי ושבועי מתאפסים אוטומטית. מצטבר נשמר לאורך כל המסע של המשתמש.</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/45 leading-relaxed">
                  <div className="font-cinzel uppercase tracking-widest text-white/30 mb-2">מסר השפעה</div>
                  <div>זה הטקסט שמסביר למשתמש למה הקווסט הזה חשוב לבית, לא רק לארנק האישי שלו.</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <label className="space-y-1 text-xs text-white/45">
                  <span className="font-cinzel uppercase tracking-widest text-white/30">מקור התקדמות</span>
                  <select
                    value={entry.metric.source}
                    onChange={(event) => updateEntry(entry.id, (current) => ({
                      ...current,
                      metric: {
                        ...current.metric,
                        source: event.target.value as QuestMetricSource,
                        profileField: event.target.value === "profile_number"
                          ? "points_contributed"
                          : event.target.value === "profile_flag"
                            ? "last_reward_date"
                            : undefined,
                        eventTypes: event.target.value === "activity_types" || event.target.value === "activity_unique_types"
                          ? ["arena_duel_completed"]
                          : [],
                        window: event.target.value === "profile_number" ? "lifetime" : "daily",
                      },
                    }))}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                  >
                    {METRIC_SOURCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs text-white/45">
                  <span className="font-cinzel uppercase tracking-widest text-white/30">חלון זמן</span>
                  <select
                    value={entry.metric.window || "daily"}
                    onChange={(event) => updateEntry(entry.id, (current) => ({
                      ...current,
                      metric: { ...current.metric, window: event.target.value as QuestMetricWindow },
                    }))}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                  >
                    {WINDOW_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                {entry.metric.source === "profile_flag" && (
                  <label className="space-y-1 text-xs text-white/45 md:col-span-2 xl:col-span-2">
                                <span className="font-cinzel uppercase tracking-widest text-white/30">שדה בדף הקוסם</span>
                    <select
                      value={entry.metric.profileField || "last_reward_date"}
                      onChange={(event) => updateEntry(entry.id, (current) => ({
                        ...current,
                        metric: { ...current.metric, profileField: event.target.value as QuestCatalogEntry["metric"]["profileField"] },
                      }))}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                    >
                      {QUEST_PROFILE_FLAG_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                {entry.metric.source === "profile_number" && (
                  <label className="space-y-1 text-xs text-white/45 md:col-span-2 xl:col-span-2">
                    <span className="font-cinzel uppercase tracking-widest text-white/30">שדה מספרי</span>
                    <select
                      value={entry.metric.profileField || "points_contributed"}
                      onChange={(event) => updateEntry(entry.id, (current) => ({
                        ...current,
                        metric: { ...current.metric, profileField: event.target.value as QuestCatalogEntry["metric"]["profileField"] },
                      }))}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                    >
                      {QUEST_PROFILE_NUMBER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                )}

                {(entry.metric.source === "activity_types" || entry.metric.source === "activity_unique_types") && (
                  <label className="space-y-1 text-xs text-white/45 md:col-span-2 xl:col-span-4">
                    <span className="font-cinzel uppercase tracking-widest text-white/30">סוגי פעילות מסונכרנים</span>
                    <input
                      value={(entry.metric.eventTypes || []).join(", ")}
                      onChange={(event) => updateEntry(entry.id, (current) => ({
                        ...current,
                        metric: {
                          ...current.metric,
                          eventTypes: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                        },
                      }))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                      dir="ltr"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {QUEST_ACTIVITY_EVENT_OPTIONS.map((option) => {
                        const selected = (entry.metric.eventTypes || []).includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateEntry(entry.id, (current) => {
                              const currentTypes = current.metric.eventTypes || [];
                              const nextTypes = selected
                                ? currentTypes.filter((item) => item !== option.value)
                                : [...currentTypes, option.value];
                              return {
                                ...current,
                                metric: { ...current.metric, eventTypes: nextTypes },
                              };
                            })}
                            className="rounded-full px-2.5 py-1 text-[10px] font-cinzel font-black transition-all"
                            style={{
                              color: selected ? "#67e8f9" : "rgba(255,255,255,0.55)",
                              border: `1px solid ${selected ? "rgba(103,232,249,0.28)" : "rgba(255,255,255,0.08)"}`,
                              background: selected ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.03)",
                            }}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="space-y-1 text-xs text-white/45">
                  <span className="font-cinzel uppercase tracking-widest text-white/30">נקודות</span>
                  <input
                    type="number"
                    value={entry.reward.points}
                    onChange={(event) => updateEntry(entry.id, (current) => ({
                      ...current,
                      reward: { ...current.reward, points: Number(event.target.value) || 0 },
                    }))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
                <label className="space-y-1 text-xs text-white/45">
                  <span className="font-cinzel uppercase tracking-widest text-white/30">גליאונים</span>
                  <input
                    type="number"
                    value={entry.reward.galleons}
                    onChange={(event) => updateEntry(entry.id, (current) => ({
                      ...current,
                      reward: { ...current.reward, galleons: Number(event.target.value) || 0 },
                    }))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
                <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/45 leading-relaxed">
                  <div className="font-cinzel uppercase tracking-widest text-white/30 mb-2">תצוגה חיה</div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{entry.type}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">יעד {entry.target}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{entry.reward.points} נק'</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{entry.reward.galleons} גל'</span>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">{entry.actionLabel}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1" dir="ltr">{entry.actionHref}</span>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
