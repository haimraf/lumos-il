"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  ChevronRight, Coins, Trophy, Sparkles, BookOpen, CheckCircle2,
  XCircle, Hourglass, Flame, Search, Gift
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";

// --- מאגר שאלות טריוויה ---
const TRIVIA_POOL = [
  { q: "איזה לחש פותח דלתות נעולות?", a: "אלוהומורה", options: ["לומוס", "אלוהומורה", "אצ'יו", "רדוקטו"] },
  { q: "מהו הלחש שיוצר מגן מפני סוהרסנים?", a: "אקספקטו פטרונום", options: ["אבדה קדברה", "סטופפיי", "אקספקטו פטרונום", "פרוטגו"] },
  { q: "איך קוראים ללחש המפורק מנשק?", a: "אקספליארמוס", options: ["שתק", "אקספליארמוס", "אינסינדיו", "קונפונדו"] },
  { q: "איזה לחש מתקן חפצים שבורים?", a: "רפארו", options: ["רפארו", "דיפנדו", "טרנספורמציה", "אלוהומורה"] },
  { q: "מהו הלחש שיוצר אור בקצה השרביט?", a: "לומוס", options: ["נוקס", "לומוס", "וינגארדיום לביוסה", "פלגראטה"] }
];

const HOUSE_COLORS: Record<string, string> = {
  Gryffindor: 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]',
  Slytherin: 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]',
  Ravenclaw: 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]',
  Hufflepuff: 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]',
};

export default function QuestsPage() {
  const supabase = createClient();
  const { sendOwl } = useOwlMail();

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [dailyStatus, setDailyStatus] = useState({ allowance: false, trivia: false, niffler: false });
  const [triviaResult, setTriviaResult] = useState<'correct' | 'wrong' | null>(null);
  const [currentTrivia, setCurrentTrivia] = useState<any>(null);
  const [nifflerLoading, setNifflerLoading] = useState(false);

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

  // בחירת שאלה יומית לפי התאריך
  const getDailyTrivia = useCallback(() => {
    const day = new Date().getDate();
    return TRIVIA_POOL[day % TRIVIA_POOL.length];
  }, []);

  const fetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/'; return; }

    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) {
      setProfile(data);
      setDailyStatus({
        allowance: data.last_reward_date === today,
        trivia: data.last_trivia_date === today,
        niffler: data.last_niffler_date === today
      });
    }
    setIsLoading(false);
  }, [supabase, today]);

  useEffect(() => {
    fetchProfile();
    setCurrentTrivia(getDailyTrivia());
  }, [fetchProfile, getDailyTrivia]);

  // --- משימה 1: קצבה ---
  const handleDailyCollect = async () => {
    if (dailyStatus.allowance) return;
    const { error } = await supabase.from('profiles').update({
      galleons: (profile.galleons || 0) + 5,
      last_reward_date: today
    }).eq('id', profile.id);

    if (!error) {
      sendOwl("קצבה נאספה!", "5 גליאונים נוספו לכיסך.", "magic");
      fetchProfile();
    }
  };

  // --- משימה 2: טריוויה ---
  const handleTriviaAnswer = async (selected: string) => {
    if (dailyStatus.trivia) return;
    const isCorrect = selected === currentTrivia.a;

    const updateData: any = { last_trivia_date: today };
    if (isCorrect) updateData.points_contributed = (profile.points_contributed || 0) + 10;

    const { error } = await supabase.from('profiles').update(updateData).eq('id', profile.id);
    if (!error) {
      setTriviaResult(isCorrect ? 'correct' : 'wrong');
      sendOwl(isCorrect ? "תשובה נכונה!" : "טעות בלחש", isCorrect ? "10 נקודות לבית שלך!" : `התשובה הנכונה: ${currentTrivia.a}`, isCorrect ? "success" : "error");
      fetchProfile();
    }
  };

  // --- משימה 3: ציד הניפלר (חדש!) ---
  const handleNifflerHunt = async () => {
    if (dailyStatus.niffler || nifflerLoading) return;
    setNifflerLoading(true);

    const winType = Math.random() > 0.5 ? 'galleons' : 'points';
    const amount = winType === 'galleons' ? 15 : 20;

    const updateData: any = { last_niffler_date: today };
    if (winType === 'galleons') updateData.galleons = (profile.galleons || 0) + amount;
    else updateData.points_contributed = (profile.points_contributed || 0) + amount;

    const { error } = await supabase.from('profiles').update(updateData).eq('id', profile.id);
    if (!error) {
      sendOwl("הניפלר נתפס!", `מצאת ${amount} ${winType === 'galleons' ? 'גליאונים' : 'נקודות'}!`, "magic");
      fetchProfile();
    }
    setNifflerLoading(false);
  };

  if (isLoading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin"></div></div>;

  const hColor = profile?.house ? HOUSE_COLORS[profile.house] : 'text-amber-400';

  return (
    <main className="min-h-screen bg-[#020617] text-[#f8fafc] relative overflow-hidden pb-20" dir="rtl">
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/5 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-amber-900/5 blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-12">
          <Link href="/dashboard" className="group flex items-center gap-2 text-white/40 hover:text-white transition-all font-cinzel text-sm font-bold">
            <ChevronRight size={20} className="group-hover:translate-x-1" /> חזרה לטירה
          </Link>

          <div className="flex items-center gap-6 bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-2xl">
            <div className="flex items-center gap-2"><Coins size={18} className="text-amber-500" /><span className="text-amber-400 font-bold font-cinzel">{profile?.galleons}</span></div>
            <div className="flex items-center gap-2"><Trophy size={18} className={hColor.split(' ')[0]} /><span className={`font-bold font-cinzel ${hColor}`}>{profile?.points_contributed}</span></div>
          </div>
        </div>

        <div className="text-center mb-20">
          <h1 className="font-cinzel text-6xl md:text-8xl font-black text-white mb-4 drop-shadow-2xl">לוח <span className="text-amber-500 italic">המשימות</span></h1>
          <p className="font-crimson text-2xl text-white/40 italic uppercase tracking-widest">עבודה קשה היא הדרך היחידה לתהילה</p>
        </div>

        {/* QUESTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* 1. DAILY ALLOWANCE */}
          <QuestCard
            title="קצבה יומית"
            desc="משרד הקסמים מאשר דמי כיס לתלמידים מצטיינים."
            reward="5 גליאונים"
            icon={<Coins className="text-amber-500" size={32} />}
            completed={dailyStatus.allowance}
            onAction={handleDailyCollect}
            btnText="אסוף קצבה"
            color="amber"
          />

          {/* 2. TRIVIA */}
          <div className={`relative group bg-zinc-900/40 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/5 transition-all duration-500 flex flex-col ${dailyStatus.trivia ? 'opacity-60' : 'hover:border-blue-500/30'}`}>
            <div className="flex justify-between items-start mb-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20"><BookOpen className="text-blue-400" size={32} /></div>
              <span className="text-xs font-black font-cinzel text-blue-400 uppercase tracking-tighter bg-blue-500/10 px-3 py-1 rounded-full underline decoration-blue-500/50 underline-offset-4">10 נקודות בית</span>
            </div>

            <h3 className="font-cinzel text-2xl font-bold mb-4">מבחן לחשים</h3>
            <p className="font-crimson text-xl text-white/70 mb-8 h-20">{currentTrivia?.q}</p>

            <div className="grid grid-cols-2 gap-3">
              {currentTrivia?.options.map((opt: string) => (
                <button
                  key={opt}
                  disabled={dailyStatus.trivia}
                  onClick={() => handleTriviaAnswer(opt)}
                  className={`py-3 rounded-xl border text-sm font-bold transition-all ${dailyStatus.trivia ? 'border-white/5 bg-white/5 cursor-not-allowed' : 'border-white/10 hover:border-blue-500 hover:bg-blue-500/10'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {dailyStatus.trivia && <p className="mt-4 text-center font-cinzel text-xs text-white/30 italic">המבחן הבא יפתח מחר</p>}
          </div>

          {/* 3. NIFFLER HUNT (NEW) */}
          <QuestCard
            title="ציד הניפלר"
            desc="ניפלר חצוף גנב אוצרות בטירה! עזור למצוא את המסתור שלו."
            reward="מזל (נקודות/גליאונים)"
            icon={<Search className="text-emerald-500" size={32} />}
            completed={dailyStatus.niffler}
            onAction={handleNifflerHunt}
            btnText={nifflerLoading ? "מחפש..." : "צא לציד"}
            color="emerald"
          />

        </div>
      </div>
    </main>
  );
}

// --- HELPER COMPONENT ---
function QuestCard({ title, desc, reward, icon, completed, onAction, btnText, color }: any) {
  const colorClasses: any = {
    amber: "border-amber-500/30 text-amber-500 bg-amber-500",
    emerald: "border-emerald-500/30 text-emerald-500 bg-emerald-500",
  };

  return (
    <div className={`relative group bg-zinc-900/40 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/5 transition-all duration-500 flex flex-col ${completed ? 'opacity-60' : `hover:border-${color}-500/30`}`}>
      <div className="flex justify-between items-start mb-8 text-right">
        <div className={`w-16 h-16 rounded-2xl bg-${color}-500/10 flex items-center justify-center border border-${color}-500/20`}>{icon}</div>
        <span className={`text-xs font-black font-cinzel text-${color}-400 uppercase tracking-tighter bg-${color}-500/10 px-3 py-1 rounded-full underline decoration-${color}-500/50 underline-offset-4`}>תגמול: {reward}</span>
      </div>

      <div className="flex-1">
        <h3 className="font-cinzel text-2xl font-bold text-white mb-4">{title}</h3>
        <p className="font-crimson text-xl text-white/50 leading-relaxed mb-10">{desc}</p>
      </div>

      {completed ? (
        <div className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/30 font-cinzel font-bold text-center flex items-center justify-center gap-2">
          <CheckCircle2 size={18} /> הושלם
        </div>
      ) : (
        <button
          onClick={onAction}
          className={`w-full py-5 rounded-2xl bg-gradient-to-r from-${color}-600 to-${color}-800 text-white font-cinzel font-black text-xl tracking-widest shadow-xl transition-all active:scale-95`}
        >
          {btnText}
        </button>
      )}
    </div>
  );
}