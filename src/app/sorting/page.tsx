"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Sparkles, Wand2, Flame, Key, Zap, Compass, Star,
  Skull, Trophy, Shield, Eye, Scroll, Moon, Heart
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { useAuth } from "@/context/AuthContext";
import { logActivityEvent } from "@/lib/activityEvents";
import { isUnsortedHouse } from "@/lib/houses";
import { canBypassSortingRole } from "@/lib/profileAccess";

/**
 * LUMOS IL - SORTING CEREMONY V3
 * ✅ 10 שאלות — 7 מקוריות + 3 חדשות בסגנון HP אמיתי
 * ✅ שיוך תכונות קסומות מולדות לפי בית (נשמר ב-magic_traits)
 * ✅ עיצוב משודרג — אפקט אורה דינמי, progress מילוי
 * ✅ הפתעה קטנה — "הד המצנפת" אחרי המיון
 */

interface House {
  id: string;
  name: string;
  colors: string;
  text: string;
  glow: string;
  bio: string;
  secondaryFlavor: string;
  emoji: string;
}

interface Option { text: string; house: string; }
interface Question { id: number; text: string; icon: React.ReactNode; options: Option[]; }

const HOUSES: Record<string, House> = {
  Gryffindor: {
    id: 'Gryffindor', name: 'גריפינדור', emoji: '🦁',
    colors: 'from-[#4a0404] via-[#7f1d1d] to-[#991b1b]',
    text: 'text-red-400', glow: 'shadow-red-600/50',
    bio: "אומץ לב, תעוזה ואבירות. המקום בו שוכנים האמיצים בלב.",
    secondaryFlavor: "האומץ שבער בך והנכונות להקריב מעצמך למען הצדק כמעט הובילו אותך למעונות האדומים."
  },
  Slytherin: {
    id: 'Slytherin', name: "סלית'רין", emoji: '🐍',
    colors: 'from-[#022c22] via-[#064e3b] to-[#065f46]',
    text: 'text-emerald-400', glow: 'shadow-emerald-500/50',
    bio: "ערמומיות, פיקחות ושאפתנות. הדרך לגדולה מתחילה כאן.",
    secondaryFlavor: "השאפתנות והרצון שלך להטביע חותם על העולם כמעט הציבו אותך בסלית'רין."
  },
  Ravenclaw: {
    id: 'Ravenclaw', name: 'רייבנקלו', emoji: '🦅',
    colors: 'from-[#1e3a8a] via-[#1e40af] to-[#1d4ed8]',
    text: 'text-blue-400', glow: 'shadow-blue-500/50',
    bio: "חכמה, יצירתיות ולמידה. הראש החריף הוא הכוח הגדול מכולם.",
    secondaryFlavor: "הצמא שלך לידע והיכולת לנתח את העולם בהיגיון צרוף כמעט שלחו אותך למגדלי רייבנקלו."
  },
  Hufflepuff: {
    id: 'Hufflepuff', name: 'הפלפאף', emoji: '🦡',
    colors: 'from-[#451a03] via-[#78350f] to-[#92400e]',
    text: 'text-yellow-500', glow: 'shadow-yellow-500/50',
    bio: "נאמנות, סבלנות ועבודה קשה. כאן נמצאים חברי אמת.",
    secondaryFlavor: "הלב הרחב והנאמנות הבלתי מתפשרת שלך לכל אדם כמעט הפכו אותך להפלפאף גאה."
  }
};

// ── תכונות לפי בית (אקראיות בטווח) ──
function generateTraits(house: string) {
  const r = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
  const map: Record<string, () => Record<string, number>> = {
    Gryffindor: () => ({ courage: r(72, 95), wisdom: r(38, 62), cunning: r(20, 44), loyalty: r(50, 70) }),
    Ravenclaw: () => ({ courage: r(38, 62), wisdom: r(75, 95), cunning: r(44, 66), loyalty: r(44, 66) }),
    Slytherin: () => ({ courage: r(44, 66), wisdom: r(50, 70), cunning: r(75, 95), loyalty: r(18, 44) }),
    Hufflepuff: () => ({ courage: r(44, 66), wisdom: r(38, 60), cunning: r(18, 40), loyalty: r(80, 96) }),
  };
  return map[house]?.() ?? { courage: 50, wisdom: 50, cunning: 50, loyalty: 50 };
}

const QUESTIONS: Question[] = [
  // ── מקוריות (7) ──
  {
    id: 1,
    text: "נניח שזכית בבקבוק קטן של 'פליקס פליציס' — מזל נוזלי טהור. מה תעשה/י בו?",
    icon: <Flame className="text-amber-500/25" size={56} />,
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
    icon: <Key className="text-purple-500/25" size={56} />,
    options: [
      { text: "תיבת זהב מעוטרת בנחשים, המבטיחה כוח והשפעה", house: "Slytherin" },
      { text: "תיבת עץ פשוטה ונעימה למגע, המריחה כמו עשבי תיבול", house: "Hufflepuff" },
      { text: "תיבת כסף דקה, שמעליה מרחפת הילה של חידה לא פתורה", house: "Ravenclaw" },
      { text: "תיבת ברזל כבדה, שעליה סימני קרב וגבורה", house: "Gryffindor" }
    ]
  },
  {
    id: 3,
    text: "איזה סוג של קסם מושך את ליבך יותר מכל?",
    icon: <Zap className="text-blue-400/25" size={56} />,
    options: [
      { text: "לחשי הגנה ולוחמה — לעמוד בחזית ולהגן", house: "Gryffindor" },
      { text: "שיקויים ולחשים עתיקים הדורשים דיוק אינטלקטואלי", house: "Ravenclaw" },
      { text: "לחשי ריפוי ועזרה לאחרים", house: "Hufflepuff" },
      { text: "לחשים המעניקים שליטה ויתרון על פני אחרים", house: "Slytherin" }
    ]
  },
  {
    id: 4,
    text: "הגעת לנהר שוצף ואין גשר. כיצד תחצה/י אותו?",
    icon: <Compass className="text-emerald-500/25" size={56} />,
    options: [
      { text: "אקפוץ למים ואלחם בזרם עד שאגיע לצד השני", house: "Gryffindor" },
      { text: "אבנה רפסודה בשיתוף פעולה עם מי שנמצא איתי", house: "Hufflepuff" },
      { text: "אחפש דרך עקיפה או אחשב את הנקודה הכי בטוחה למעבר", house: "Ravenclaw" },
      { text: "אמצא דרך לגרום למישהו אחר להעביר אותי בבטחה", house: "Slytherin" }
    ]
  },
  {
    id: 5,
    text: "אם יכולת לבחור חפץ קסום אחד בלבד, מה הוא היה?",
    icon: <Star className="text-yellow-500/25" size={56} />,
    options: [
      { text: "גלימת ההיעלמות — לראות בלי להיראות", house: "Slytherin" },
      { text: "שרביט הבכור — הכוח הגדול מכולם", house: "Gryffindor" },
      { text: "מחולל הזמן — לתקן טעויות וללמוד יותר", house: "Ravenclaw" },
      { text: "אבן התחייה — להשיב לחיים את מי שאהבת", house: "Hufflepuff" }
    ]
  },
  {
    id: 6,
    text: "מהו הפחד הגדול ביותר שלך?",
    icon: <Skull className="text-red-600/25" size={56} />,
    options: [
      { text: "להיות אדם רגיל וחסר השפעה", house: "Slytherin" },
      { text: "להיחשב לחסר/ת בינה בעיני אחרים", house: "Ravenclaw" },
      { text: "להיות בודד/ת ללא נאמנות של איש", house: "Hufflepuff" },
      { text: "להתגלות כפחדן/ית ברגע האמת", house: "Gryffindor" }
    ]
  },
  {
    id: 7,
    text: "איזה 'דירוג' היית הכי רוצה לשמוע על עצמך בסיום לימודיך?",
    icon: <Trophy className="text-amber-600/25" size={56} />,
    options: [
      { text: "התלמיד/ה הכי מבריק/ה שהוגוורטס ידעה מעולם", house: "Ravenclaw" },
      { text: "הקוסם/ת הכי אמיצ/ה שהוגוורטס חינכה", house: "Gryffindor" },
      { text: "החבר/ה הטוב/ה ביותר שניתן לבקש", house: "Hufflepuff" },
      { text: "מי שעלה לגדולה כנגד כל הסיכויים", house: "Slytherin" }
    ]
  },

  // ── חדשות בסגנון HP (3) ──
  {
    id: 8,
    text: "בואבורד מגיח לפניך בדמות גורמת אימה — מהי הדמות שהכי מפחידה אותך?",
    icon: <Moon className="text-indigo-400/25" size={56} />,
    options: [
      { text: "המורה לחינוך גופני המבשר עליי כישלון בפני כל הכיתה", house: "Ravenclaw" },
      { text: "ידידי הטוב ביותר מפנה לי עורף בשעת מצוקה", house: "Hufflepuff" },
      { text: "אני עומד/ת לבד, נחשל/ת, בלי שום דרך לנצח", house: "Gryffindor" },
      { text: "מישהו חכם ממני שמגלה את תכניתי לפני הזמן", house: "Slytherin" }
    ]
  },
  {
    id: 9,
    text: "גילית ב'ספרייה האסורה' ספר שמכיל ידע עצום — אך קריאתו כרוכה בסיכון. מה תעשה/י?",
    icon: <Scroll className="text-amber-400/25" size={56} />,
    options: [
      { text: "אקרא אותו בחשאי, המידע חשוב יותר מהכלל", house: "Slytherin" },
      { text: "אקרא אותו — הידע שווה כל סיכון", house: "Ravenclaw" },
      { text: "אגנוב מבט מהיר — לא אוכל לעמוד בפיתוי", house: "Gryffindor" },
      { text: "אשאל את הספרנית — יש בוודאי דרך לגשת אליו ללא סיכון", house: "Hufflepuff" }
    ]
  },
  {
    id: 10,
    text: "ווליוורט מציב לפניך את השאלה האחרונה לפני פסיקתו. מה הדבר שהכי חשוב לך?",
    icon: <Heart className="text-rose-400/25" size={56} />,
    options: [
      { text: "שיזכרו אותי כאדם שלא פחד לעמוד מול הרוע ללא היסוס", house: "Gryffindor" },
      { text: "שאשאיר אחריי ידע שישרת דורות שיבואו", house: "Ravenclaw" },
      { text: "שאהבי ומשפחתי ידעו שלא בגדתי בהם לעולם", house: "Hufflepuff" },
      { text: "שאגיע לפסגה שאחרים אמרו שאינה בהישג ידי", house: "Slytherin" }
    ]
  }
];

const HOUSE_AURA: Record<string, string> = {
  Gryffindor: 'rgba(220,38,38,0.12)',
  Slytherin: 'rgba(5,150,105,0.12)',
  Ravenclaw: 'rgba(37,99,235,0.12)',
  Hufflepuff: 'rgba(245,158,11,0.12)',
};

export default function SortingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { sendOwl } = useOwlMail();
  const { session, profile, refreshProfile, isLoading: authLoading } = useAuth();
  const userId = session?.user?.id;

  const [wizardName, setWizardName] = useState("");
  const [typewriterText, setTypewriterText] = useState("");
  const [typewriterIdx, setTypewriterIdx] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({ Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 });
  const [assignedHouse, setAssignedHouse] = useState<House | null>(null);
  const [secondaryHouse, setSecondaryHouse] = useState<House | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [leadingHouse, setLeadingHouse] = useState<string | null>(null);
  const [animateQuestion, setAnimateQuestion] = useState(false);
  const [traits, setTraits] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      router.replace('/');
      return;
    }

    if (profile && (canBypassSortingRole(profile.role) || !isUnsortedHouse(profile.house))) {
      router.replace('/home');
    }
  }, [session, authLoading, profile, router]);

  // Typewriter effect
  const MESSAGES = [
    "הממ... מה יש לנו כאן?...",
    "אני רואה חכמה... או שאולי זו תעוזה?",
    "מעניין מאוד... ליבך מספר לי סיפור...",
    "קשה... קשה מאוד להחליט...",
    "אני מרגיש/ה את הכוח הטמון בך...",
    "האם יש כאן שאפתנות... או נאמנות?",
  ];

  useEffect(() => {
    if (assignedHouse || isAnswering || isCalculating) return;
    const interval = setInterval(() => {
      setTypewriterIdx(i => (i + 1) % MESSAGES.length);
    }, 4200);
    return () => clearInterval(interval);
  }, [assignedHouse, isAnswering, isCalculating]);

  useEffect(() => {
    setTypewriterText(MESSAGES[typewriterIdx]);
  }, [typewriterIdx]);

  const handleAnswer = (house: string) => {
    const newScores = { ...scores, [house]: scores[house] + 1 };
    setScores(newScores);
    const sorted = Object.entries(newScores).sort(([, a], [, b]) => b - a);
    setLeadingHouse(sorted[0][0]);

    setAnimateQuestion(true);
    setTimeout(() => {
      setAnimateQuestion(false);
      if (currentQuestionIndex < QUESTIONS.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        performFinalSorting(newScores);
      }
    }, 350);
  };

  const performFinalSorting = async (finalScores: Record<string, number>) => {
    setIsAnswering(false);
    setIsCalculating(true);

    const sorted = (Object.entries(finalScores) as [string, number][]).sort(([, a], [, b]) => b - a);
    const primaryId = sorted[0][0];
    const secondaryId = sorted[1][0];
    const primary = HOUSES[primaryId];
    const secondary = HOUSES[secondaryId];

    const magicTraits = generateTraits(primaryId);
    setTraits(magicTraits);

    setTimeout(async () => {
      if (userId) {
        try {
          const { data, error } = await supabase.rpc('complete_sorting_ceremony_secure', {
            p_house: primaryId,
            p_magic_traits: magicTraits,
          });
          if (error) throw error;
          const bonusGalleons = data?.bonus_galleons ?? 0;
          sendOwl(
            "המיון הושלם!",
            bonusGalleons > 0
              ? `שערי בית ${primary.name} נפתחו, ו-${bonusGalleons} גליאונים נוספו למאזן.`
              : `שערי בית ${primary.name} נפתחו.`,
            "success"
          );
          await logActivityEvent(supabase, {
            actorId: userId,
            eventType: 'house_sorted',
            icon: primary.emoji,
            title: `שובצ/ה לבית ${primary.name}`,
            subtitle: secondary ? `כמעט ${secondary.name}` : null,
            description: bonusGalleons > 0 ? `${bonusGalleons} גליאונים הוענקו בטקס המיון` : 'טקס המיון הושלם בהצלחה',
            targetType: 'profile',
            targetId: userId,
            targetUrl: '/dashboard',
          });
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

  const progress = ((currentQuestionIndex) / QUESTIONS.length) * 100;

  // ── Loading ──
  if (isCalculating) return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-12">
        <div className="w-48 h-48 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500 animate-pulse" size={60} />
      </div>
      <div className="space-y-4">
        <h2 className="font-cinzel text-4xl md:text-5xl text-white tracking-[0.2em] drop-shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-pulse">המצנפת שוקלת...</h2>
        <p className="font-crimson text-white/30 italic text-xl">"העבר והעתיד שלך מתערבבים לפניי..."</p>
      </div>
    </main>
  );

  // ── Result ──
  if (assignedHouse) return (
    <main className={`min-h-screen flex flex-col items-center justify-center py-24 px-6 relative bg-gradient-to-br ${assignedHouse.colors}`} dir="rtl">
      <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />

      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center gap-16 animate-in fade-in zoom-in duration-[2000ms]">

        {/* Stamp */}
        <div className="text-center space-y-2">
          <p className="font-cinzel text-xs text-white/40 tracking-[0.8em] uppercase">גורלך נחתם</p>
        </div>

        {/* House name */}
        <div className="relative text-center">
          <div className={`absolute -inset-12 bg-white/10 blur-[100px] rounded-full opacity-60 ${assignedHouse.glow}`} />
          <div className="text-8xl mb-4">{assignedHouse.emoji}</div>
          <h1 className={`relative text-6xl md:text-[9rem] font-black font-cinzel tracking-tighter drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)] ${assignedHouse.text}`}>
            {assignedHouse.name}
          </h1>
        </div>

        {/* Bio */}
        <div className="glass-panel p-10 rounded-[3rem] shadow-2xl backdrop-blur-2xl bg-black/20 border border-white/5 text-center max-w-2xl">
          <p className="font-crimson text-2xl md:text-3xl text-white italic leading-relaxed">"{assignedHouse.bio}"</p>
        </div>

        {/* ✨ הפתעה — תכונות שנחשפו */}
        {traits && (
          <div className="w-full max-w-2xl glass-panel rounded-[2.5rem] p-8 bg-black/30 border border-white/[0.06] space-y-5">
            <div className="text-center mb-6">
              <p className="font-cinzel text-[10px] text-amber-500/50 uppercase tracking-[0.5em]">המצנפת חשפה את תכונותיך המולדות</p>
              <h3 className="font-cinzel text-lg text-white/70 mt-1">תכונות קסומות מולדות</h3>
            </div>
            {[
              { key: 'courage', name: 'אומץ לב', icon: '⚔️', color: 'bg-red-500' },
              { key: 'wisdom', name: 'חכמה', icon: '📖', color: 'bg-blue-500' },
              { key: 'cunning', name: 'ערמומיות', icon: '🐍', color: 'bg-emerald-500' },
              { key: 'loyalty', name: 'נאמנות', icon: '🦡', color: 'bg-amber-500' },
            ].map(t => (
              <div key={t.key} className="flex items-center gap-4">
                <span className="text-xl w-7 shrink-0">{t.icon}</span>
                <span className="font-cinzel text-xs text-white/50 w-20 shrink-0 text-right">{t.name}</span>
                <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${t.color} rounded-full transition-all duration-1000 opacity-80`}
                    style={{ width: `${traits[t.key]}%` }}
                  />
                </div>
                <span className={`font-cinzel font-black text-sm w-8 text-left ${assignedHouse.text}`}>{traits[t.key]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Secondary house whisper */}
        <div className="glass-panel rounded-[2rem] p-8 bg-black/20 border border-white/[0.04] text-center max-w-xl">
          <p className="font-cinzel text-amber-500/40 text-[10px] uppercase tracking-widest mb-4">מחשבותיה האחרונות של המצנפת</p>
          <p className="text-white/50 text-lg font-crimson italic leading-relaxed">
            "ראיתי בך גם את ניצוץ ה-
            <span className={`font-cinzel font-black text-xl mx-1.5 ${secondaryHouse?.text}`}>{secondaryHouse?.name}</span>
            שבך..."
          </p>
          <p className="text-white/30 text-base font-crimson italic mt-4">"{secondaryHouse?.secondaryFlavor}"</p>
        </div>

        {/* Name input for new wizards */}
        <div className="w-full max-w-md space-y-4">
            <div className="text-center">
                <p className="font-cinzel text-[10px] text-amber-500/50 uppercase tracking-[0.4em] mb-2">שלב אחרון</p>
                <h3 className="font-cinzel text-xl text-white/80">באיזה שם יכירו אותך בטירה?</h3>
            </div>
            <input
                type="text"
                value={wizardName}
                onChange={(e) => setWizardName(e.target.value)}
                placeholder="הקלד/י את שמך..."
                maxLength={30}
                dir="rtl"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center text-white text-lg font-cinzel outline-none focus:border-amber-500/50 transition-all placeholder:text-white/20"
            />
            <button
                onClick={async () => {
                    const name = wizardName.trim();
                    if (!name) return;
                    if (userId) {
                        await supabase.from('profiles').update({ full_name: name }).eq('id', userId);
                        refreshProfile();
                    }
                    router.push('/dashboard');
                }}
                disabled={!wizardName.trim()}
                className="group relative w-full px-16 py-6 rounded-full bg-white text-black font-cinzel font-black text-xl hover:scale-105 transition-all shadow-2xl flex items-center justify-center gap-4 disabled:opacity-30 disabled:hover:scale-100"
            >
                לחדר המועדון <Wand2 className="group-hover:rotate-45 transition-transform" />
            </button>
        </div>
      </div>
    </main>
  );

  // ── Questions ──
  if (isAnswering) {
    const q = QUESTIONS[currentQuestionIndex];
    const auraColor = leadingHouse ? HOUSE_AURA[leadingHouse] : 'transparent';

    return (
      <main
        className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-700"
        dir="rtl"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${auraColor} 0%, #020617 60%)` }}
      >
        <div className="relative z-10 w-full max-w-4xl space-y-10 py-12">

          {/* Progress bar */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-[10px] font-cinzel uppercase tracking-widest text-white/20">
              <span>שאלה {currentQuestionIndex + 1} מתוך {QUESTIONS.length}</span>
              {leadingHouse && (
                <span className="flex items-center gap-1">
                  {HOUSES[leadingHouse].emoji} {HOUSES[leadingHouse].name} מובילה
                </span>
              )}
            </div>
            <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500/60 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div
            className={`flex flex-col items-center text-center gap-8 transition-all duration-300 ${animateQuestion ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          >
            <div className="opacity-30">{q.icon}</div>
            <h2 className="font-cinzel text-2xl md:text-4xl text-white font-bold leading-tight max-w-3xl">
              {q.text}
            </h2>
          </div>

          {/* Options */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-5 px-2 transition-all duration-300 ${animateQuestion ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
          >
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt.house)}
                className="group relative text-right p-7 rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] hover:border-amber-500/25 hover:bg-amber-500/[0.04] transition-all duration-400 active:scale-[0.98] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-amber-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <span className="relative z-10 font-crimson text-lg md:text-xl text-white/55 group-hover:text-white/90 transition-colors block leading-relaxed">
                  {opt.text}
                </span>
                <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity" size={18} />
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ── Intro ──
  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-15 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[50%] bg-[radial-gradient(ellipse,rgba(120,80,20,0.15)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 max-w-4xl space-y-16 py-20">
        <img
          src="/images/sorting-hat.png"
          alt="מצנפת המיון"
          className="w-72 md:w-[32rem] mx-auto drop-shadow-[0_20px_80px_rgba(0,0,0,0.9)]"
          style={{ animation: 'float 4s ease-in-out infinite' }}
        />

        <div className="min-h-[100px] flex items-center justify-center">
          <p className="font-crimson text-3xl md:text-5xl text-white/80 italic leading-snug max-w-3xl transition-all duration-700">
            "{typewriterText}"
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setIsAnswering(true)}
            className="group bg-amber-600 hover:bg-amber-500 text-amber-950 px-20 py-7 rounded-full font-cinzel font-black text-2xl md:text-3xl tracking-tight transition-all shadow-[0_0_60px_rgba(217,119,6,0.3)] hover:shadow-[0_0_80px_rgba(217,119,6,0.5)] hover:scale-105 active:scale-95"
          >
            הנח את המצנפת על ראשך
          </button>
          <p className="text-white/15 text-sm font-cinzel uppercase tracking-widest">
            {QUESTIONS.length} שאלות · תוצאה מיידית
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </main>
  );
}
