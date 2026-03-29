"use client";

import Link from "next/link";
import { ChevronRight, Home, Lock, type LucideIcon } from "lucide-react";

type MemberOnlyNoticeProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function MemberOnlyNotice({
  title,
  description,
  icon: Icon = Lock,
  primaryHref = "/",
  primaryLabel = "כניסה לטירה",
  secondaryHref = "/home",
  secondaryLabel = "להמשיך כאורח",
}: MemberOnlyNoticeProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] px-6" dir="rtl">
      <div className="w-full max-w-lg space-y-5 rounded-[2rem] border border-amber-500/20 bg-black/30 p-8 text-center shadow-[0_0_40px_rgba(245,158,11,0.08)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
          <Icon className="text-amber-400" size={28} />
        </div>
        <div>
          <h1 className="mb-2 font-cinzel text-2xl font-black text-white">{title}</h1>
          <p className="font-crimson leading-relaxed text-white/55">{description}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-cinzel font-black uppercase tracking-widest text-amber-950"
          >
            {primaryLabel}
            <ChevronRight size={15} />
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-cinzel font-black uppercase tracking-widest text-white/70 transition-all hover:border-white/20 hover:text-white"
          >
            {secondaryLabel}
            <Home size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
