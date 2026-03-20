"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  ChevronRight, Coins, Trophy, Sparkles, BookOpen, CheckCircle2,
  XCircle, Hourglass, Flame, Search, Gift, Zap
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { useAuth } from "@/context/AuthContext";

// --- מאגר שאלות טריוויה מורחב ---
const TRIVIA_POOL = [
  { q: "איזה לחש פותח דלתות נעולות?", a: "אלוהומורה", options: ["לומוס", "אלוהומורה", "אצ'יו", "רדוקטו"] },
  { q: "מהו הלחש שיוצר מגן מפני סוהרסנים?", a: "אקספקטו פטרונום", options: ["אבדה קדברה", "סטופפיי", "אקספקטו פטרונום", "פרוטגו"] },
  { q: "איך קוראים ללחש המפורק מנשק?", a: "אקספליארמוס", options: ["שתק", "אקספליארמוס", "אינסינדיו", "קונפונדו"] },
  { q: "איזה לחש מתקן חפצים שבורים?", a: "רפארו", options: ["רפארו", "דיפנדו", "טרנספורמציה", "אלוהומורה"] },
  { q: "מהו הלחש שיוצר אור בקצה השרביט?", a: "לומוס", options: ["נוקס", "לומוס", "וינגארדיום לביוסה", "פלגראטה"] },
  { q: "מה שמה של הינשופה של הארי פוטר?", a: "הדוויג", options: ["ארול", "פיגווידג'ן", "הדוויג", "קרוקשנקס"] },
  { q: "איזה שיקוי מאפשר לשנות צורה לאדם אחר?", a: "פולימיצי", options: ["פליקס פליציס", "פולימיצי", "ורטסרום", "אמורטנציה"] },
  { q: "מי היה האסיר מאזקבאן?", a: "סיריוס בלק", options: ["רמוס לופין", "פיטר פטיגרו", "סיריוס בלק", "בלטריקס לסטריינג'"] },
  { q: "מהו שמו האמיתי של לורד וולדמורט?", a: "טום רידל", options: ["סוורוס סנייפ", "טום רידל", "גרינדלוולד", "סלזאר סלית'רין"] },
  { q: "כמה הורקרוקסים יצר וולדמורט (כולל הארי)?", a: "7", options: ["5", "6", "7", "8"] }
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
  const { profile, refreshProfile, isLoading: authLoading } = useAuth();

  const [dailyStatus, setDailyStatus] = useState({ allowance: false, trivia: false, niffler: false, snitch: false });
  const [currentTrivia, setCurrentTrivia] = useState<any>(null);
  const [nifflerLoading, setNifflerLoading] = useState(false);
  const [snitchLoading, setSnitchLoading] = useState(false);

  const today = new Date().toLocaleDateString("en-CA");

  useEffect(() => {
    if (profile) {
      setDailyStatus({
        allowance: profile.last_reward_date === today,
        trivia: profile.last_trivia_date === today,
        niffler: profile.last_niffler_date === today,
        snitch: profile.last_snitch_date === today
      });
    }
  }, [profile, today]);

  useEffect(() => {
    // בחירה בטוחה של שאלה מתוך המאגר (לפי היום בחודש כדי שכולם יקבלו אותה שאלה באותו יום)
    const day = new Date().getDate();
    setCurrentTrivia(TRIVIA_POOL[day % TRIVIA_POOL.length]);
  }, []);

  const handleDailyCollect = async () => {
    if (dailyStatus.allowance || !profile) return;
    const { error } = await supabase.from('profiles').update({
      galleons: (profile.galleons || 0) + 5,
      last_reward_date: today
    }).eq('id', profile.id);

    if (!error) {
      sendOwl("קצבה נאספה!", "5 גליאונים נוספו לכיסך.", "magic");
      refreshProfile();
    }
  };

  const handleTriviaAnswer = async (selected: string) => {
    if (dailyStatus.trivia || !profile || !currentTrivia) return;
    const isCorrect = selected === currentTrivia.a;

    const updateData: any = { last_trivia_date: today };
    if (isCorrect) updateData.points_contributed = (profile.points_contributed || 0) + 10;

    const { error } = await supabase.from('profiles').update(updateData).eq('id', profile.id);
    if (!error) {
      sendOwl(isCorrect ? "תשובה נכונה!" : "טעות בלחש", isCorrect ? "10 נקודות לבית שלך!" : `התשובה הנכונה: ${currentTrivia.a}`, isCorrect ? "success" : "error");
      refreshProfile();
    }
  };

  const handleNifflerHunt = async () => {
    if (dailyStatus.niffler || nifflerLoading || !profile) return;
    setNifflerLoading(true);

    const winType = Math.random() > 0.5 ? 'galleons' : 'points';
    const amount = winType === 'galleons' ? 15 : 20;

    const updateData: any = { last_niffler_date: today };
    if (winType === 'galleons') updateData.galleons = (profile.galleons || 0) + amount;
    else updateData.points_contributed = (profile.points_contributed || 0) + amount;

    const { error } = await supabase.from('profiles').update(updateData).eq('id', profile.id);
    if (!error) {
      sendOwl("הניפלר נתפס!", `מצאת ${amount} ${winType === 'galleons' ? 'גליאונים' : 'נקודות'}!`, "magic");
      refreshProfile();
    }
    setNifflerLoading(false);
  };

  // משימה חדשה: תפיסת הסניץ'
  const handleSnitchCatch = async () => {
    if (dailyStatus.snitch || snitchLoading || !profile) return;
    setSnitchLoading(true);

    const { error } = await supabase.from('profiles').update({
      points_contributed: (profile.points_contributed || 0) + 15,
      last_snitch_date: today
    }).eq('id', profile.id);

    if (!error) {
      sendOwl("הסניץ' ננתפס!", "איזה מחפש מעולה! הבאת 15 נקודות לבית שלך.", "success");
      refreshProfile();
    }
    setSnitchLoading(false);
  };

  if (authLoading) return <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4 bg-[#020617]"><div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin"></div><p className="font-cinzel text-amber-500 tracking-widest animate-pulse">רוקח שיקוי...</p></div>;

  const hColor = (profile?.house && HOUSE_COLORS[profile.house]) ? HOUSE_COLORS[profile.house] : 'text-amber-400';
  const trophyClass = hColor.split(' ')[0] || 'text-amber-400';

  return (
    <main className="min-h-screen bg-[#020617] text-[#f8fafc] relative overflow-hidden pb-20" dir="rtl">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/5 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-amber-900/5 blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10">
        <div className="flex justify-between items-center mb-12">
          <Link href="/dashboard" className="group flex items-center gap-2 text-white/40 hover:text-white transition-all font-cinzel text-sm font-bold">
            <ChevronRight size={20} className="group-hover:translate-x-1" /> חזרה לטירה
          </Link>

          <div className="flex items-center gap-6 bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-2xl">
            <div className="flex items-center gap-2"><Coins size={18} className="text-amber-500" /><span className="text-amber-400 font-bold font-cinzel">{profile?.galleons || 0}</span></div>
            <div className="flex items-center gap-2"><Trophy size={18} className={trophyClass} /><span className={`font-bold font-cinzel ${hColor}`}>{profile?.points_contributed || 0}</span></div>
          </div>
        </div>

        <div className="text-center mb-20">
          <h1 className="font-cinzel text-6xl md:text-8xl font-black text-white mb-4 drop-shadow-2xl">לוח <span className="text-amber-500 italic">המשימות</span></h1>
          <p className="font-crimson text-2xl text-white/40 italic uppercase tracking-widest">עבודה קשה היא הדרך היחידה לתהילה</p>
        </div>

        {/* שונה ל-4 עמודות במסכים גדולים בגלל שיש 4 משימות */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          <QuestCard
            title="קצבה יומית"
            desc="משרד הקסמים מאשר דמי כיס."
            reward="5 גליאונים"
            icon={<Coins className="text-amber-500" size={32} />}
            completed={dailyStatus.allowance}
            onAction={handleDailyCollect}
            btnText="אסוף קצבה"
            color="amber"
          />

          <div className={`relative group glass-panel rounded-[2.5rem] p-8 transition-all duration-500 flex flex-col ${dailyStatus.trivia ? 'opacity-60 border-white/5' : 'hover:border-blue-500/30 hover:shadow-[0_15px_50px_rgba(59,130,246,0.2)] hover:-translate-y-2 border-t border-r border-white/10'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20"><BookOpen className="text-blue-400" size={28} /></div>
              <span className="text-[10px] font-black font-cinzel text-blue-400 uppercase tracking-tighter bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">10 נקודות</span>
            </div>

            <h3 className="font-cinzel text-xl font-bold mb-3">מבחן לחשים</h3>
            <p className="font-crimson text-lg text-white/70 mb-6 h-16 line-clamp-2">{currentTrivia?.q || "טוען שאלה..."}</p>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              {currentTrivia?.options?.map((opt: string) => (
                <button
                  key={opt}
                  disabled={dailyStatus.trivia}
                  onClick={() => handleTriviaAnswer(opt)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${dailyStatus.trivia ? 'border-white/5 bg-white/5 cursor-not-allowed text-white/30' : 'border-white/10 hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-200'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {dailyStatus.trivia && <p className="mt-3 text-center font-cinzel text-[10px] text-white/30 italic">המבחן הבא יפתח מחר</p>}
          </div>

          <QuestCard
            title="ציד הניפלר"
            desc="ניפלר חצוף גנב אוצרות! עזור למצוא אותו."
            reward="מזל (נק'/גליאונים)"
            icon={<Search className="text-emerald-500" size={32} />}
            completed={dailyStatus.niffler}
            onAction={handleNifflerHunt}
            btnText={nifflerLoading ? "מחפש..." : "צא לציד"}
            color="emerald"
          />

          {/* המשימה החדשה: קווידיץ' */}
          <QuestCard
            title="אימון קווידיץ'"
            desc="הסניץ' מתעופף במגרש! נסה לתפוס אותו."
            reward="15 נקודות"
            icon={<Zap className="text-violet-400" size={32} />}
            completed={dailyStatus.snitch}
            onAction={handleSnitchCatch}
            btnText={snitchLoading ? "מזנק..." : "תפוס סניץ'"}
            color="violet"
          />

        </div>
      </div>
    </main>
  );
}

function QuestCard({ title, desc, reward, icon, completed, onAction, btnText, color }: any) {
  // תמיכה בצבעים דינמיים כולל הסגול (violet) החדש
  const colors: Record<string, any> = {
    amber: { border: 'hover:border-amber-500/50 hover:shadow-[0_15px_50px_rgba(245,158,11,0.2)] hover:-translate-y-2 border-t border-r border-white/10', iconBg: 'bg-amber-500/10 border-amber-500/20', badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20', btn: 'from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700' },
    emerald: { border: 'hover:border-emerald-500/50 hover:shadow-[0_15px_50px_rgba(16,185,129,0.2)] hover:-translate-y-2 border-t border-r border-white/10', iconBg: 'bg-emerald-500/10 border-emerald-500/20', badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', btn: 'from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700' },
    violet: { border: 'hover:border-violet-500/50 hover:shadow-[0_15px_50px_rgba(139,92,246,0.2)] hover:-translate-y-2 border-t border-r border-white/10', iconBg: 'bg-violet-500/10 border-violet-500/20', badge: 'text-violet-400 bg-violet-500/10 border-violet-500/20', btn: 'from-violet-600 to-violet-900 hover:from-violet-500 hover:to-violet-800' }
  };

  const theme = colors[color] || colors.amber;

  return (
    <div className={`relative group glass-panel rounded-[2.5rem] p-8 transition-all duration-500 flex flex-col ${completed ? 'opacity-60 border-white/5' : theme.border}`}>
      <div className="flex justify-between items-start mb-6 text-right">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${theme.iconBg}`}>{icon}</div>
        <span className={`text-[10px] font-black font-cinzel uppercase tracking-tighter px-3 py-1 rounded-full border ${theme.badge}`}>{reward}</span>
      </div>

      <div className="flex-1 mb-8">
        <h3 className="font-cinzel text-xl font-bold text-white mb-3">{title}</h3>
        <p className="font-crimson text-lg text-white/60 leading-relaxed">{desc}</p>
      </div>

      {completed ? (
        <div className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white/30 font-cinzel font-bold text-center flex items-center justify-center gap-2 mt-auto">
          <CheckCircle2 size={18} /> הושלם להיום
        </div>
      ) : (
        <button
          onClick={onAction}
          className={`mt-auto w-full py-4 rounded-xl bg-gradient-to-r ${theme.btn} text-white font-cinzel font-black text-lg tracking-widest shadow-lg transition-all active:scale-95`}
        >
          {btnText}
        </button>
      )}
    </div>
  );
}