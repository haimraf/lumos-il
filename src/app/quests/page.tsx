"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  ChevronRight,
  Coins,
  Trophy,
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  Hourglass,
  Flame
} from "lucide-react";

/**
 * LUMOS IL - QUESTS BOARD V2.0
 * שדרוג: עיצוב משחקי (Gamified), הילות זוהרות, והתאמה לאטמוספירת ה-Dark Mode.
 */

const HOUSE_COLORS: Record<string, string> = {
  Gryffindor: 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]',
  Slytherin: 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]',
  Ravenclaw: 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]',
  Hufflepuff: 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]',
};

type ProfileData = {
  galleons: number;
  points_contributed: number;
  house: string | null;
  last_reward_date: string | null;
  last_trivia_date: string | null;
};

export default function QuestsPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [dailyCollected, setDailyCollected] = useState(false);
  const [triviaAnswered, setTriviaAnswered] = useState(false);
  const [triviaResult, setTriviaResult] = useState<'correct' | 'wrong' | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/';
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('galleons, points_contributed, house, last_reward_date, last_trivia_date')
        .eq('id', session.user.id)
        .single();

      const fetchedProfile: ProfileData = profileData ? {
        galleons: profileData.galleons || 0,
        points_contributed: profileData.points_contributed || 0,
        house: profileData.house || null,
        last_reward_date: profileData.last_reward_date || null,
        last_trivia_date: profileData.last_trivia_date || null,
      } : { galleons: 0, points_contributed: 0, house: null, last_reward_date: null, last_trivia_date: null };

      setUserId(session.user.id);
      setProfile(fetchedProfile);

      if (fetchedProfile.last_reward_date === today) {
        setDailyCollected(true);
      }
      if (fetchedProfile.last_trivia_date === today) {
        setTriviaAnswered(true);
        setTriviaResult(null);
      }

      setIsLoading(false);
    };

    fetchProfile();
  }, [supabase, today]);

  const handleDailyCollect = async () => {
    if (!userId || !profile || dailyCollected) return;
    setIsCollecting(true);

    const { error } = await supabase
      .from('profiles')
      .update({ galleons: profile.galleons + 5, last_reward_date: today })
      .eq('id', userId);

    if (!error) {
      setProfile({ ...profile, galleons: profile.galleons + 5, last_reward_date: today });
      setDailyCollected(true);
    }
    setIsCollecting(false);
  };

  const handleTriviaAnswer = async (answer: string) => {
    if (!userId || !profile || triviaAnswered) return;

    const isCorrect = answer === 'אלוהומורה';
    const updatePayload: Record<string, unknown> = { last_trivia_date: today };

    if (isCorrect) {
      updatePayload.points_contributed = profile.points_contributed + 10;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (!error) {
      if (isCorrect) {
        setProfile({ ...profile, points_contributed: profile.points_contributed + 10, last_trivia_date: today });
        setTriviaResult('correct');
      } else {
        setProfile({ ...profile, last_trivia_date: today });
        setTriviaResult('wrong');
      }
    }
    setTriviaAnswered(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const houseColor = profile?.house && HOUSE_COLORS[profile.house] ? HOUSE_COLORS[profile.house] : 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]';

  return (
    <main className="min-h-screen bg-[#020617] text-[#f8fafc] relative overflow-x-hidden selection:bg-amber-500/30" dir="rtl">

      {/* ATMOSPHERIC BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/10 blur-[150px] animate-pulse-slow"></div>
        <div className="absolute top-[40%] right-[10%] w-[60vw] h-[60vw] rounded-full bg-amber-900/10 blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
      </div>

      <div className="relative w-full max-w-5xl mx-auto px-6 py-8 flex flex-col z-10 min-h-screen">

        {/* TOP NAVIGATION & STATS */}
        <div className="w-full flex justify-between items-center mb-16">
          <Link href="/dashboard" className="group flex items-center gap-2 text-white/50 hover:text-amber-500 transition-all font-cinzel text-sm tracking-widest font-bold">
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            חזרה לטירה
          </Link>

          <div className="flex items-center gap-4 bg-black/40 border border-white/10 px-5 py-2.5 rounded-full shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Coins size={16} className="text-amber-500" />
              <span className="text-amber-400 font-bold font-cinzel tracking-wider">{profile?.galleons}</span>
            </div>
            <div className="w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-2">
              <Trophy size={16} className={houseColor.split(' ')[0]} />
              <span className={`font-bold font-cinzel tracking-wider ${houseColor}`}>{profile?.points_contributed}</span>
            </div>
          </div>
        </div>

        {/* HEADER */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="font-cinzel text-5xl md:text-7xl font-black tracking-tight text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            לוח <span className="text-amber-500">המשימות</span>
          </h1>
          <p className="font-crimson text-xl md:text-2xl text-white/50 italic tracking-wide">
            השלימו אתגרי קסם יומיים, הרוויחו גליאונים והביאו כבוד לבית שלכם.
          </p>
        </div>

        {/* QUESTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">

          {/* QUEST 1: DAILY ALLOWANCE */}
          <div className="relative group bg-zinc-950/60 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-amber-500/30 transition-all duration-500 overflow-hidden flex flex-col">
            {/* Glow Effect */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>

            <div className="flex items-start justify-between mb-8 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)] group-hover:scale-110 transition-transform">
                <Coins size={32} className="text-amber-500" />
              </div>
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-xs font-black uppercase font-cinzel text-amber-400 tracking-wider">תגמול: 5 גליאונים</span>
              </div>
            </div>

            <div className="mb-10 relative z-10 flex-1">
              <h3 className="font-cinzel text-2xl md:text-3xl font-bold text-white mb-3">קצבה יומית</h3>
              <p className="font-crimson text-lg text-white/50 leading-relaxed">
                דמי כיס יומיים מאושרים על ידי משרד הקסמים. אל תשכחו לאסוף אותם כל יום כדי למלא את הכיסים לקראת ביקור בהוגסמיד.
              </p>
            </div>

            <div className="relative z-10">
              {dailyCollected ? (
                <div className="w-full py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-cinzel font-bold text-lg flex items-center justify-center gap-3">
                  <CheckCircle2 size={20} />
                  נאסף להיום
                </div>
              ) : (
                <button
                  onClick={handleDailyCollect}
                  disabled={isCollecting}
                  className="relative w-full py-5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-amber-950 font-cinzel font-black text-xl tracking-widest transition-all shadow-[0_10px_30px_rgba(217,119,6,0.3)] active:scale-95 disabled:opacity-50 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite] pointer-events-none"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isCollecting ? 'אוסף גליאונים...' : 'אסוף קצבה'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* QUEST 2: TRIVIA */}
          <div className="relative group bg-zinc-950/60 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-blue-500/30 transition-all duration-500 overflow-hidden flex flex-col">
            {/* Glow Effect */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-blue-500/20 transition-all"></div>

            <div className="flex items-start justify-between mb-8 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:scale-110 transition-transform">
                <BookOpen size={32} className="text-blue-400" />
              </div>
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-full">
                <Trophy size={14} className="text-blue-400" />
                <span className="text-xs font-black uppercase font-cinzel text-blue-400 tracking-wider">תגמול: 10 נקודות בית</span>
              </div>
            </div>

            <div className="mb-8 relative z-10 flex-1">
              <h3 className="font-cinzel text-2xl md:text-3xl font-bold text-white mb-3">מבחן לחשים</h3>
              <p className="font-crimson text-xl text-amber-500/90 font-bold leading-relaxed">
                איזה לחש פותח דלתות נעולות?
              </p>
            </div>

            <div className="relative z-10 mt-auto">
              {triviaAnswered ? (
                <div className={`w-full p-5 rounded-2xl border font-crimson text-lg flex items-center gap-3 ${triviaResult === 'correct'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : triviaResult === 'wrong'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-white/5 border-white/10 text-white/50'
                  }`}>
                  {triviaResult === 'correct' ? <CheckCircle2 size={24} className="shrink-0" /> : triviaResult === 'wrong' ? <XCircle size={24} className="shrink-0" /> : <Hourglass size={24} className="shrink-0" />}
                  <span className="leading-tight">
                    {triviaResult === 'correct'
                      ? '✓ אלוהומורה! הבית שלך זכה ב-10 נקודות!'
                      : triviaResult === 'wrong'
                        ? '✗ טעות... התשובה הנכונה היא אלוהומורה. נסה שוב מחר!'
                        : 'כבר שיחקת היום. המבחן הבא יפתח מחר!'}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {['לומוס', 'אלוהומורה', 'אקספליארמוס', 'פרוטגו'].map((spell) => (
                    <button
                      key={spell}
                      onClick={() => handleTriviaAnswer(spell)}
                      className="py-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-blue-500/40 text-white font-crimson text-xl transition-all duration-200 active:scale-95"
                    >
                      {spell}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}