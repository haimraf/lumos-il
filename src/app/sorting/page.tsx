"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Sparkles, Wand2, Moon, Compass, Ghost, Zap, Scroll, Skull } from "lucide-react";

/**
 * LUMOS IL - THE SORTING HAT V8.0 (The "Mind-Blower" Edition)
 * שדרוג: שאלות לור עמוקות, לוגיקת Hatstall, ואנימציות פרימיום.
 */

const HOUSES = [
  { id: 'Gryffindor', name: 'גריפינדור', colors: 'from-[#3a0a0a] via-[#991b1b] to-[#fbbf24]', text: 'text-amber-500', bio: "אומץ, תעוזה ואבירות. המקום בו שוכנים האמיצים בלב." },
  { id: 'Slytherin', name: "סלית'רין", colors: 'from-[#051a05] via-[#064e3b] to-[#94a3b8]', text: 'text-emerald-400', bio: "ערמומיות, פיקחות ושאפתנות. כאן תמצא את דרכך לגדולה." },
  { id: 'Ravenclaw', name: 'רייבנקלו', colors: 'from-[#05051a] via-[#1e3a8a] to-[#92400e]', text: 'text-blue-400', bio: "חכמה, יצירתיות ולמידה. הראש החריף הוא כוחך הגדול." },
  { id: 'Hufflepuff', name: 'הפלפאף', colors: 'from-[#1a1505] via-[#78350f] to-[#0a0a0a]', text: 'text-yellow-500', bio: "נאמנות, סבלנות ועבודה קשה. כאן חברי האמת שלך." }
];

const QUESTIONS = [
  {
    id: 1,
    text: "נבואה עתיקה נלחשת באוזנך. מה המילים שאתה הכי מפחד לשמוע?",
    icon: <Moon className="text-purple-900/40" size={50} />,
    options: [
      { text: "שבגדתי באלו שבטחו בי מעל הכל", house: "Hufflepuff" },
      { text: "שחיי עברו מבלי שהשארתי חותם או השפעה", house: "Slytherin" },
      { text: "שברגע המבחן, פחדתי ונסוגתי לאחור", house: "Gryffindor" },
      { text: "שהבנתי הכל, אך היה זה מאוחר מדי", house: "Ravenclaw" }
    ]
  },
  {
    id: 2,
    text: "אתה עומד בפני המבחן הסופי באוקלומנציה. מהו הזיכרון שבו תשתמש כדי לחסום את המחשבות שלך?",
    icon: <Zap className="text-amber-900/30" size={50} />,
    options: [
      { text: "הפעם ההיא שבה עמדתי מול כולם ולא ויתרתי", house: "Gryffindor" },
      { text: "רגע של שקט מוחלט בחדר מלא ספרים עתיקים", house: "Ravenclaw" },
      { text: "זיכרון של רגע של כוח שבו כולם הקשיבו רק לי", house: "Slytherin" },
      { text: "החיוך של חבר ביום הכי גרוע שלי", house: "Hufflepuff" }
    ]
  },
  {
    id: 3,
    text: "שיקוי ה'פליקס פליציס' (מזל נוזלי) בידיך. לאיזו מטרה תשתמש בו?",
    icon: <Sparkles className="text-emerald-900/30" size={50} />,
    options: [
      { text: "כדי לזכות בתחרות שכולם אמרו שאני לא מסוגל לנצח", house: "Gryffindor" },
      { text: "כדי לפתוח דלתות פוליטיות ולהתקדם לעמדת מפתח", house: "Slytherin" },
      { text: "כדי להצליח לפתור חידה שאיש לא פתר כבר מאות שנים", house: "Ravenclaw" },
      { text: "כדי לוודא שהיום של אדם שקרוב אליי יהיה מושלם", house: "Hufflepuff" }
    ]
  },
  {
    id: 4,
    text: "נחשף לפניך חדר סודי בספריית הוגוורטס. מה הספר שתשלוף מהמדף?",
    icon: <Scroll className="text-amber-800/30" size={50} />,
    options: [
      { text: "סודות הקסם האפל ואיך לשלוט בהם", house: "Slytherin" },
      { text: "מדריך ללחשי הגנה ולוחמה בקוסמים", house: "Gryffindor" },
      { text: "תולדות היקום והבנת חוקי הקסם", house: "Ravenclaw" },
      { text: "מדריך לצמחי מרפא ועזרה לזולת", house: "Hufflepuff" }
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

  const initialMessages = [
    "הממ... עוד נשמה שמחפשת את מקומה...",
    "אני רואה כאן רצון עז להצליח... וגם נאמנות שלא תסולא בפז.",
    "אתה מוכן לתת לי להציץ לתוך מחשבותיך?"
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
    const type = () => {
      const fullText = isSorting ? "מעניין... מעניין מאוד. אני רואה הכל... הנה ההחלטה שלי!" : initialMessages[msgIndex];
      if (charIndex <= fullText.length) {
        setTypewriterText(fullText.slice(0, charIndex));
        charIndex++;
        setTimeout(type, 40);
      } else if (!isSorting && msgIndex < initialMessages.length - 1) {
        setTimeout(() => { msgIndex++; charIndex = 0; type(); }, 1200);
      } else { setIsTypingFinished(true); }
    };
    type();
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

    const counts: Record<string, number> = {};
    finalAnswers.forEach(ans => counts[ans] = (counts[ans] || 0) + 1);
    let maxHouseId = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
    const finalHouse = HOUSES.find(h => h.id === maxHouseId)!;

    setTimeout(async () => {
      await supabase.from('profiles').upsert({ id: userId, house: finalHouse.id, galleons: 100 }, { onConflict: 'id' });
      setAssignedHouse(finalHouse);
      setIsSorting(false);
    }, 4500);
  };

  if (isAuthenticating) return null;

  // --- REVEAL STATE (Victory) ---
  if (assignedHouse) {
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center p-6 relative transition-all duration-[2000ms] bg-gradient-to-br ${assignedHouse.colors}`} dir="rtl">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-12 max-w-4xl animate-in fade-in zoom-in duration-1000">
          <p className="font-cinzel text-xl md:text-3xl text-white/60 tracking-[0.4em]">המצנפת בחרה עבורך...</p>
          <div className="space-y-4">
            <h1 className={`text-7xl md:text-[11rem] font-black font-cinzel tracking-tighter drop-shadow-[0_0_60px_rgba(255,255,255,0.4)] ${assignedHouse.text} animate-pulse`}>
              {assignedHouse.name}
            </h1>
            <p className="font-crimson text-2xl md:text-4xl text-white italic max-w-2xl mx-auto leading-relaxed border-t border-white/10 pt-10">
              "{assignedHouse.bio}"
            </p>
          </div>
          <button onClick={() => router.push('/dashboard')} className="mt-12 bg-white text-black px-16 py-6 rounded-full font-cinzel font-bold text-xl hover:bg-amber-500 hover:scale-110 transition-all shadow-2xl">
            להמשך לחדר המועדון
          </button>
        </div>
      </main>
    );
  }

  // --- QUESTION STATE (Parchment) ---
  if (isAnswering) {
    const question = QUESTIONS[currentQuestionIndex];
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden" dir="rtl">
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] pointer-events-none"></div>
        <div className="relative z-10 w-full max-w-4xl glass-panel p-10 md:p-20 rounded-[4rem] border-amber-900/20 shadow-[0_0_100px_rgba(0,0,0,0.8)]" style={{ backgroundImage: "linear-gradient(135deg, #fdfaf5 0%, #f3eedc 100%)" }}>
          <div className="absolute top-[-30px] right-[-30px] opacity-10 rotate-12"><Skull size={200} className="text-amber-900" /></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-12 animate-float">{question.icon}</div>
            <span className="font-cinzel text-xs tracking-[0.6em] text-amber-800/40 uppercase mb-4">Question {currentQuestionIndex + 1}</span>
            <h2 className="font-crimson text-3xl md:text-6xl font-black text-[#2d1b0a] mb-16 leading-[1.2]">
              {question.text}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {question.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(opt.house)} className="group relative w-full p-8 text-right rounded-3xl border border-amber-900/10 bg-black/[0.03] hover:bg-white hover:border-amber-500 transition-all duration-300 shadow-sm hover:shadow-2xl overflow-hidden">
                  <span className="font-crimson text-xl md:text-2xl text-[#3d2b1a] block group-hover:text-black leading-tight transition-colors">{opt.text}</span>
                  <Wand2 className="absolute left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all text-amber-600 group-hover:rotate-45" size={24} />
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
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
      <div className="relative z-10 flex flex-col items-center space-y-16 max-w-4xl">
        <div className="relative group animate-float">
          <div className="absolute inset-0 bg-amber-500/20 blur-[100px] rounded-full animate-pulse-slow"></div>
          <div className="relative p-14 rounded-full border-2 border-amber-500/20 bg-black/60 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <Compass size={130} className="text-amber-600 group-hover:rotate-90 transition-transform duration-1000" />
          </div>
        </div>
        <div className="min-h-[200px] flex items-center justify-center">
          <p className="font-crimson text-4xl md:text-7xl text-white/95 leading-relaxed italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            {typewriterText}
            <span className="animate-pulse ml-1 inline-block w-1 h-16 bg-amber-500"></span>
          </p>
        </div>
        {!isSorting && isTypingFinished && (
          <button onClick={() => setIsAnswering(true)} className="font-cinzel text-xl bg-amber-600 text-white px-20 py-7 rounded-full hover:bg-amber-500 hover:scale-110 transition-all shadow-[0_0_60px_rgba(217,119,6,0.4)] group">
            <span className="flex items-center gap-5">
              <Zap className="group-hover:text-yellow-200 transition-colors" />
              התחל בטקס המיון
            </span>
          </button>
        )}
      </div>
    </main>
  );
}