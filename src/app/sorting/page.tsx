"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Sparkles, Wand2, Moon, Zap, Scroll, Trophy, Star, ShieldAlert } from "lucide-react";

// --- Houses Configuration ---
const HOUSES = [
  { id: 'Gryffindor', name: 'גריפינדור', colors: 'from-[#3a0a0a] via-[#991b1b] to-[#fbbf24]', text: 'text-red-500', shadow: 'shadow-red-600/50', bio: "אומץ, תעוזה ואבירות. המקום בו שוכנים האמיצים בלב." },
  { id: 'Slytherin', name: "סלית'רין", colors: 'from-[#051a05] via-[#064e3b] to-[#94a3b8]', text: 'text-emerald-400', shadow: 'shadow-emerald-600/50', bio: "ערמומיות, פיקחות ושאפתנות. הדרך לגדולה מתחילה כאן." },
  { id: 'Ravenclaw', name: 'רייבנקלו', colors: 'from-[#05051a] via-[#1e3a8a] to-[#92400e]', text: 'text-blue-400', shadow: 'shadow-blue-600/50', bio: "חכמה, יצירתיות ולמידה. הראש החריף הוא הכוח הגדול מכולם." },
  { id: 'Hufflepuff', name: 'הפלפאף', colors: 'from-[#1a1505] via-[#78350f] to-[#0a0a0a]', text: 'text-yellow-500', shadow: 'shadow-amber-600/50', bio: "נאמנות, סבלנות ועבודה קשה. כאן נמצאים חברי אמת." }
];

const QUESTIONS = [
  {
    id: 1,
    text: "במסדרונות האפלים של הטירה, את/ה נתקל/ת בראי של ינאלופ. מה משתקף שם?",
    icon: <Moon className="text-purple-500/40" size={50} />,
    options: [
      { text: "אותי, עומד/ת מעל כולם, מחזיק/ה בכוח שאיש לא העז לחלום עליו", house: "Slytherin" },
      { text: "ספר עתיק שדפיו נפתחים ומגלים לי את כל סודות היקום", house: "Ravenclaw" },
      { text: "רגע של גבורה עילאית בו הצלתי את אלו שחשובים לי", house: "Gryffindor" },
      { text: "שולחן עמוס חברים ומשפחה, צוחקים יחד בביטחון מלא", house: "Hufflepuff" }
    ]
  },
  {
    id: 2,
    text: "ארבע תיבות מונחות לפניך. איזו מהן תבחר/י לפתוח?",
    icon: <Scroll className="text-amber-500/40" size={50} />,
    options: [
      { text: "תיבת זהב מעוטרת בנחשים, המשדרת עוצמה וירושה עתיקה", house: "Slytherin" },
      { text: "תיבת עץ פשוטה וחסונה המפיצה ריח של בית ונוחות", house: "Hufflepuff" },
      { text: "תיבת כסף אלגנטית הנפתחת רק למי שיפתור את החידה שחרוטה עליה", house: "Ravenclaw" },
      { text: "תיבת ברזל כבדה, חרוכה מאש, שמתוכה בוקע קול קרב", house: "Gryffindor" }
    ]
  },
  {
    id: 3,
    text: "בדו-קרב גורלי, מהו הקו המנחה שלך?",
    icon: <Zap className="text-blue-500/40" size={50} />,
    options: [
      { text: "למצוא את נקודת התורפה של היריב ולהכות בדיוק כירורגי", house: "Ravenclaw" },
      { text: "להסתער קדימה בביטחון, הלב הוא המגן הטוב ביותר שלי", house: "Gryffindor" },
      { text: "לנצל כל יתרון אפשרי, המטרה מקדשת את האמצעים", house: "Slytherin" },
      { text: "להגן על חבריי בכל מחיר, גם אם אצטרך לספוג את המכה עבורם", house: "Hufflepuff" }
    ]
  }
];

export default function SortingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [typewriterText, setTypewriterText] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({ Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 });
  const [assignedHouse, setAssignedHouse] = useState<any>(null);
  const [secondaryHouse, setSecondaryHouse] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      setUserId(session.user.id);
    };
    checkUser();
  }, [supabase, router]);

  // לוגיקת המצנפת המדברת
  useEffect(() => {
    if (assignedHouse || isAnswering || isCalculating) return;
    const texts = ["אני רואה הכל...", "הראש שלך מלא בכישרון... אבל איפה לשים אותך?", "מעניין... אומץ? או אולי שאפתנות?"];
    let i = 0;
    const interval = setInterval(() => {
      setTypewriterText(texts[i % texts.length]);
      i++;
    }, 4000);
    setTypewriterText(texts[0]);
    return () => clearInterval(interval);
  }, [assignedHouse, isAnswering, isCalculating]);

  const handleAnswer = (house: string) => {
    setScores(prev => ({ ...prev, [house]: prev[house] + 1 }));

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      performFinalSorting();
    }
  };

  const performFinalSorting = async () => {
    setIsAnswering(false);
    setIsCalculating(true);

    // אלגוריתם השקלול
    const sortedHouses = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);

    const primaryId = sortedHouses[0][0];
    const secondaryId = sortedHouses[1][0];

    const primary = HOUSES.find(h => h.id === primaryId);
    const secondary = HOUSES.find(h => h.id === secondaryId);

    setTimeout(async () => {
      if (userId) {
        await supabase.from('profiles').update({
          house: primaryId,
          role: 'תלמיד/ה',
          galleons: 100
        }).eq('id', userId);
      }
      setAssignedHouse(primary);
      setSecondaryHouse(secondary);
      setIsCalculating(false);
    }, 4500);
  };

  if (isCalculating) {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative">
          <div className="w-32 h-32 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-8"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500 animate-pulse" size={40} />
        </div>
        <h2 className="font-cinzel text-3xl text-white animate-pulse tracking-widest">מנתח את נבכי הנשמה...</h2>
      </main>
    );
  }

  if (assignedHouse) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center p-6 relative transition-all duration-[2000ms] bg-gradient-to-br ${assignedHouse.colors}`} dir="rtl">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

        <div className="relative z-10 text-center space-y-8 animate-in fade-in zoom-in duration-1000">
          <div className="inline-block px-6 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white/80 font-cinzel text-sm tracking-widest mb-4">
            תוצאת המיון הרשמית
          </div>

          <h1 className={`text-8xl md:text-[12rem] font-black font-cinzel tracking-tighter drop-shadow-2xl ${assignedHouse.text}`}>
            {assignedHouse.name}
          </h1>

          <div className="max-w-2xl mx-auto space-y-6">
            <p className="font-crimson text-3xl text-white italic leading-relaxed">"{assignedHouse.bio}"</p>

            {/* פיצ'ר הבית המשני - כאן אנחנו מנצחים אותם! */}
            <div className="pt-8 border-t border-white/20 mt-8">
              <p className="font-cinzel text-white/60 text-lg uppercase tracking-widest">
                הבית שכמעט הגעת אליו: <span className="text-white font-bold">{secondaryHouse?.name}</span>
              </p>
              <p className="text-white/40 text-sm italic mt-2">הפוטנציאל שלך רחב יותר ממה שחשבת</p>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="mt-12 bg-white text-black px-12 py-5 rounded-full font-cinzel font-black text-xl hover:scale-110 transition-all shadow-2xl flex items-center gap-4 mx-auto"
          >
            כניסה למגורי {assignedHouse.name} <Wand2 size={24} />
          </button>
        </div>
      </main>
    );
  }

  if (isAnswering) {
    const q = QUESTIONS[currentQuestionIndex];
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-4xl bg-[#0a0a15] border border-white/5 rounded-[4rem] p-8 md:p-16 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-white/10 font-cinzel text-9xl font-black">{currentQuestionIndex + 1}</div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-8 animate-float">{q.icon}</div>
            <h2 className="font-cinzel text-3xl md:text-5xl text-white mb-12 leading-tight">{q.text}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt.house)}
                  className="p-8 text-right rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-500/50 transition-all group relative overflow-hidden"
                >
                  <span className="font-crimson text-xl md:text-2xl text-white/80 group-hover:text-white transition-colors">{opt.text}</span>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><Sparkles className="text-amber-500" /></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-4xl space-y-12">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-amber-500/20 blur-[100px] animate-pulse"></div>
          <img src="/images/sorting-hat.png" alt="Sorting Hat" className="w-64 md:w-80 relative z-10 animate-float opacity-80 grayscale hover:grayscale-0 transition-all duration-1000" />
        </div>

        <div className="min-h-[100px]">
          <p className="font-crimson text-4xl md:text-6xl text-white italic drop-shadow-lg">{typewriterText}</p>
        </div>

        <button
          onClick={() => setIsAnswering(true)}
          className="group bg-amber-600 text-amber-950 px-16 py-6 rounded-full font-cinzel font-black text-2xl tracking-tighter hover:bg-amber-500 hover:scale-105 transition-all shadow-[0_0_50px_rgba(217,119,6,0.3)]"
        >
          התחל בטקס המיון
        </button>
      </div>
    </main>
  );
}