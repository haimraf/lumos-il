"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Sparkles, Wand2, Moon, Zap, Scroll, Skull, Compass, Star, Eye,
  BookOpen, Ghost, Flame, Shield, Heart, Key, Coffee, Trophy, Sword
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { useAuth } from "@/context/AuthContext";

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
    glow: 'shadow-red-600/50',
    bio: "אומץ לב, תעוזה ואבירות. המקום בו שוכנים האמיצים בלב.",
    secondaryFlavor: "האומץ שבער בך והנכונות להקריב מעצמך למען הצדק כמעט הובילו אותך למעונות האדומים."
  },
  Slytherin: {
    id: 'Slytherin',
    name: "סלית'רין",
    colors: 'from-[#022c22] via-[#064e3b] to-[#065f46]',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/50',
    bio: "ערמומיות, פיקחות ושאפתנות. הדרך לגדולה מתחילה כאן.",
    secondaryFlavor: "השאפתנות והרצון שלך להטביע חותם על העולם ולעשות הכל כדי להצליח כמעט הציבו אותך בסלית'רין."
  },
  Ravenclaw: {
    id: 'Ravenclaw',
    name: 'רייבנקלו',
    colors: 'from-[#1e3a8a] via-[#1e40af] to-[#1d4ed8]',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/50',
    bio: "חכמה, יצירתיות ולמידה. הראש החריף הוא הכוח הגדול מכולם.",
    secondaryFlavor: "הצמא שלך לידע והיכולת לנתח את העולם בהיגיון צרוף כמעט שלחו אותך למגדלי רייבנקלו."
  },
  Hufflepuff: {
    id: 'Hufflepuff',
    name: 'הפלפאף',
    colors: 'from-[#451a03] via-[#78350f] to-[#92400e]',
    text: 'text-yellow-500',
    glow: 'shadow-yellow-500/50',
    bio: "נאמנות, סבלנות ועבודה קשה. כאן נמצאים חברי אמת.",
    secondaryFlavor: "הלב הרחב והנאמנות הבלתי מתפשרת שלך לכל אדם כמעט הפכו אותך להפלפאף גאה."
  }
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "נניח שזכית בבקבוק קטן של 'פליקס פליציס' (מזל נוזלי). מה תעשה/י איתו?",
    icon: <Flame className="text-amber-500/30" size={50} />,
    options: [
      { text: "אשמור אותו לרגע שבו אצטרך להשיג מטרה שאיש לא הצליח לפניי", house: "Slytherin" },
      { text: "אשתמש בו כדי לעזור לחבר קרוב שנמצא במצוקה קשה", house: "Hufflepuff" },
      { text: "אנצל אותו למשימה מסוכנת שדורשת אומץ לב עילאי", house: "Gryffindor" },
      { text: "אחקור את הרכבו הכימי כדי להבין איך ליצור עוד ממנו", house: "Ravenclaw" }
    ]
  },
  {
    id: 2,
    text: "עומדת לפניך תיבה קסומה עתיקה. איזו מהן תבחר/י לפתוח?",
    icon: <Key className="text-purple-500/30" size={50} />,
    options: [
      { text: "תיבת זהב מעוטרת בנחשים, המבטיחה כוח והשפעה", house: "Slytherin" },
      { text: "תיבת עץ פשוטה ונעימה למגע, המריחה כמו עשבי תיבול", house: "Hufflepuff" },
      { text: "תיבת כסף דקה, שמעליה מרחפת הילה של חידה לא פתורה", house: "Ravenclaw" },
      { text: "תיבת ברזל כבדה, שעליה סימני קרב וגבורה", house: "Gryffindor" }
    ]
  },
  {
    id: 3,
    text: "איזה סוג של קסם מושך אותך יותר מכל?",
    icon: <Zap className="text-blue-400/30" size={50} />,
    options: [
      { text: "לחשי הגנה ולוחמה - כדי לעמוד בחזית ולהגן", house: "Gryffindor" },
      { text: "שיקויים ולחשים עתיקים שדורשים דיוק אינטלקטואלי", house: "Ravenclaw" },
      { text: "לחשים שעוזרים לאחרים ומרפאים פצעים", house: "Hufflepuff" },
      { text: "לחשים שמעניקים יתרון על פני אחרים ושליטה בסיטואציה", house: "Slytherin" }
    ]
  },
  {
    id: 4,
    text: "הגעת לנהר שוצף ואין גשר. איך תחצה/י אותו?",
    icon: <Compass className="text-emerald-500/30" size={50} />,
    options: [
      { text: "אקפוץ למים ואלחם בזרם עד שאגיע לצד השני", house: "Gryffindor" },
      { text: "אבנה רפסודה בשיתוף פעולה עם מי שנמצא איתי", house: "Hufflepuff" },
      { text: "אחפש דרך עקיפה או אחשב את הנקודה הכי בטוחה למעבר", house: "Ravenclaw" },
      { text: "אמצא דרך לגרום למישהו אחר להעביר אותי בבטחה", house: "Slytherin" }
    ]
  },
  {
    id: 5,
    text: "אם היית יכול/ה לבחור חפץ קסום אחד, מה הוא היה?",
    icon: <Star className="text-yellow-500/30" size={50} />,
    options: [
      { text: "גלימת היעלמות - לראות בלי להיראות", house: "Slytherin" },
      { text: "שרביט הבכור - הכוח הגדול מכולם", house: "Gryffindor" },
      { text: "מחולל זמן - לתקן טעויות וללמוד יותר", house: "Ravenclaw" },
      { text: "קדרת הזהב - ליצור תמיד שפע לחברים", house: "Hufflepuff" }
    ]
  },
  {
    id: 6,
    text: "מהו הפחד הגדול ביותר שלך?",
    icon: <Skull className="text-red-600/30" size={50} />,
    options: [
      { text: "להיות אדם רגיל וחסר השפעה", house: "Slytherin" },
      { text: "להיחשב לטיפש/ה או חסר/ת בינה", house: "Ravenclaw" },
      { text: "להיות בודד/ת ללא נאמנות של איש", house: "Hufflepuff" },
      { text: "להתגלות כפחדן/ית ברגע האמת", house: "Gryffindor" }
    ]
  },
  {
    id: 7,
    text: "איזה 'דירוג' היית הכי רוצה לשמוע על עצמך בסוף הלימודים?",
    icon: <Trophy className="text-amber-600/30" size={50} />,
    options: [
      { text: "התלמיד/ה הכי מבריק/ה בשכבה", house: "Ravenclaw" },
      { text: "הקוסם/מכשפה הכי אמיץ/ה שהוגוורטס ידעה", house: "Gryffindor" },
      { text: "החבר/ה הכי טוב/ה שאפשר לבקש", house: "Hufflepuff" },
      { text: "האדם שהגיע להישגים הכי גדולים בקריירה שלו", house: "Slytherin" }
    ]
  }
];

export default function SortingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { sendOwl } = useOwlMail();

  const { session, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const userId = session?.user?.id;

  const [typewriterText, setTypewriterText] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({ Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 });
  const [assignedHouse, setAssignedHouse] = useState<House | null>(null);
  const [secondaryHouse, setSecondaryHouse] = useState<House | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [leadingHouse, setLeadingHouse] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) router.push('/');
  }, [session, authLoading, router]);

  useEffect(() => {
    if (assignedHouse || isAnswering || isCalculating) return;
    const messages = [
      "הממ... מה יש לנו כאן?...",
      "אני רואה חכמה... או שאולי זו תעוזה?",
      "מעניין מאוד... הלב שלך מספר לי סיפור...",
      "קשה... קשה מאוד להחליט...",
      "האם נשים אותך במקום שבו הגדולה מחכה?"
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
        try {
          const { error } = await supabase.from('profiles').update({
            house: primaryId,
            role: 'תלמיד/ה',
            galleons: 100
          }).eq('id', userId);

          if (error) throw error;
          sendOwl("המיון הושלם!", `ברוך הבא לבית ${primary.name}. 100 גליאונים הוענקו לך.`, "success");
          refreshProfile();
        } catch (e) {
          console.error("Sorting DB Error:", e);
        }
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
          <h2 className="font-cinzel text-5xl text-white tracking-[0.3em] drop-shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse">המצנפת שוקלת...</h2>
          <p className="font-crimson text-white/40 italic text-2xl">"העבר והעתיד שלך מתערבבים לפניי..."</p>
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
            <p className="font-cinzel text-xl text-white/60 tracking-[0.8em] uppercase">גורלך נחתם</p>
          </div>

          <div className="relative group text-center">
            <div className={`absolute -inset-10 bg-white/20 blur-[100px] rounded-full opacity-50 ${assignedHouse.glow}`}></div>
            <h1 className={`relative text-7xl md:text-[11rem] font-black font-cinzel tracking-tighter drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)] ${assignedHouse.text}`}>
              {assignedHouse.name}
            </h1>
          </div>

          <div className="space-y-16 text-center max-w-3xl w-full">
            <div className="glass-panel p-12 rounded-[3rem] shadow-2xl backdrop-blur-2xl bg-black/20 border-white/5">
              <p className="font-crimson text-3xl md:text-4xl text-white italic leading-relaxed">"{assignedHouse.bio}"</p>
            </div>

            <div className="relative glass-panel group overflow-hidden rounded-[2.5rem] p-12 transition-all hover:bg-white/5 border-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-5"><Shield size={100} /></div>
              <p className="font-cinzel text-amber-500/80 text-xs uppercase tracking-[0.5em] mb-6">מחשבותיה האחרונות של המצנפת...</p>
              <div className="space-y-6">
                <p className="text-white/60 text-xl md:text-2xl font-crimson italic leading-relaxed">
                  "ראיתי בך גם את ניצוץ ה-
                  <span className={`font-cinzel font-black text-2xl mx-2 ${secondaryHouse?.text}`}>
                    {secondaryHouse?.name}
                  </span>
                  שבך..."
                </p>
                <div className="h-[1px] w-16 bg-white/10 mx-auto"></div>
                <p className="text-xl text-white/90 font-medium leading-snug px-4 italic">
                  "{secondaryHouse?.secondaryFlavor}"
                </p>
              </div>
            </div>
          </div>

          <button onClick={() => router.push('/dashboard')} className="group relative px-20 py-8 rounded-full bg-white text-black font-cinzel font-black text-2xl hover:scale-110 transition-all shadow-2xl flex items-center gap-4">
            לחדר המועדון <Wand2 className="group-hover:rotate-45 transition-transform" />
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
            <h2 className="font-cinzel text-3xl md:text-5xl text-white font-bold leading-tight max-w-4xl">{q.text}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt.house)}
                className="group glass-panel relative text-right p-8 rounded-[2rem] hover:border-amber-500/30 hover:bg-white/5 transition-all duration-500 active:scale-95 overflow-hidden border border-white/5"
              >
                <span className="relative z-10 font-crimson text-xl md:text-2xl text-white/60 group-hover:text-white transition-colors block leading-tight">
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
        <img src="/images/sorting-hat.png" alt="Sorting Hat" className="w-80 md:w-[35rem] relative z-10 animate-float drop-shadow-[0_20px_70px_rgba(0,0,0,1)] mx-auto" />
        <p className="font-crimson text-4xl md:text-6xl text-white italic min-h-[140px] max-w-4xl mx-auto px-4 leading-snug">
          "{typewriterText}"
        </p>
        <button onClick={() => setIsAnswering(true)} className="group bg-amber-600 text-amber-950 px-24 py-8 rounded-full font-cinzel font-black text-3xl tracking-tighter hover:bg-amber-500 hover:scale-105 transition-all shadow-[0_0_80px_rgba(217,119,6,0.3)]">
          הנח את המצנפת על ראשך
        </button>
      </div>
    </main>
  );
}