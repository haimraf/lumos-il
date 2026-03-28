"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { SITE_CONFIG_KEY, BANNER_PALETTE, type BannerItem, type SiteConfig } from "@/components/admin/AdminSiteSettingsTab";

const LS_KEY_PREFIX = "lumos_banner_dismissed_";

function hashText(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function isDismissed(text: string) {
  try { return !!localStorage.getItem(LS_KEY_PREFIX + hashText(text.slice(0, 40))); }
  catch { return false; }
}

function parseActiveBanners(value: unknown): BannerItem[] {
  if (!value || typeof value !== "object") return [];
  const cfg = value as Partial<SiteConfig>;

  if (Array.isArray(cfg.banners)) {
    return cfg.banners.filter(b => b.active && b.text?.trim() && !isDismissed(b.text));
  }

  // Legacy single-banner format
  const legacy = cfg as Record<string, unknown>;
  if (legacy.banner_active && legacy.banner_text) {
    const text = String(legacy.banner_text).trim();
    if (!text || isDismissed(text)) return [];
    return [{
      id: "legacy", active: true, text,
      color: legacy.banner_color as BannerItem["color"] ?? "amber",
      icon: String(legacy.banner_icon ?? "📣"),
      link: String(legacy.banner_link ?? ""),
      label: "",
    }];
  }
  return [];
}

export default function AnnouncementBanner() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const supabaseRef = useRef(createClient());

  const applyBanners = (value: unknown) => setBanners(parseActiveBanners(value));

  useEffect(() => {
    setMounted(true);
    const supabase = supabaseRef.current;
    supabase.from("site_settings").select("value")
      .eq("key", SITE_CONFIG_KEY).maybeSingle()
      .then(({ data }) => applyBanners(data?.value));

    const channel = supabase.channel("announcement_banners")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: `key=eq.${SITE_CONFIG_KEY}` },
        (payload) => applyBanners((payload.new as { value?: unknown })?.value))
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted || banners.length === 0) return null;

  const dismiss = (banner: BannerItem) => {
    try { localStorage.setItem(LS_KEY_PREFIX + hashText(banner.text.slice(0, 40)), "1"); } catch { /* ignore */ }
    setBanners(prev => prev.filter(b => b.id !== banner.id));
  };

  return (
    <>
      {banners.map((banner) => {
        const p = BANNER_PALETTE[banner.color] ?? BANNER_PALETTE.amber;

        const inner = (
          <div className={`relative w-full border-b overflow-hidden backdrop-blur-md ${p.wrapper}`}>
            {/* shimmer line */}
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${p.shimmer}`} />

            <div className="relative mx-auto max-w-5xl flex items-center gap-3 px-4 py-2.5" dir="rtl">
              {/* icon badge */}
              {banner.icon && (
                <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-lg ring-1 ${p.badge}`}>
                  {banner.icon}
                </span>
              )}

              {/* label badge */}
              {banner.label && (
                <span className={`shrink-0 hidden sm:inline text-[9px] font-cinzel font-black uppercase tracking-widest border rounded px-1.5 py-0.5 ${p.label}`}>
                  {banner.label}
                </span>
              )}

              {/* text */}
              <p className={`flex-1 min-w-0 break-words text-[13px] font-bold leading-snug whitespace-pre-line ${p.text}`}>
                {banner.text}
              </p>

              {/* CTA */}
              {banner.link && (
                <span className={`hidden md:inline-flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-wider transition-colors ${p.cta}`}>
                  לפרטים ←
                </span>
              )}

              {/* dismiss */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss(banner); }}
                aria-label="סגור הודעה"
                className={`shrink-0 opacity-30 hover:opacity-80 transition-opacity p-1.5 rounded-md hover:bg-white/10 ${p.text}`}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        );

        if (banner.link) {
          return (
            <Link key={banner.id} href={banner.link} className="block w-full">
              {inner}
            </Link>
          );
        }
        return <div key={banner.id}>{inner}</div>;
      })}
    </>
  );
}
