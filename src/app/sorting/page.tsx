"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Sparkles, Wand2, Moon, Zap, Scroll, Skull, Compass, Star, Eye, BookOpen, Ghost, Flame, Shield, Heart } from "lucide-react";

// --- Types ---
interface House {
  id: string;
  name: string;
  colors: string;
  text: string;
  glow: string;
  bio: string;
  secondaryFlavor: string;
}

interface Option {
  text: string;
  house: string;
}

interface Question {
  id: number;
  text: string;
  icon: React.ReactNode;
  options: Option[];
}

// --- Houses Configuration ---
const HOUSES: Record<string, House> = {
  Gryffindor: {
    id: 'Gryffindor',
    name: 'גריפינדור',
    colors: 'from-[#4a0404] via-[#7f1d1d] to-[#991b1b]',
    text: 'text-red-500',
    glow: 'shadow-red-500/50',
    bio: "אומץ לב, תעוזה ואבירות. המקום בו שוכנים האמיצים בלב.",
    secondaryFlavor: "האומץ שבער בך והנכונות להקריב מעצמך כמעט הובילו אותך למעונות האדומים."
  },
  Slytherin: {
    id: 'Slytherin',
    name: "סלית'רין",
    colors: 'from-[#022c22] via-[#064e3b] to-[#065f46]',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/50',
    bio: "ערמומיות, פיקחות ושאפתנות. הדרך לגדולה מתחילה כאן.",
    secondaryFlavor: "השאפתנות והרצון שלך להטביע חותם על העולם כמעט הציבו אותך בסלית'רין."
  },
  Ravenclaw: {
    id: 'Ravenclaw',
    name: 'רייבנקלו',
    colors: 'from-[#1e3a8a] via-[#1e40af] to-[#1d4ed8]',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/50',
    bio: "חכמה, יצירתיות ולמידה. הראש החריף הוא הכוח הגדול מכולם.",
    secondaryFlavor: "הצמא שלך לידע והיכולת לראות מעבר לגלוי כמעט שלחו אותך למגדלי רייבנקלו."
  },
  Hufflepuff: {
    id: 'Hufflepuff',
    name: 'הפלפאף',
    colors: 'from-[#451a03] via-[#78350f] to-[#92400e]',
    text: 'text-yellow-500',
    glow: 'shadow-yellow-500/50',
    bio: "נאמנות, סבלנות ועבודה קשה. כאן נמצאים חברי אמת.",
    secondaryFlavor: "הלב הרחב והנאמנות הבלתי מתפשרת שלך כמעט הפכו אותך להפלפאף גאה."
  }
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "עומדת לפניך הגיגית (Pensieve). איזה סוג של זיכרון היית הכי רוצה לחקור?",
    icon: <Sparkles className="text-blue-400/30" size={50} />,
    options: [
      { text: "סודות עתיקים של קוסמים גדולים מהעבר", house: "Ravenclaw" },
      { text: "רגעים של ניצחון ותהילה אישיים", house: "Slytherin" },
      { text: "זכרונות של חברות אמת ורגעי חום ביתיים", house: "Hufflepuff" },
      { text: "מעשי גבורה ששינו את פני ההיסטוריה", house: "Gryffindor" }
    ]
  },
  {
    id: 2,
    text: "במסדרונות הטירה, מצאת את ראי ינאלופ. מה משתקף שם?",
    icon: <Eye className="text-purple-500/30" size={50} />,
    options: [
      { text: "אני, עומד/ת מעל כולם, חזק/ה ומשפיע/ה", house: "Slytherin" },
      { text: "עצמי, מוקף/ת בידע ובתובנות חדשות", house: "Ravenclaw" },
      { text: "רגע שבו הצלחתי להגן על היקרים לי מכל", house: "Gryffindor" },
      { text: "משפחתי וחבריי, מאושרים ובטוחים", house: "Hufflepuff" }
    ]
  },
  {
    id: 3,
    text: "הבוגארט יוצא מהארון. איזו צורה הוא לובש כדי להפחיד אותך?",
    icon: <Skull className="text-red-500/30" size={50} />,
    options: [
      { text: "חוסר אונים מוחלט מול כוח גדול", house: "Slytherin" },
      { text: "בדידות ושכחה על ידי החברים שלי", house: "Hufflepuff" },
      { text: "חשיפת בורותי בנושא קריטי", house: "Ravenclaw" },
      { text: "כישלון ברגע שבו נדרש ממני אומץ", house: "Gryffindor" }
    ]
  },
  {
    id: 4,
    text: "איזה ניחוח היה עולה עבורך משיקוי האמורטנציה?",
    icon: <Ghost className="text-pink-500/30" size={50} />,
    options: [
      { text: "ריח של ספרים ישנים ודיו טרי", house: "Ravenclaw" },
      { text: "ריח של אש בוערת באח ועור", house: "Gryffindor" },
      { text: "ריח של אדמה רטובה ועשבי תיבול", house: "Hufflepuff" },
      { text: "ריח של כוח, יוקרה ובושם יקר", house: "Slytherin" }
    ]
  },
  {
    id: 5,
    text: "איזו חיה תבחר/י להביא איתך לטירה?",
    icon: <Heart className="text-amber-500/30" size={50} />,
    options: [
      { text: "חתול שחור מסתורי שיודע למצוא קיצורי דרך", house: "Slytherin" },
      { text: "ינשוף לבן ומרשים שמעביר מסרים במהירות", house: "Ravenclaw" },
      { text: "קרפדה נאמנה שתמיד נשארת לצידי", house: "Hufflepuff" },
      { text: "ינשוף שובב שלא מפחד משום סופה", house: "Gryffindor" }
    ]
  },
  {
    id: 6,
    text: "מהי התכונה שהיית הכי רוצה שיזכרו בך?",
    icon: <Star className="text-yellow-500/30" size={50} />,
    options: [
      { text: "החוכמה והיצירתיות שלי", house: "Ravenclaw" },
      { text: "האומץ והגבורה שלי", house: "Gryffindor" },
      { text: "הנאמנות והטוב שבי", house: "Hufflepuff" },
      { text: "ההישגים והגדולה שאליה הגעתי", house: "Slytherin" }
    ]
  },
  {
    id: 7,
    text: "נקלעת לדו-קרב. מהי האסטרטגיה שלך?",
    icon: <Zap className="text-blue-500/30" size={50} />,
    options: [
      { text: "לחכות לטעות של היריב ולתקוף בחוכמה", house: "Ravenclaw" },
      { text: "להסתער בביטחון ולהשתמש בלחשים חזקים", house: "Gryffindor" },
      { text: "להשתמש בתחבולות כדי להטעות את היריב", house: "Slytherin" },
      { text: "להתגונן ולשמור על קור רוח עד שהסכנה תחלוף", house: "Hufflepuff" }
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
  const [assignedHouse, setAssignedHouse] = useState<House | null>(null);
  const [secondaryHouse, setSecondaryHouse] = useState<House | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [leadingHouse, setLeadingHouse] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      setUserId(session.user.id);
    };
    checkUser();
  }, [supabase, router]);

  useEffect(() => {
    if (assignedHouse || isAnswering || isCalculating) return;
    const messages = [
      "אני רואה הכל... כל מחשבה...",
      "מעניין... מעניין מאוד...",
      "איפה נשים אותך?...",
      "אני חשה באומץ... או שאולי זו שאפתנות?",
      "הכל גלוי לפניי... הממ..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      setTypewriterText(messages[i % messages.length]);
      i++;
    }, 4500);
    setTypewriterText(messages[0]);
    return () => clearInterval(interval);
  }, [assignedHouse, isAnswering, isCalculating]);

  const handleAnswer = (house: string) => {
    const newScores = { ...scores, [house]: scores[house] + 1 };
    setScores(newScores);

    const sortedEntries = Object.entries(newScores).sort(([, a], [, b]) => b - a);
    setLeadingHouse(sortedEntries[0][0]);

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQuestionIndex(currentQuestionIndex + 1), 400);
    } else {
      performFinalSorting(newScores);
    }
  };

  const performFinalSorting = async (finalScores: Record<string, number>) => {
    setIsAnswering(false);
    setIsCalculating(true);

    const sortedHouses = (Object.entries(finalScores) as [string, number][])
      .sort(([, a], [, b]) => b - a);

    const primaryId = sortedHouses[0][0];
    const secondaryId = sortedHouses[1][0];

    const primary = HOUSES[primaryId];
    const secondary = HOUSES[secondaryId];

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
    }, 5500);
  };

  if (isCalculating) {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-12">
          <div className="w-48 h-48 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500 animate-pulse" size={60} />
        </div>
        <div className="space-y-4">
          <h2 className="font-cinzel text-5xl text-white tracking-[0.3em] drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse">ההחלטה מתגבשת...</h2>
          <p className="font-crimson text-white/40 italic text-2xl">"קשה... קשה מאוד..."</p>
        </div>
      </main>
    );
  }

  if (assignedHouse) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center py-32 px-6 relative transition-all duration-[4000ms] bg-gradient-to-br ${assignedHouse.colors}`} dir="rtl">
        <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
        <div className="relative z-10 max-w-4xl w-full flex flex-col items-center gap-20 animate-in fade-in zoom-in duration-[2000ms]">

          <div className="text-center space-y-4">
            <Star className="text-white/40 animate-spin-slow mx-auto" size={30} />
            <p className="font-cinzel text-xl text-white/60 tracking-[0.8em] uppercase">הגורל נקבע</p>
          </div>

          <div className="relative group text-center">
            <div className={`absolute -inset-10 bg-white/20 blur-[100px] rounded-full opacity-50 ${assignedHouse.glow}`}></div>
            <h1 className={`relative text-8xl md:text-[13rem] font-black font-cinzel tracking-tighter drop-shadow-2xl ${assignedHouse.text}`}>
              {assignedHouse.name}
            </h1>
          </div>

          <div className="space-y-16 text-center max-w-3xl w-full">
            <div className="glass-panel p-12 rounded-[4rem] shadow-2xl">
              <p className="font-crimson text-3xl md:text-4xl text-white italic leading-relaxed">"{assignedHouse.bio}"</p>
            </div>

            <div className="relative glass-panel group overflow-hidden rounded-[3rem] p-12 transition-all hover:-translate-y-2">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Shield size={100} /></div>

              <p className="font-cinzel text-amber-500/80 text-xs uppercase tracking-[0.5em] mb-6">לחישת המצנפת...</p>

              <div className="space-y-6">
                <p className="text-white/60 text-xl md:text-2xl font-crimson italic leading-relaxed">
                  "ראיתי בך גם את ניצוץ ה-
                  <span className={`font-cinzel font-black text-2xl mx-2 px-4 py-1 rounded-lg bg-white/5 ${secondaryHouse?.text}`}>
                    {secondaryHouse?.name}
                  </span>
                  שבך..."
                </p>

                <div className="h-[1px] w-16 bg-white/10 mx-auto"></div>

                <p className="text-2xl text-white/90 font-medium leading-snug px-4">
                  {secondaryHouse?.secondaryFlavor}
                </p>
              </div>

              <p className="text-white/20 text-[10px] uppercase tracking-[0.4em] mt-10 font-cinzel italic">
                אבל בסוף, רק דרך אחת היא הנכונה עבורך.
              </p>
            </div>
          </div>

          <button onClick={() => router.push('/dashboard')} className="group relative px-20 py-8 rounded-full bg-white text-black font-cinzel font-black text-2xl hover:scale-110 transition-all shadow-2xl flex items-center gap-4">
            כניסה לחדר המועדון <Wand2 className="group-hover:rotate-45 transition-transform" />
          </button>
        </div>
      </main>
    );
  }

  if (isAnswering) {
    const q = QUESTIONS[currentQuestionIndex];
    const auraColor = leadingHouse ? HOUSES[leadingHouse].colors : 'from-amber-900/10';

    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
        <div className={`absolute inset-0 bg-gradient-to-br ${auraColor} opacity-10 transition-all duration-[1500ms]`}></div>
        <div className="relative z-10 w-full max-w-5xl space-y-16 py-12">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="opacity-40 animate-float">{q.icon}</div>
            <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.5em] uppercase">שלב {currentQuestionIndex + 1} מתוך {QUESTIONS.length}</p>
            <h2 className="font-cinzel text-4xl md:text-6xl text-white font-bold leading-tight max-w-4xl">{q.text}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt.house)}
                className="group glass-panel relative text-right p-10 rounded-[3rem] hover:border-amber-500/30 transition-all duration-500 active:scale-95 overflow-hidden"
              >
                <span className="relative z-10 font-crimson text-2xl md:text-3xl text-white/60 group-hover:text-white transition-colors block leading-tight">
                  {opt.text}
                </span>
                <div className="absolute left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="text-amber-500/40" size={24} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
      <div className="relative z-10 max-w-4xl space-y-20 py-20">
        <img src="/images/sorting-hat.png" alt="Sorting Hat" className="w-80 md:w-[38rem] relative z-10 animate-float drop-shadow-[0_20px_70px_rgba(0,0,0,1)] mx-auto" />
        <p className="font-crimson text-4xl md:text-7xl text-white italic min-h-[160px] max-w-5xl mx-auto px-4 leading-snug">
          "{typewriterText}"
        </p>
        <button onClick={() => setIsAnswering(true)} className="group bg-amber-600 text-amber-950 px-24 py-8 rounded-full font-cinzel font-black text-3xl tracking-tighter hover:bg-amber-500 hover:scale-105 transition-all shadow-[0_0_80px_rgba(217,119,6,0.3)]">
          הנח את המצנפת על ראשך
        </button>
      </div>
    </main>
  );
}