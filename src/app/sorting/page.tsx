"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Sparkles, Wand2, Moon, Compass, Zap, Scroll, Skull } from "lucide-react";

// --- Houses Configuration ---
const HOUSES = [
  { id: 'Gryffindor', name: 'גריפינדור', colors: 'from-[#3a0a0a] via-[#991b1b] to-[#fbbf24]', text: 'text-amber-500', shadow: 'shadow-red-500/50', bio: "אומץ, תעוזה ואבירות. המקום בו שוכנים האמיצים בלב." },
  { id: 'Slytherin', name: "סלית'רין", colors: 'from-[#051a05] via-[#064e3b] to-[#94a3b8]', text: 'text-emerald-400', shadow: 'shadow-emerald-500/50', bio: "ערמומיות, פיקחות ושאפתנות. הדרך לגדולה מתחילה כאן." },
  { id: 'Ravenclaw', name: 'רייבנקלו', colors: 'from-[#05051a] via-[#1e3a8a] to-[#92400e]', text: 'text-blue-400', shadow: 'shadow-blue-500/50', bio: "חכמה, יצירתיות ולמידה. הראש החריף הוא הכוח הגדול מכולם." },
  { id: 'Hufflepuff', name: 'הפלפאף', colors: 'from-[#1a1505] via-[#78350f] to-[#0a0a0a]', text: 'text-yellow-500', shadow: 'shadow-amber-500/50', bio: "נאמנות, סבלנות ועבודה קשה. כאן נמצאים חברי אמת." }
];

// שאלות משודרגות - שפה א-מגדרית בגוף ראשון!
const QUESTIONS = [
  {
    id: 1,
    text: "נבואה עתיקה נלחשת בחשיכה. מהן המילים שהכי מפחיד לשמוע?",
    icon: <Moon className="text-purple-900/40 animate-pulse" size={50} />,
    options: [
      { text: "שהפניתי עורף לאלו שסמכו עליי מעל לכל", house: "Hufflepuff" },
      { text: "שחיי יחלפו מבלי שאשאיר חותם או השפעה בעולם", house: "Slytherin" },
      { text: "שברגע האמת, הפחד ישתק אותי ואסוג לאחור", house: "Gryffindor" },
      { text: "שאבין את האמת, אך זה יהיה מאוחר מדי", house: "Ravenclaw" }
    ]
  },
  {
    id: 2,
    text: "בפני המבחן הסופי באוקלומנציה. מהו הזיכרון שישמש כחומת מגן למחשבות?",
    icon: <Zap className="text-amber-900/30 animate-bounce" size={50} />,
    options: [
      { text: "הפעם ההיא שעמדתי מול כולם ולא ויתרתי", house: "Gryffindor" },
      { text: "רגע של שקט מוחלט בחדר מלא ספרים עתיקים", house: "Ravenclaw" },
      { text: "תחושת הכוח הטהורה כשהמונים הקשיבו רק לי", house: "Slytherin" },
      { text: "חיוך של חבר קרוב ביום הכי חשוך שלי", house: "Hufflepuff" }
    ]
  },
  {
    id: 3,
    text: "שיקוי ה'פליקס פליציס' (מזל נוזלי) בידיך. לאיזו מטרה הוא ישמש?",
    icon: <Sparkles className="text-emerald-900/30 rotate-12" size={50} />,
    options: [
      { text: "לניצחון בתחרות שכולם טענו שהיא בלתי אפשרית עבורי", house: "Gryffindor" },
      { text: "לפתיחת דלתות נסתרות והתקדמות לעמדת מפתח", house: "Slytherin" },
      { text: "לפיצוח חידה עתיקה שאיש לא הצליח לפתור מאות שנים", house: "Ravenclaw" },
      { text: "להבטחת יום מושלם ומאושר עבור אדם אהוב", house: "Hufflepuff" }
    ]
  }
];

export default function SortingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [typewriterText, setTypewriterText] = useState("");
  const [isTypingFinished, setIsTypingFinished] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [assignedHouse, setAssignedHouse] = useState<any>(null);

  // משפטים א-מגדריים למצנפת המיון
  const initialMessages = [
    "הממ... עוד נשמה שמחפשת את מקומה...",
    "יש כאן רצון עז להצליח... וגם נאמנות שלא תסולא בפז.",
    "האם קיימת המוכנות לתת לי להציץ פנימה אל תוך המחשבות?"
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: profile } = await supabase.from('profiles').select('house').eq('id', session.user.id).single();
      if (profile?.house && profile.house !== 'Unsorted') { router.push('/dashboard'); return; }
      setUserId(session.user.id);
      setIsAuthenticating(false);
    };
    checkAuth();
  }, [supabase, router]);

  useEffect(() => {
    if (isAuthenticating || assignedHouse || (isAnswering && !isSorting)) return;
    let msgIndex = 0;
    let charIndex = 0;
    let typingTimeout: NodeJS.Timeout;

    const type = () => {
      const fullText = isSorting ? "מעניין... מעניין מאוד. הכל ברור עכשיו... הנה ההחלטה שלי!" : initialMessages[msgIndex];
      if (charIndex <= fullText.length) {
        setTypewriterText(fullText.slice(0, charIndex));
        charIndex++;
        typingTimeout = setTimeout(type, 45);
      } else if (!isSorting && msgIndex < initialMessages.length - 1) {
        typingTimeout = setTimeout(() => { msgIndex++; charIndex = 0; type(); }, 1500);
      } else {
        setIsTypingFinished(true);
      }
    };

    type();
    return () => clearTimeout(typingTimeout);
  }, [isAuthenticating, isSorting, isAnswering, assignedHouse]);

  const handleAnswer = async (selectedHouse: string) => {
    const newAnswers = [...answers, selectedHouse];
    setAnswers(newAnswers);
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setIsAnswering(false);
      await finishSorting(newAnswers);
    }
  };

  const finishSorting = async (finalAnswers: string[]) => {
    if (!userId) return;
    setIsSorting(true);
    setIsTypingFinished(false);

    // חישוב תוצאות
    const counts: Record<string, number> = {};
    finalAnswers.forEach(ans => counts[ans] = (counts[ans] || 0) + 1);
    let maxHouseId = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
    const finalHouse = HOUSES.find(h => h.id === maxHouseId)!;

    // השהייה לאפקט הדרמטי
    setTimeout(async () => {
      // עדכון המסד - תלמיד/ה זו שפה מכלילה!
      const { error } = await supabase.from('profiles').update({
        house: finalHouse.id,
        role: 'תלמיד/ה',
        galleons: 100,
        points_contributed: 0
      }).eq('id', userId);

      if (error) {
        console.error("שגיאה בעדכון הבית:", error);
      } else {
        setAssignedHouse(finalHouse);
        setIsSorting(false);
      }
    }, 4000);
  };

  if (isAuthenticating) return null;

  // --- REVEAL STATE (The Moment of Truth) ---
  if (assignedHouse) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center p-6 relative transition-all duration-[3000ms] bg-gradient-to-br ${assignedHouse.colors}`} dir="rtl">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-12 max-w-4xl animate-in fade-in zoom-in duration-1000">
          <p className="font-cinzel text-xl md:text-3xl text-white/80 tracking-[0.4em] drop-shadow-lg">המצנפת החליטה...</p>
          <div className="space-y-6">
            <h1 className={`text-7xl md:text-[12rem] font-black font-cinzel tracking-tighter drop-shadow-[0_0_50px_rgba(255,255,255,0.6)] ${assignedHouse.text} animate-pulse`}>
              {assignedHouse.name}
            </h1>
            <div className={`h-2 w-32 mx-auto rounded-full bg-white/20 ${assignedHouse.shadow} blur-sm`}></div>
            <p className="font-crimson text-2xl md:text-4xl text-white font-medium italic max-w-2xl mx-auto leading-relaxed border-t border-white/20 pt-10">
              "{assignedHouse.bio}"
            </p>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="mt-12 bg-white/10 border-2 border-white/40 backdrop-blur-xl text-white px-16 py-6 rounded-full font-cinzel font-bold text-xl tracking-[0.2em] hover:bg-white hover:text-black hover:scale-110 transition-all shadow-2xl active:scale-95 group"
          >
            <span className="flex items-center gap-4">
              כניסה לחדר המועדון
              <Wand2 className="group-hover:rotate-45 transition-transform" />
            </span>
          </button>
        </div>
      </main>
    );
  }

  // --- QUESTION STATE ---
  if (isAnswering) {
    const question = QUESTIONS[currentQuestionIndex];
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden" dir="rtl">
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] pointer-events-none"></div>

        {/* הילה קסומה מאחורי השאלה */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-amber-900/10 blur-[120px] rounded-full pointer-events-none animate-pulse-slow"></div>

        <div className="relative z-10 w-full max-w-4xl glass-panel p-10 md:p-20 rounded-[3rem] border-amber-900/20 shadow-[0_0_100px_rgba(0,0,0,0.8)]" style={{ backgroundImage: "linear-gradient(135deg, #fdfaf5 0%, #f3eedc 100%)" }}>
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-10 animate-float drop-shadow-xl">{question.icon}</div>
            <span className="font-cinzel text-xs tracking-[0.6em] text-amber-800/60 uppercase mb-4 font-bold italic">טקס המיון העתיק</span>
            <h2 className="font-crimson text-3xl md:text-5xl font-black text-[#2d1b0a] mb-12 leading-[1.2]">
              {question.text}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
              {question.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(opt.house)} className="group relative w-full p-8 text-right rounded-2xl border-2 border-amber-900/10 bg-white/40 hover:bg-white hover:border-amber-600 transition-all duration-300 shadow-md hover:shadow-2xl overflow-hidden active:scale-95">
                  <span className="font-crimson text-xl md:text-2xl text-[#3d2b1a] block group-hover:text-black font-bold leading-tight transition-colors relative z-10">{opt.text}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --- INITIAL STATE (Hat Interface) ---
  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="relative z-10 flex flex-col items-center space-y-16 max-w-4xl w-full">
        <div className="relative group animate-float">
          <div className="absolute inset-0 bg-amber-500/20 blur-[120px] rounded-full animate-pulse-slow"></div>
          <div className="relative p-16 rounded-full border-4 border-amber-500/20 bg-black/40 backdrop-blur-md shadow-[0_0_80px_rgba(245,158,11,0.2)]">
            <Compass size={140} className="text-amber-600 group-hover:rotate-[360deg] transition-transform duration-[4000ms] ease-in-out" />
          </div>
        </div>

        <div className="min-h-[220px] flex items-center justify-center px-4 w-full">
          <p className="font-crimson text-3xl md:text-6xl text-white/95 leading-relaxed italic drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] max-w-3xl">
            {typewriterText}
            <span className="animate-pulse ml-2 inline-block w-1 h-12 md:h-16 bg-amber-500 relative top-2"></span>
          </p>
        </div>

        {!isSorting && isTypingFinished && (
          <button
            onClick={() => setIsAnswering(true)}
            className="font-cinzel text-xl bg-amber-600 text-amber-950 px-20 md:px-24 py-7 md:py-8 rounded-full hover:bg-amber-500 hover:scale-110 active:scale-95 transition-all shadow-[0_0_80px_rgba(217,119,6,0.5)] group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
            <span className="flex items-center gap-6 font-black tracking-[0.2em] uppercase relative z-10">
              <Zap className="group-hover:text-yellow-200 transition-colors animate-pulse" />
              תחילת טקס המיון
            </span>
          </button>
        )}

        {isSorting && (
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-cinzel text-amber-500 tracking-[0.5em] uppercase">המצנפת שוקלת את החלטתה...</p>
          </div>
        )}
      </div>
    </main>
  );
}