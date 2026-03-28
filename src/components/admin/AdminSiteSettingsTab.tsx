"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle, ChevronDown, ChevronUp, Globe, Image as ImageIcon,
  ExternalLink, Loader2, Megaphone, Plus, Save, Search, Settings, Smile,
  ToggleLeft, ToggleRight, Trash2, X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { EmojiClickData } from "emoji-picker-react";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SHARE_TITLE,
} from "@/lib/siteMetadata";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export const SITE_CONFIG_KEY = "site_config";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BannerItem = {
  id: string;
  active: boolean;
  text: string;
  color: "amber" | "orange" | "red" | "rose" | "violet" | "indigo" | "sky" | "blue" | "teal" | "emerald";
  icon: string;
  link: string;
  label: string; // short badge label, e.g. "איוונט", "דחוף", ""
};

export type SiteConfig = {
  seo_description: string;
  seo_keywords: string;
  og_image_url: string;
  banners: BannerItem[];
  registration_open: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SITE_CONFIG: SiteConfig = {
  seo_description: "",
  seo_keywords: "",
  og_image_url: DEFAULT_OG_IMAGE,
  banners: [],
  registration_open: true,
};

export const BANNER_COLOR_IDS = [
  "amber", "orange", "red", "rose", "violet", "indigo", "sky", "blue", "teal", "emerald",
] as const;

export const BANNER_COLORS: { id: BannerItem["color"]; label: string; preview: string }[] = [
  { id: "amber",   label: "זהב",      preview: "bg-amber-400"   },
  { id: "orange",  label: "כתום",     preview: "bg-orange-400"  },
  { id: "red",     label: "אדום",     preview: "bg-red-400"     },
  { id: "rose",    label: "ורוד",     preview: "bg-rose-400"    },
  { id: "violet",  label: "סגול",     preview: "bg-violet-400"  },
  { id: "indigo",  label: "אינדיגו",  preview: "bg-indigo-400"  },
  { id: "sky",     label: "תכלת",     preview: "bg-sky-400"     },
  { id: "blue",    label: "כחול",     preview: "bg-blue-400"    },
  { id: "teal",    label: "טורקיז",   preview: "bg-teal-400"    },
  { id: "emerald", label: "ירוק",     preview: "bg-emerald-400" },
];

export const BANNER_PALETTE: Record<BannerItem["color"], {
  wrapper: string; shimmer: string; badge: string; label: string; text: string; cta: string;
}> = {
  amber: {
    wrapper: "bg-gradient-to-l from-amber-950/80 via-[#1a0f00]/60 to-amber-950/80 border-amber-500/20 shadow-[0_4px_24px_rgba(245,158,11,0.1)]",
    shimmer: "from-amber-400/0 via-amber-400/50 to-amber-400/0",
    badge:   "bg-amber-400/15 text-amber-300 ring-amber-400/20",
    label:   "bg-amber-500/25 text-amber-200 border-amber-400/50 border-r-2 border-r-amber-400/70",
    text:    "text-amber-50/90",
    cta:     "bg-amber-400/10 border-amber-400/25 text-amber-200 hover:bg-amber-400/20",
  },
  orange: {
    wrapper: "bg-gradient-to-l from-orange-950/80 via-[#1a0800]/60 to-orange-950/80 border-orange-500/20 shadow-[0_4px_24px_rgba(251,146,60,0.1)]",
    shimmer: "from-orange-400/0 via-orange-400/50 to-orange-400/0",
    badge:   "bg-orange-400/15 text-orange-300 ring-orange-400/20",
    label:   "bg-orange-500/25 text-orange-200 border-orange-400/50 border-r-2 border-r-orange-400/70",
    text:    "text-orange-50/90",
    cta:     "bg-orange-400/10 border-orange-400/25 text-orange-200 hover:bg-orange-400/20",
  },
  red: {
    wrapper: "bg-gradient-to-l from-red-950/80 via-[#1a0000]/60 to-red-950/80 border-red-500/20 shadow-[0_4px_24px_rgba(248,113,113,0.1)]",
    shimmer: "from-red-400/0 via-red-400/50 to-red-400/0",
    badge:   "bg-red-400/15 text-red-300 ring-red-400/20",
    label:   "bg-red-500/25 text-red-200 border-red-400/50 border-r-2 border-r-red-400/70",
    text:    "text-red-50/90",
    cta:     "bg-red-400/10 border-red-400/25 text-red-200 hover:bg-red-400/20",
  },
  rose: {
    wrapper: "bg-gradient-to-l from-rose-950/80 via-[#1a0005]/60 to-rose-950/80 border-rose-500/20 shadow-[0_4px_24px_rgba(251,113,133,0.1)]",
    shimmer: "from-rose-400/0 via-rose-400/50 to-rose-400/0",
    badge:   "bg-rose-400/15 text-rose-300 ring-rose-400/20",
    label:   "bg-rose-500/25 text-rose-200 border-rose-400/50 border-r-2 border-r-rose-400/70",
    text:    "text-rose-50/90",
    cta:     "bg-rose-400/10 border-rose-400/25 text-rose-200 hover:bg-rose-400/20",
  },
  violet: {
    wrapper: "bg-gradient-to-l from-violet-950/80 via-[#0d0015]/60 to-violet-950/80 border-violet-500/20 shadow-[0_4px_24px_rgba(167,139,250,0.1)]",
    shimmer: "from-violet-400/0 via-violet-400/50 to-violet-400/0",
    badge:   "bg-violet-400/15 text-violet-300 ring-violet-400/20",
    label:   "bg-violet-500/25 text-violet-200 border-violet-400/50 border-r-2 border-r-violet-400/70",
    text:    "text-violet-50/90",
    cta:     "bg-violet-400/10 border-violet-400/25 text-violet-200 hover:bg-violet-400/20",
  },
  indigo: {
    wrapper: "bg-gradient-to-l from-indigo-950/80 via-[#050018]/60 to-indigo-950/80 border-indigo-500/20 shadow-[0_4px_24px_rgba(129,140,248,0.1)]",
    shimmer: "from-indigo-400/0 via-indigo-400/50 to-indigo-400/0",
    badge:   "bg-indigo-400/15 text-indigo-300 ring-indigo-400/20",
    label:   "bg-indigo-500/25 text-indigo-200 border-indigo-400/50 border-r-2 border-r-indigo-400/70",
    text:    "text-indigo-50/90",
    cta:     "bg-indigo-400/10 border-indigo-400/25 text-indigo-200 hover:bg-indigo-400/20",
  },
  sky: {
    wrapper: "bg-gradient-to-l from-sky-950/80 via-[#00111a]/60 to-sky-950/80 border-sky-500/20 shadow-[0_4px_24px_rgba(56,189,248,0.1)]",
    shimmer: "from-sky-400/0 via-sky-400/50 to-sky-400/0",
    badge:   "bg-sky-400/15 text-sky-300 ring-sky-400/20",
    label:   "bg-sky-500/25 text-sky-200 border-sky-400/50 border-r-2 border-r-sky-400/70",
    text:    "text-sky-50/90",
    cta:     "bg-sky-400/10 border-sky-400/25 text-sky-200 hover:bg-sky-400/20",
  },
  blue: {
    wrapper: "bg-gradient-to-l from-blue-950/80 via-[#000818]/60 to-blue-950/80 border-blue-500/20 shadow-[0_4px_24px_rgba(96,165,250,0.1)]",
    shimmer: "from-blue-400/0 via-blue-400/50 to-blue-400/0",
    badge:   "bg-blue-400/15 text-blue-300 ring-blue-400/20",
    label:   "bg-blue-500/25 text-blue-200 border-blue-400/50 border-r-2 border-r-blue-400/70",
    text:    "text-blue-50/90",
    cta:     "bg-blue-400/10 border-blue-400/25 text-blue-200 hover:bg-blue-400/20",
  },
  teal: {
    wrapper: "bg-gradient-to-l from-teal-950/80 via-[#001512]/60 to-teal-950/80 border-teal-500/20 shadow-[0_4px_24px_rgba(45,212,191,0.1)]",
    shimmer: "from-teal-400/0 via-teal-400/50 to-teal-400/0",
    badge:   "bg-teal-400/15 text-teal-300 ring-teal-400/20",
    label:   "bg-teal-500/25 text-teal-200 border-teal-400/50 border-r-2 border-r-teal-400/70",
    text:    "text-teal-50/90",
    cta:     "bg-teal-400/10 border-teal-400/25 text-teal-200 hover:bg-teal-400/20",
  },
  emerald: {
    wrapper: "bg-gradient-to-l from-emerald-950/80 via-[#001a0a]/60 to-emerald-950/80 border-emerald-500/20 shadow-[0_4px_24px_rgba(52,211,153,0.1)]",
    shimmer: "from-emerald-400/0 via-emerald-400/50 to-emerald-400/0",
    badge:   "bg-emerald-400/15 text-emerald-300 ring-emerald-400/20",
    label:   "bg-emerald-500/25 text-emerald-200 border-emerald-400/50 border-r-2 border-r-emerald-400/70",
    text:    "text-emerald-50/90",
    cta:     "bg-emerald-400/10 border-emerald-400/25 text-emerald-200 hover:bg-emerald-400/20",
  },
};

const LABEL_PRESETS = ["הכרזה", "איוונט", "דחוף", "גיוס צוות", "תחזוקה"];

// ─── Normalize ────────────────────────────────────────────────────────────────

const DEFAULT_SHARE_DESCRIPTION_PREVIEW = DEFAULT_SEO_DESCRIPTION;

function splitKeywords(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function SiteStatusTile({
  eyebrow,
  value,
  hint,
  accent,
}: {
  eyebrow: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.06] bg-black/20 p-4 text-right">
      <p className="text-[9px] font-cinzel uppercase tracking-[0.24em] text-white/30">{eyebrow}</p>
      <p className={`mt-2 font-cinzel text-lg font-black ${accent}`}>{value}</p>
      <p className="mt-1 text-xs leading-6 text-white/45">{hint}</p>
    </div>
  );
}

function normalizeBannerItem(raw: unknown): BannerItem {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id:     typeof b.id     === "string" ? b.id     : crypto.randomUUID(),
    active: typeof b.active === "boolean" ? b.active : true,
    text:   typeof b.text   === "string" ? b.text   : "",
    color:  (BANNER_COLOR_IDS as readonly string[]).includes(b.color as string)
              ? (b.color as BannerItem["color"]) : "amber",
    icon:   typeof b.icon   === "string" ? b.icon   : "📣",
    link:   typeof b.link   === "string" ? b.link   : "",
    label:  typeof b.label  === "string" ? b.label  : "",
  };
}

function normalizeSiteConfig(raw: unknown): SiteConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SITE_CONFIG };
  const r = raw as Record<string, unknown>;

  // Migrate old single-banner format → banners array
  let banners: BannerItem[] = [];
  if (Array.isArray(r.banners)) {
    banners = r.banners.map(normalizeBannerItem);
  } else if (typeof r.banner_text === "string" && r.banner_text.trim()) {
    banners = [normalizeBannerItem({
      id: "migrated", active: r.banner_active, text: r.banner_text,
      color: r.banner_color, icon: r.banner_icon ?? "📣", link: r.banner_link ?? "", label: "",
    })];
  }

  return {
    seo_description:  typeof r.seo_description  === "string" ? r.seo_description  : "",
    seo_keywords:     typeof r.seo_keywords     === "string" ? r.seo_keywords     : "",
    og_image_url:     typeof r.og_image_url     === "string" ? r.og_image_url     : DEFAULT_OG_IMAGE,
    banners,
    registration_open: typeof r.registration_open === "boolean" ? r.registration_open : true,
  };
}

// ─── BannerPreview ─────────────────────────────────────────────────────────────

export function BannerPreview({ banner }: { banner: BannerItem }) {
  const p = BANNER_PALETTE[banner.color];
  return (
    <div className={`relative w-full border rounded-xl overflow-hidden ${p.wrapper}`} dir="rtl">
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${p.shimmer}`} />
      <div className="flex items-center gap-3 px-4 py-3">
        {banner.icon && (
          <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-lg ring-1 ${p.badge}`}>
            {banner.icon}
          </span>
        )}
        {banner.label && (
          <span className={`shrink-0 text-[9px] font-cinzel font-black uppercase tracking-widest border rounded px-1.5 py-0.5 ${p.label}`}>
            {banner.label}
          </span>
        )}
        <p className={`flex-1 min-w-0 break-words text-[13px] font-bold leading-snug whitespace-pre-line ${p.text}`}>{banner.text || "(ריק)"}</p>
        {banner.link && (
          <span className={`hidden sm:inline-flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-wider ${p.cta}`}>
            לפרטים ←
          </span>
        )}
        <X size={13} className="shrink-0 opacity-30" />
      </div>
    </div>
  );
}

// ─── BannerCard ────────────────────────────────────────────────────────────────

function BannerCard({
  banner, index, total, onPatch, onDelete, onMove,
}: {
  banner: BannerItem;
  index: number;
  total: number;
  onPatch: (patch: Partial<BannerItem>) => void;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const [expanded, setExpanded] = useState(banner.text === "");
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef    = useRef<HTMLDivElement>(null);
  const colorDot    = BANNER_COLORS.find(c => c.id === banner.color);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const h = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showEmoji]);

  const handleEmoji = useCallback((data: EmojiClickData) => {
    const ta = textareaRef.current;
    const emoji = data.emoji;
    if (ta) {
      const s = ta.selectionStart ?? banner.text.length;
      const e = ta.selectionEnd   ?? s;
      const next = banner.text.slice(0, s) + emoji + banner.text.slice(e);
      onPatch({ text: next });
      setTimeout(() => { ta.focus(); ta.setSelectionRange(s + emoji.length, s + emoji.length); }, 0);
    } else {
      onPatch({ text: banner.text + emoji });
    }
    setShowEmoji(false);
  }, [banner.text, onPatch]);

  const hasLink = banner.link.trim().length > 0;
  const isReady = banner.text.trim().length > 0;

  return (
    <div className={`rounded-[1.4rem] border transition-all ${banner.active ? "border-white/10 bg-white/[0.02]" : "border-white/[0.04] bg-black/10 opacity-70"}`}>
      {/* ── Compact header ── */}
      <div className="flex items-start gap-3 px-4 py-4">
        {/* active toggle */}
        <button
          type="button"
          onClick={() => onPatch({ active: !banner.active })}
          aria-label={banner.active ? "השבת באנר" : "הפעל באנר"}
          className="mt-1 shrink-0 rounded-full text-white/70 transition-colors hover:text-white"
        >
          {banner.active
            ? <ToggleRight size={20} className="text-emerald-400" />
            : <ToggleLeft  size={20} className="text-white/25" />}
        </button>

        {/* color dot */}
        <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${colorDot?.preview ?? "bg-white/20"}`} />

        {/* icon */}
        <span className="shrink-0 text-sm">{banner.icon || "📣"}</span>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[8px] font-cinzel font-black uppercase tracking-[0.18em] text-white/45">
          באנר {index + 1}
        </span>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-cinzel font-black uppercase tracking-[0.18em] ${
          banner.active
            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
            : "border-white/10 bg-white/[0.04] text-white/35"
        }`}>
          {banner.active ? "פעיל" : "מושבת"}
        </span>
        {hasLink && (
          <span className="shrink-0 rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-1 text-[8px] font-cinzel font-black uppercase tracking-[0.18em] text-sky-200">
            קישור
          </span>
        )}
        {!isReady && (
          <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[8px] font-cinzel font-black uppercase tracking-[0.18em] text-amber-200">
            טיוטה
          </span>
        )}

        {/* label badge */}
        {banner.label && (
          <span className="shrink-0 text-[8px] font-cinzel font-black uppercase tracking-wider text-white/40 bg-white/[0.06] px-1.5 py-0.5 rounded">
            {banner.label}
          </span>
        )}

        {/* text preview */}
        <span className="flex-1 min-w-0 break-words text-[12px] leading-6 text-white/55">
          {banner.text || <em className="text-white/20 not-italic">באנר חדש ללא טקסט</em>}
        </span>

        {/* reorder */}
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove("up")}
            aria-label="הזז באנר למעלה"
            className="rounded-lg p-1 text-white/20 transition-colors hover:bg-white/[0.04] hover:text-white/60 disabled:opacity-20"
          >
            <ChevronUp size={13} />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove("down")}
            aria-label="הזז באנר למטה"
            className="rounded-lg p-1 text-white/20 transition-colors hover:bg-white/[0.04] hover:text-white/60 disabled:opacity-20"
          >
            <ChevronDown size={13} />
          </button>
        </div>

        {/* expand */}
        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          aria-label={expanded ? "סגור עורך באנר" : "פתח עורך באנר"}
          className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/5 transition-all"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* delete */}
        <button
          type="button"
          onClick={onDelete}
          aria-label="מחק באנר"
          className="p-1.5 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* ── Expanded editor ── */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-4 space-y-4 bg-black/10 rounded-b-xl">
          {/* Textarea */}
          <div>
            <textarea
              ref={textareaRef}
              value={banner.text}
              onChange={(e) => onPatch({ text: e.target.value })}
              placeholder={"טקסט הבאנר… אפשר גם שורה שנייה אם צריך.\nהטקסט מוצג כמו שהוא בראש האתר."}
              className="w-full h-24 resize-none bg-black/20 border border-white/5 rounded-t-xl p-3 text-sm text-white/75 outline-none focus:border-amber-500/30 transition-all"
              dir="rtl"
            />
            {/* Toolbar */}
            <div className="relative flex items-center justify-between bg-black/30 border border-t-0 border-white/5 rounded-b-xl px-3 py-1.5">
              <span className="text-[10px] text-white/20">{banner.text.length} תווים</span>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setShowEmoji(p => !p); }}
                className="flex items-center gap-1.5 text-[11px] font-black text-white/40 hover:text-amber-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
              >
                <Smile size={13} /> הוסף אמוג׳י
              </button>
              {showEmoji && (
                <div ref={emojiRef} className="absolute bottom-full left-0 z-[600] mb-2" dir="ltr">
                  <EmojiPicker
                    onEmojiClick={handleEmoji}
                    lazyLoadEmojis skinTonesDisabled
                    searchPlaceholder="חפש אמוג'י..."
                    height={360} width={310}
                    previewConfig={{ showPreview: false }}
                    style={{
                      "--epr-bg-color": "#0d1728",
                      "--epr-category-label-bg-color": "#0d1728",
                      "--epr-hover-bg-color": "rgba(245,158,11,0.12)",
                      "--epr-focus-bg-color": "rgba(245,158,11,0.18)",
                      "--epr-search-input-bg-color": "#020617",
                      "--epr-search-input-text-color": "#f8fafc",
                      "--epr-search-border-color": "rgba(245,158,11,0.2)",
                      "--epr-text-color": "rgba(255,255,255,0.6)",
                      "--epr-border-color": "rgba(255,255,255,0.08)",
                    } as React.CSSProperties}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Label + icon + link */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-cinzel text-white/25 uppercase tracking-widest">תווית</label>
              <input
                value={banner.label}
                onChange={(e) => onPatch({ label: e.target.value })}
                placeholder="איוונט / דחוף..."
                className="w-full bg-black/20 border border-white/5 rounded-xl p-2.5 text-xs text-white/70 outline-none focus:border-amber-500/30 transition-all"
                dir="rtl"
              />
              <div className="flex flex-wrap gap-1">
                {LABEL_PRESETS.map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => onPatch({ label: l })}
                    className="text-[9px] text-white/30 hover:text-amber-300 transition-colors px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08]"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-cinzel text-white/25 uppercase tracking-widest">אייקון</label>
              <input
                value={banner.icon}
                onChange={(e) => onPatch({ icon: e.target.value })}
                placeholder="📣"
                className="w-full bg-black/20 border border-white/5 rounded-xl p-2.5 text-sm text-center outline-none focus:border-amber-500/30 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-cinzel text-white/25 uppercase tracking-widest">קישור</label>
              <input
                value={banner.link}
                onChange={(e) => onPatch({ link: e.target.value })}
                placeholder="/events/..."
                dir="ltr"
                className="w-full bg-black/20 border border-white/5 rounded-xl p-2.5 text-xs font-mono text-white/60 outline-none focus:border-amber-500/30 transition-all"
              />
            </div>
          </div>

          {/* Color picker */}
          <div className="flex flex-wrap gap-2">
            {BANNER_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onPatch({ color: c.id })}
                aria-label={`בחר צבע ${c.label}`}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black transition-all ${
                  banner.color === c.id
                    ? `${BANNER_PALETTE[c.id].text} border-current bg-white/[0.06] ring-1 ring-white/20`
                    : "border-white/10 text-white/40 hover:border-white/20"}`}
              >
                <span className={`h-2 w-2 rounded-full ${c.preview}`} />
                {c.label}
              </button>
            ))}
          </div>

          {/* Preview */}
          {banner.text && (
            <div className="space-y-3">
              <p className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">תצוגה מקדימה</p>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[9px] font-cinzel uppercase tracking-[0.22em] text-white/25">Desktop</p>
                  <BannerPreview banner={banner} />
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-cinzel uppercase tracking-[0.22em] text-white/25">Mobile</p>
                  <div className="max-w-sm rounded-[1.4rem] border border-white/[0.06] bg-black/10 p-2">
                    <BannerPreview banner={banner} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminSiteSettingsTab() {
  const [supabase] = useState(() => createClient());
  const [config, setConfig] = useState<SiteConfig>({ ...DEFAULT_SITE_CONFIG });
  const [draft, setDraft]   = useState<SiteConfig>({ ...DEFAULT_SITE_CONFIG });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [ogPreviewFailed, setOgPreviewFailed] = useState(false);
  const draftRef = useRef<SiteConfig>({ ...DEFAULT_SITE_CONFIG });
  const bannerSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("site_settings").select("value")
      .eq("key", SITE_CONFIG_KEY).maybeSingle();
    const n = normalizeSiteConfig(data?.value);
    draftRef.current = n;
    setConfig(n);
    setDraft(n);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => { setOgPreviewFailed(false); }, [draft.og_image_url]);
  useEffect(() => () => {
    if (bannerSaveTimerRef.current) clearTimeout(bannerSaveTimerRef.current);
  }, []);

  const save = useCallback(async (patch: Partial<SiteConfig>, fieldKey: string) => {
    setSaving(true);
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    setDraft(next);
    await supabase.from("site_settings").upsert({ key: SITE_CONFIG_KEY, value: next }, { onConflict: "key" });
    setConfig(next);
    setSaving(false);
    setSavedKey(fieldKey);
    setTimeout(() => setSavedKey(null), 2000);
  }, [supabase]);

  // Banner helpers — update the local draft immediately and debounce persistence
  const saveBanners = useCallback((newBanners: BannerItem[]) => {
    const next = { ...draftRef.current, banners: newBanners };
    draftRef.current = next;
    setDraft(next);
    setSaving(true);

    if (bannerSaveTimerRef.current) clearTimeout(bannerSaveTimerRef.current);

    bannerSaveTimerRef.current = setTimeout(async () => {
      const snapshot = draftRef.current;
      await supabase.from("site_settings").upsert({ key: SITE_CONFIG_KEY, value: snapshot }, { onConflict: "key" });
      setConfig(snapshot);
      setSaving(false);
      setSavedKey("banners");
      setTimeout(() => setSavedKey(null), 2000);
    }, 450);
  }, [supabase]);

  const addBanner = () => {
    const newItem: BannerItem = {
      id: crypto.randomUUID(), active: true, text: "",
      color: "amber", icon: "📣", link: "", label: "",
    };
    saveBanners([...draftRef.current.banners, newItem]);
  };

  const patchBanner = useCallback((id: string, patch: Partial<BannerItem>) => {
    saveBanners(draftRef.current.banners.map(b => b.id === id ? { ...b, ...patch } : b));
  }, [saveBanners]);

  const deleteBanner = useCallback((id: string) => {
    saveBanners(draftRef.current.banners.filter(b => b.id !== id));
  }, [saveBanners]);

  const moveBanner = useCallback((id: string, dir: "up" | "down") => {
    const idx = draftRef.current.banners.findIndex(b => b.id === id);
    if (idx === -1) return;
    const arr = [...draftRef.current.banners];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    saveBanners(arr);
  }, [saveBanners]);

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-white/30"><Loader2 size={24} className="animate-spin" /></div>;
  }

  const isDirty = JSON.stringify(draft) !== JSON.stringify(config);
  const keywordList = splitKeywords(draft.seo_keywords);
  const activeBannerCount = draft.banners.filter((banner) => banner.active && banner.text.trim()).length;
  const hasCustomSeo = Boolean(draft.seo_description.trim() || keywordList.length > 0);
  const hasCustomOg = Boolean(draft.og_image_url.trim() && draft.og_image_url !== DEFAULT_SITE_CONFIG.og_image_url);
  const shareTitle = DEFAULT_SHARE_TITLE;
  const shareDescription = draft.seo_description.trim() || DEFAULT_SHARE_DESCRIPTION_PREVIEW;
  const ogPreviewSrc = draft.og_image_url.trim() || DEFAULT_SITE_CONFIG.og_image_url;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <section className="admin-card rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.07] to-transparent p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="flex items-center gap-2 font-cinzel text-sm font-black uppercase tracking-widest text-violet-200">
              <Settings size={16} /> שליטה באתר
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">
              מרכז אחד לבאנרים קבועים, SEO, שיתוף והרשמה. העריכה נשמרת כמעט מיידית, אבל נשארת קריאה וברורה גם כשיש הרבה תוכן.
            </p>
          </div>
          {isDirty && (
            <button onClick={() => void save(draft, "all")} disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/15 px-4 py-2 text-xs font-cinzel font-black uppercase tracking-widest text-violet-100 transition-all hover:bg-violet-500/30 disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              שמור הכל
            </button>
          )}
        </div>
      </section>

      {/* ── הכרזות ── */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SiteStatusTile
          eyebrow="הרשמה"
          value={draft.registration_open ? "פתוחה" : "סגורה"}
          hint={draft.registration_open ? "משתמשים חדשים יכולים להצטרף כרגיל." : "הרשמה חדשה חסומה כרגע."}
          accent={draft.registration_open ? "text-emerald-300" : "text-rose-300"}
        />
        <SiteStatusTile
          eyebrow="באנרים"
          value={`${activeBannerCount} פעילים`}
          hint={draft.banners.length > 0 ? `${draft.banners.length} באנרים מוגדרים כרגע.` : "עדיין לא הוגדרו באנרים קבועים."}
          accent={activeBannerCount > 0 ? "text-amber-200" : "text-white/60"}
        />
        <SiteStatusTile
          eyebrow="SEO"
          value={hasCustomSeo ? "מותאם" : "ברירת מחדל"}
          hint={hasCustomSeo ? `${keywordList.length} מילות מפתח ותיאור מותאם.` : "גוגל ישתמש בברירות המחדל של האתר."}
          accent={hasCustomSeo ? "text-sky-300" : "text-white/60"}
        />
        <SiteStatusTile
          eyebrow="OG Share"
          value={hasCustomOg ? "מותאם" : "ברירת מחדל"}
          hint={hasCustomOg ? "קיים asset ייעודי לכרטיסי שיתוף." : "כרגע מוצגת תמונת OG הכללית של האתר."}
          accent={hasCustomOg ? "text-violet-300" : "text-white/60"}
        />
      </section>

      <section className="admin-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 font-cinzel text-xs font-black uppercase tracking-widest text-amber-300">
              <Megaphone size={13} /> באנרים קבועים בראש האתר
            </h4>
            <p className="text-xs text-white/35 mt-1.5">
              אלו ההודעות הקבועות שמופיעות בראש האתר לפי הסדר שהגדרת. הן לא שידור חי, וכל אחת ניתנת לסגירה בנפרד.
            </p>
          </div>
          <button
            onClick={addBanner}
            disabled={draft.banners.length >= 6}
            className="shrink-0 flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-300 rounded-xl px-3 py-2 text-[11px] font-cinzel font-black uppercase tracking-wider transition-all disabled:opacity-30"
          >
            <Plus size={12} /> הכרזה חדשה
          </button>
        </div>

        {draft.banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border border-dashed border-white/[0.08] rounded-xl">
            <span className="text-3xl opacity-30">📣</span>
            <p className="text-sm text-white/30">אין הכרזות עדיין</p>
            <button onClick={addBanner}
              className="text-xs text-amber-400/70 hover:text-amber-300 transition-colors underline underline-offset-2">
              צור הכרזה ראשונה
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {draft.banners.map((b, i) => (
              <BannerCard
                key={b.id}
                banner={b}
                index={i}
                total={draft.banners.length}
                onPatch={(patch) => patchBanner(b.id, patch)}
                onDelete={() => deleteBanner(b.id)}
                onMove={(dir) => moveBanner(b.id, dir)}
              />
            ))}
          </div>
        )}

        {savedKey === "banners" && (
          <p className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle size={11} /> נשמר</p>
        )}
      </section>

      {/* ── SEO גלובלי ── */}
      <section className="admin-card rounded-2xl p-6 space-y-5">
        <h4 className="flex items-center gap-2 font-cinzel text-xs font-black uppercase tracking-widest text-sky-300">
          <Search size={13} /> SEO גלובלי
        </h4>
        <p className="text-xs text-white/35 -mt-2">אפשר להשאיר ריק כדי להשתמש בברירות המחדל.</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] font-cinzel text-white/25 uppercase tracking-widest flex items-center gap-1">
              <Globe size={10} /> תיאור האתר (Meta Description)
            </label>
            <textarea
              value={draft.seo_description}
              onChange={(e) => setDraft(d => ({ ...d, seo_description: e.target.value }))}
              onBlur={() => { if (draft.seo_description !== config.seo_description) void save({ seo_description: draft.seo_description }, "seo"); }}
              placeholder="תיאור קצר שמופיע בגוגל מתחת לשם האתר..."
              maxLength={160}
              className="w-full h-20 resize-none bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/75 outline-none focus:border-sky-500/30 transition-all"
              dir="rtl"
            />
            <p className="text-[10px] text-white/20">{draft.seo_description.length}/160</p>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-cinzel text-white/25 uppercase tracking-widest">מילות מפתח (מופרדות בפסיק)</label>
            <input
              value={draft.seo_keywords}
              onChange={(e) => setDraft(d => ({ ...d, seo_keywords: e.target.value }))}
              onBlur={() => { if (draft.seo_keywords !== config.seo_keywords) void save({ seo_keywords: draft.seo_keywords }, "seo"); }}
              placeholder="הארי פוטר, קהילה, פורום..."
              className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/75 outline-none focus:border-sky-500/30 transition-all"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-cinzel text-white/25 uppercase tracking-widest flex items-center gap-1">
              <ImageIcon size={10} /> כתובת תמונת OG (1200×630)
            </label>
            <input
              value={draft.og_image_url}
              onChange={(e) => setDraft(d => ({ ...d, og_image_url: e.target.value }))}
              onBlur={() => { if (draft.og_image_url !== config.og_image_url) void save({ og_image_url: draft.og_image_url }, "seo"); }}
              placeholder="/images/og-image.png"
              dir="ltr"
              className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm font-mono text-white/75 outline-none focus:border-sky-500/30 transition-all"
            />
            <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                {!ogPreviewFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ogPreviewSrc}
                    alt="OG preview"
                    className="w-full object-cover aspect-[1200/630]"
                    onError={() => setOgPreviewFailed(true)}
                  />
                ) : (
                  <div className="flex aspect-[1200/630] items-center justify-center text-center text-xs text-white/35">
                    לא הצלחנו לטעון את תמונת השיתוף.
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4 text-right">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[9px] font-cinzel uppercase tracking-[0.24em] text-white/25">Share Preview</p>
                  <a
                    href={ogPreviewSrc}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-cinzel font-black uppercase tracking-[0.18em] text-sky-300/80 transition-colors hover:text-sky-200"
                  >
                    פתח asset
                    <ExternalLink size={12} />
                  </a>
                </div>
                <p className="mt-4 font-cinzel text-base font-black text-white">{shareTitle}</p>
                <p className="mt-3 text-sm leading-6 text-white/55">{shareDescription}</p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.16em] text-white/45">
                    lumos-il.co.il
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.16em] ${
                    hasCustomOg
                      ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
                      : "border-white/10 bg-white/[0.04] text-white/45"
                  }`}>
                    {hasCustomOg ? "תמונת OG מותאמת" : "תמונת ברירת מחדל"}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-cinzel uppercase tracking-[0.16em] ${
                    hasCustomSeo
                      ? "border-sky-400/20 bg-sky-500/10 text-sky-200"
                      : "border-white/10 bg-white/[0.04] text-white/45"
                  }`}>
                    {hasCustomSeo ? "SEO מותאם" : "SEO ברירת מחדל"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {savedKey === "seo" && <p className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle size={11} /> נשמר</p>}
      </section>

      {/* ── הגדרות מערכת ── */}
      <section className="admin-card rounded-2xl p-6 space-y-4">
        <h4 className="flex items-center gap-2 font-cinzel text-xs font-black uppercase tracking-widest text-rose-300">
          <Settings size={13} /> הרשמה וגישה
        </h4>
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div>
            <p className="font-black text-sm text-white/80">פתוח להרשמה</p>
            <p className="text-xs text-white/35 mt-0.5">כשכבוי, משתמשים חדשים לא יוכלו להירשם</p>
          </div>
          <button onClick={() => void save({ registration_open: !draft.registration_open }, "reg")}
            className="flex items-center gap-2 text-xs font-black transition-colors">
            {draft.registration_open
              ? <><ToggleRight size={26} className="text-emerald-400" /><span className="text-emerald-300">פתוח</span></>
              : <><ToggleLeft  size={26} className="text-rose-400"    /><span className="text-rose-300">סגור</span></>}
          </button>
        </div>
        {savedKey === "reg" && <p className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle size={11} /> נשמר</p>}
      </section>
    </div>
  );
}
