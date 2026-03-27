"use client";

import { HelpCircle, Info, Sparkles } from "lucide-react";

type GuideTone = "amber" | "cyan" | "emerald" | "rose" | "violet";

export type AdminTabGuideContent = {
  title: string;
  description: string;
  bullets: string[];
  footer?: string;
  tone?: GuideTone;
};

type AdminTabGuideProps = {
  content: AdminTabGuideContent;
};

const TONE_STYLES: Record<GuideTone, { border: string; background: string; icon: string; accent: string }> = {
  amber: {
    border: "rgba(251,191,36,0.18)",
    background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(255,255,255,0.03))",
    icon: "#fcd34d",
    accent: "text-amber-100",
  },
  cyan: {
    border: "rgba(34,211,238,0.18)",
    background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(255,255,255,0.03))",
    icon: "#67e8f9",
    accent: "text-cyan-100",
  },
  emerald: {
    border: "rgba(52,211,153,0.18)",
    background: "linear-gradient(135deg, rgba(52,211,153,0.12), rgba(255,255,255,0.03))",
    icon: "#6ee7b7",
    accent: "text-emerald-100",
  },
  rose: {
    border: "rgba(251,113,133,0.18)",
    background: "linear-gradient(135deg, rgba(251,113,133,0.12), rgba(255,255,255,0.03))",
    icon: "#fda4af",
    accent: "text-rose-100",
  },
  violet: {
    border: "rgba(167,139,250,0.18)",
    background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(255,255,255,0.03))",
    icon: "#c4b5fd",
    accent: "text-violet-100",
  },
};

export default function AdminTabGuide({ content }: AdminTabGuideProps) {
  const tone = TONE_STYLES[content.tone || "cyan"];

  return (
    <section
      className="rounded-2xl border p-5 space-y-4"
      style={{
        borderColor: tone.border,
        background: tone.background,
      }}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-[10px] font-cinzel font-black uppercase tracking-[0.2em] text-white/45">
            <HelpCircle size={12} style={{ color: tone.icon }} />
            איך לקרוא את הטאב הזה
          </div>
          <div className={`font-cinzel text-lg font-black ${tone.accent}`}>{content.title}</div>
          <p className="max-w-3xl text-sm leading-relaxed text-white/55">{content.description}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/45">
          הטאב הזה מיועד לתת לך שליטה בלי לנחש מה משפיע על האתר ומתי.
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {content.bullets.map((item) => (
          <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/55 leading-relaxed">
            <div className="flex items-start gap-2">
              <Info size={14} style={{ color: tone.icon, marginTop: 2 }} />
              <span>{item}</span>
            </div>
          </div>
        ))}
      </div>

      {content.footer ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/50">
          <Sparkles size={12} style={{ color: tone.icon }} />
          {content.footer}
        </div>
      ) : null}
    </section>
  );
}
