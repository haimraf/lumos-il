"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  Wand2,
  Sparkles,
  ChevronRight,
  Coins,
  Library,
  History,
  Info,
  ShieldCheck,
  Flame
} from "lucide-react";

/**
 * LUMOS IL - OLLIVANDERS V2.5
 * שדרוג: שיפור ניגודיות ונראות של טקסטים, קופסאות, ועיצוב כללי.
 */

const WAND_WOODS = ['אלון', 'מהגוני', 'אגוז', 'דובדבן', 'מילה', 'ערבה', 'הוּלִי', 'גפן', 'ארז'];
const WAND_CORES = ['נוצת עוף חול', 'נימת לב של דרקון', 'שערת חד-קרן', 'נוצת היפוגריף'];

function generateWand(): string {
  const wood = WAND_WOODS[Math.floor(Math.random() * WAND_WOODS.length)];
  const core = WAND_CORES[Math.floor(Math.random() * WAND_CORES.length)];
  const length = (Math.random() * (14.5 - 9) + 9).toFixed(1);
  return `עץ ${wood}, ${core}, ${length} אינץ'`;
}

type ProfileData = {
  wand_type: string | null;
  galleons: number;
};

export default function OllivandersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [revealedWand, setRevealedWand] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('wand_type, galleons')
        .eq('id', session.user.id)
        .single();

      setUserId(session.user.id);
      setProfile(profileData ? { wand_type: profileData.wand_type, galleons: profileData.galleons || 0 } : { wand_type: null, galleons: 0 });
      setIsLoading(false);
    };
    fetchProfile();
  }, [supabase, router]);

  const handlePurchase = async () => {
    if (!userId || !profile) return;
    if (profile.galleons < 15) {
      setErrorMsg(`אין לך מספיק גליאונים. נדרשים 15, אך יש לך רק ${profile.galleons}.`);
      return;
    }

    setIsPurchasing(true);
    setErrorMsg(null);
    const wand = generateWand();

    const { error } = await supabase
      .from('profiles')
      .update({ wand_type: wand, galleons: profile.galleons - 15 })
      .eq('id', userId);

    if (error) {
      setErrorMsg('הקסם נכשל... נסה שוב מאוחר יותר.');
      setIsPurchasing(false);
      return;
    }

    setTimeout(() => {
      setRevealedWand(wand);
      setProfile({ wand_type: wand, galleons: profile.galleons - 15 });
      setIsPurchasing(false);
    }, 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin"></div>
        <p className="font-cinzel text-amber-500 tracking-widest animate-pulse">לומוס...</p>
      </div>
    );
  }

  const hasWand = profile?.wand_type || revealedWand;
  const wandName = revealedWand || profile?.wand_type;

  return (
    <div className="relative w-full max-w-5xl mx-auto px-6 py-10 flex flex-col items-center min-h-screen" dir="rtl">

      {/* ATMOSPHERIC BACKGROUND */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] bg-amber-900/10 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
      </div>

      {/* TOP NAVIGATION */}
      <div className="w-full flex justify-between items-center mb-16">
        <Link href="/dashboard" className="group flex items-center gap-2 text-white/60 hover:text-amber-500 transition-all font-cinzel text-sm tracking-widest font-bold">
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          חזרה לטירה
        </Link>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.15)]">
          <Coins size={18} className="text-amber-500" />
          <span className="text-amber-200 font-bold text-sm tracking-wider">{profile?.galleons} גליאונים</span>
        </div>
      </div>

      {/* MAIN EXPERIENCE AREA */}
      <div className="w-full max-w-3xl flex flex-col items-center text-center space-y-12">

        <div className="space-y-4">
          <h1 className="font-cinzel text-5xl md:text-7xl font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]">
            אוליבנדר <span className="text-amber-500 opacity-90">IL</span>
          </h1>
          <p className="font-crimson text-amber-500/80 text-xl md:text-2xl italic tracking-widest">
            יצרני שרביטים משובחים משנת 382 לפנה"ס
          </p>
        </div>

        {/* THE SHOP COUNTER (Main Card) */}
        <div className="w-full glass-panel rounded-[3.5rem] p-10 md:p-20 border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.6)] relative overflow-hidden bg-zinc-950/60 backdrop-blur-2xl">

          {/* Decorative corner element */}
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <History size={140} className="text-amber-500" />
          </div>

          {hasWand ? (
            /* REVEAL STATE */
            <div className="relative z-10 flex flex-col items-center space-y-10 animate-in fade-in zoom-in duration-1000">
              <div className="relative group">
                <div className="absolute inset-0 bg-amber-500/30 blur-[60px] rounded-full animate-pulse"></div>
                <div className="relative p-10 rounded-full border border-amber-500/30 bg-black/40 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
                  <Wand2 size={72} className="text-amber-400 rotate-45 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
                </div>
              </div>

              <div className="space-y-4">
                <p className="font-cinzel text-sm tracking-[0.5em] text-amber-500/80 uppercase font-bold">The Wand has Chosen</p>
                <h2 className="font-crimson text-4xl md:text-6xl font-black text-white leading-tight break-words max-w-lg drop-shadow-md">
                  {wandName}
                </h2>
              </div>

              <p className="font-crimson text-2xl text-white/70 italic max-w-md leading-relaxed border-t border-white/10 pt-8">
                "זכור, השרביט בוחר בקוסם... לא תמיד ברור למה, אך ברור לאן תגיע איתו."
              </p>

              <Link href="/dashboard" className="inline-flex items-center gap-3 font-cinzel text-lg bg-white text-black px-12 py-5 rounded-full hover:bg-amber-500 transition-all font-bold shadow-[0_10px_30px_rgba(255,255,255,0.2)] active:scale-95 mt-4">
                חזרה לחדר המועדון
              </Link>
            </div>
          ) : (
            /* SHOP STATE */
            <div className="relative z-10 flex flex-col items-center space-y-10">
              <div className="w-24 h-24 rounded-full bg-amber-500/5 flex items-center justify-center border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <Library size={40} className="text-amber-500/60" />
              </div>

              <div className="space-y-4">
                <h2 className="font-cinzel text-3xl md:text-4xl font-bold text-white tracking-wide">הגיע הזמן להתחבר לקסם</h2>
                <p className="font-crimson text-xl text-white/60 max-w-sm mx-auto leading-relaxed">
                  לכל קוסם יש שרביט שמחכה רק לו על המדפים המאובקים של אוליבנדר.
                </p>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-2xl text-base font-bold flex items-center gap-3 w-full justify-center">
                  <Info size={20} /> {errorMsg}
                </div>
              )}

              {isPurchasing ? (
                <div className="flex flex-col items-center gap-6 py-6">
                  <div className="w-14 h-14 border-t-4 border-amber-500 rounded-full animate-spin shadow-[0_0_20px_rgba(245,158,11,0.4)]"></div>
                  <p className="font-cinzel text-amber-500 tracking-[0.2em] animate-pulse text-lg font-bold">השרביט מחפש את בעליו...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 w-full">
                  <button
                    onClick={handlePurchase}
                    className="group relative w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-amber-950 px-14 py-6 rounded-2xl font-cinzel font-black text-2xl tracking-widest transition-all shadow-[0_15px_40px_rgba(217,119,6,0.3)] active:scale-95 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-4">
                      תן לשרביט לבחור אותך
                      <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                  </button>

                  {/* FIXED VISIBILITY: Badge for cost */}
                  <div className="inline-flex items-center gap-2 bg-amber-900/40 border border-amber-500/30 px-5 py-2 rounded-full">
                    <Coins size={14} className="text-amber-400" />
                    <span className="text-xs text-amber-100 uppercase tracking-[0.3em] font-cinzel font-bold">עלות רכישה: 15 גליאונים</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* EXTRA DECORATION - FIXED VISIBILITY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl opacity-90 pt-8">
          <div className="bg-black/40 border border-white/10 p-8 rounded-3xl text-right flex flex-col gap-3 hover:bg-white/[0.02] hover:border-amber-500/20 transition-colors">
            <div className="flex items-center gap-3">
              <Flame size={20} className="text-amber-500" />
              <h4 className="font-cinzel text-sm text-amber-400 uppercase font-black tracking-wider">מסורת ליבות</h4>
            </div>
            <p className="font-crimson text-lg text-white/80 leading-relaxed">אנו משתמשים אך ורק בליבות החזקות והנדירות ביותר: נוצת עוף חול, שערת חד-קרן ונימת לב של דרקון.</p>
          </div>

          <div className="bg-black/40 border border-white/10 p-8 rounded-3xl text-right flex flex-col gap-3 hover:bg-white/[0.02] hover:border-amber-500/20 transition-colors">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-amber-500" />
              <h4 className="font-cinzel text-sm text-amber-400 uppercase font-black tracking-wider">איכות חסרת פשרות</h4>
            </div>
            <p className="font-crimson text-lg text-white/80 leading-relaxed">כל שרביט שיוצא מהחנות שלנו הוא יחיד במינו, המותאם בדיוק מופתי למבנה האישיות והפוטנציאל של הקוסם האוחז בו.</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.8s infinite linear;
        }
      `}</style>
    </div>
  );
}