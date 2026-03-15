"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  User,
  Coins,
  Trophy,
  Wand2,
  Users,
  ScrollText,
  ShoppingBag,
  ShieldCheck,
  ChevronLeft,
  LogOut // הוספנו חזרה את האייקון
} from "lucide-react";

const HOUSE_THEMES: Record<string, {
  cardBg: string;
  borderColor: string;
  textColor: string;
  accentText: string;
  glowColor: string;
  nameHe: string;
  description: string;
  nebula: string;
}> = {
  Gryffindor: {
    cardBg: "bg-red-950/10 backdrop-blur-3xl",
    borderColor: "border-red-500/30",
    textColor: "text-red-50",
    accentText: "text-red-500",
    glowColor: "drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]",
    nameHe: "גריפינדור",
    description: "אומץ, תעוזה ואבירות. כאן נבחנת גדולה.",
    nebula: "bg-red-900/10"
  },
  Slytherin: {
    cardBg: "bg-emerald-950/10 backdrop-blur-3xl",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-50",
    accentText: "text-emerald-500",
    glowColor: "drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    nameHe: "סלית'רין",
    description: "שאפתנות, פיקחות וטהרת דם. הדרך לפסגה מתחילה פה.",
    nebula: "bg-emerald-900/10"
  },
  Ravenclaw: {
    cardBg: "bg-blue-950/10 backdrop-blur-3xl",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-50",
    accentText: "text-blue-400",
    glowColor: "drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]",
    nameHe: "רייבנקלו",
    description: "חכמה, יצירתיות ולמידה. הראש פתוח לכל תעלומה.",
    nebula: "bg-blue-900/10"
  },
  Hufflepuff: {
    cardBg: "bg-amber-950/10 backdrop-blur-3xl",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-50",
    accentText: "text-amber-500",
    glowColor: "drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]",
    nameHe: "הפלפאף",
    description: "טוב לב, נאמנות ועבודה קשה. הבית של כולם.",
    nebula: "bg-amber-900/10"
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profileData || !profileData.house || profileData.house === 'Unsorted') {
        router.push('/sorting');
        return;
      }

      setProfile({ ...profileData, email: session.user.email });
      setIsLoading(false);
    };
    fetchUserAndProfile();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin"></div>
        <p className="font-cinzel text-amber-500 tracking-widest animate-pulse uppercase">Lumos</p>
      </div>
    );
  }

  const theme = HOUSE_THEMES[profile?.house] || HOUSE_THEMES['Gryffindor'];

  return (
    <div className="relative w-full max-w-7xl mx-auto px-6 py-8 lg:py-12" dir="rtl">

      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full ${theme.nebula} blur-[120px] animate-pulse-slow opacity-60`}></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 items-start">

        {/* SIDEBAR: STATS */}
        <aside className="w-full lg:w-80 order-2 lg:order-1 shrink-0">
          <div className={`rounded-[2.5rem] border ${theme.borderColor} bg-black/40 backdrop-blur-3xl p-8 shadow-2xl space-y-10`}>
            <h3 className="font-cinzel text-[10px] tracking-[0.5em] text-white/30 text-center uppercase border-b border-white/5 pb-4 italic">Wizard Profile</h3>

            <div className="space-y-8">
              <StatItem icon={User} label="דרגה" value={profile?.role} theme={theme} />
              <StatItem icon={Coins} label="גליאונים" value={profile?.galleons} theme={theme} highlight="text-amber-500" />
              <StatItem icon={Trophy} label="נקודות" value={profile?.points_contributed} theme={theme} />

              <div className="pt-8 border-t border-white/5">
                <div className="bg-white/[0.03] rounded-2xl p-6 flex flex-col items-center gap-4 text-center border border-white/5 group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                  <div className={`p-3 rounded-full bg-white/5 ${theme.accentText} shadow-inner`}>
                    <Wand2 size={24} />
                  </div>
                  <div>
                    <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] mb-2 font-cinzel">ליבת השרביט</p>
                    <p className={`text-sm font-crimson font-medium italic ${profile?.wand_type ? "text-amber-200" : "text-white/10"}`}>
                      {profile?.wand_type || "טרם נבחר שרביט"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* כפתור Logout משוחזר ומשופר */}
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
              className="w-full pt-8 flex items-center justify-center gap-3 text-[10px] text-red-400/50 hover:text-red-400 font-cinzel tracking-widest uppercase transition-all border-t border-white/5 group/out"
            >
              <LogOut size={14} className="group-hover/out:-translate-x-1 transition-transform" />
              <span>יציאה בטוחה</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 order-1 lg:order-2 space-y-10 w-full">
          <section className={`relative overflow-hidden rounded-[3rem] border ${theme.borderColor} ${theme.cardBg} p-10 md:p-16 shadow-2xl ${theme.glowColor}`}>
            <div className="relative z-10 flex flex-col gap-8">
              <div className="flex items-center gap-3 opacity-40">
                <span className="h-[1px] w-10 bg-amber-500"></span>
                <span className="font-cinzel text-[10px] tracking-[0.4em] text-amber-500 uppercase">Room of Requirement</span>
              </div>

              <div className="space-y-4">
                <h2 className="font-cinzel text-xl text-white/40 tracking-widest leading-none">ברוכים הבאים לבית</h2>
                <h1 className={`font-cinzel text-5xl md:text-[7rem] font-black tracking-tighter leading-none ${theme.accentText}`}>
                  {theme.nameHe}
                </h1>
              </div>

              <div className={`mt-2 border-r-4 ${theme.borderColor} pr-6 max-w-xl`}>
                <p className={`font-crimson text-xl md:text-2xl leading-relaxed text-white/70 italic`}>
                  "{theme.description}"
                </p>
              </div>
            </div>

            <div className={`absolute -bottom-20 -left-20 opacity-[0.03] ${theme.accentText} pointer-events-none`}>
              <ShieldCheck size={400} />
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ActionCard href="/great-hall" icon={Users} title="האולם הגדול" desc="קהילה ושיחות" theme={theme} />
            <ActionCard href="/ollivanders" icon={ShoppingBag} title="סמטת דיאגון" desc="ציוד ושרביטים" theme={theme} />
            <ActionCard href="/quests" icon={ScrollText} title="לוח משימות" desc="צבירת נקודות" theme={theme} />
          </div>
        </div>
      </div>
    </div>
  );
}

// רכיבי עזר
function StatItem({ icon: Icon, label, value, theme, highlight }: any) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl bg-white/5 ${theme.accentText} group-hover:scale-110 transition-transform`}>
          <Icon size={16} />
        </div>
        <span className="text-xs font-crimson text-white/40 tracking-widest uppercase">{label}</span>
      </div>
      <span className={`font-cinzel font-bold text-lg ${highlight || theme.textColor}`}>
        {value || 0}
      </span>
    </div>
  );
}

function ActionCard({ href, icon: Icon, title, desc, theme }: any) {
  return (
    <Link href={href} className={`group p-10 rounded-[2.5rem] border ${theme.borderColor} bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500 flex flex-col items-center text-center gap-6 shadow-xl relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
      <div className={`p-5 rounded-2xl bg-white/5 ${theme.accentText} group-hover:bg-white/10 transition-all`}>
        <Icon size={32} />
      </div>
      <div>
        <h3 className="font-cinzel text-lg font-bold tracking-widest mb-1">{title}</h3>
        <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-cinzel">{desc}</p>
      </div>
      <ChevronLeft size={16} className="text-white/10 group-hover:text-amber-500 group-hover:-translate-x-2 transition-all mt-1" />
    </Link>
  );
}