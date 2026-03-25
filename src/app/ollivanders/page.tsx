"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { Wand2, Sparkles, ChevronRight, Coins, History, ShieldCheck, Flame, Star, Quote } from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { useAuth } from "@/context/AuthContext";

// --- Wand Database (Lore המבוסס על ספרי הארי פוטר בשפה א-מגדרית) ---
const WOODS_LORE: Record<string, string> = {
  'אלון (Oak)': 'עץ חזק השואף ליציבות. הוא נמשך לכוח רצון יוצא דופן ולאינטואיציה חדה.',
  'צינית (Holly)': 'עץ של הגנה. מתאים לאלו שנועדו למשימות מסוכנות וזקוקים לעזרה בכיבוש דחפים.',
  'עץ זקן (Elder)': 'העץ הנדיר והמסוכן ביותר. נאמנותו עוברת רק לאלו שהביסו את הבעלים הקודמים.',
  'ערבה (Willow)': 'עץ בעל סגולות ריפוי. בוחר לרוב באלו שמסתירים פוטנציאל אדיר מאחורי חוסר ביטחון.',
  'גפן (Vine)': 'השרביט של השואפים לגדולות, אלו שתמיד מפתיעים את הסובבים אותם בעומק מחשבתם.',
  'מהגוני (Mahogany)': 'עץ גמיש ומהיר במיוחד, מצוין ללחשי התמרה (Transfiguration).',
  'ארז (Cedar)': 'מתאים לבעלי תפיסה חדה. אלו ששרביט זה בחר בהם נוטים להיות נאמנים באופן בלתי מתפשר.',
  'עוזרר (Hawthorn)': 'עץ של סתירות. מתאים לאלו שנמצאים בתקופת מעבר או לבעלי טבע מורכב (טוב ורע יחד).',
};

const CORES_LORE: Record<string, string> = {
  'נוצת עוף חול': 'הליבה הנדירה ביותר. שרביטים אלו הם בעלי יוזמה עצמית ולפעמים פועלים מרצונם החופשי.',
  'נימת לב של דרקון': 'מייצרת את השרביטים העוצמתיים ביותר. קלה ללימוד לחשים חדשים אך נוטה לתאונות אם אינה מרוסנת.',
  'שערת חד-קרן': 'מפיקה את הקסם העקבי והטהור ביותר. השרביטים הללו הם הנאמנים ביותר וקשה מאוד להטותם לצד האפל.',
  'שערת זנב של ת\'סטראל': 'ליבה מסתורית המיוחסת ליכולת לשלוט על חיים ומוות. נחשבת לליבה המורכבת ביותר לאילוף.',
};

function generateWandData() {
  const chance = Math.random() * 100;
  const isGregorovitch = chance <= 10; // 10% סיכוי לגרוגורוביץ'

  const woodKeys = Object.keys(WOODS_LORE);
  const coreKeys = Object.keys(CORES_LORE);

  // לוגיקת יצרנים: גרוגורוביץ' נוטה לעצים נדירים וליבות אגרסיביות
  const wood = isGregorovitch ? 'עץ זקן (Elder)' : woodKeys[Math.floor(Math.random() * woodKeys.length)];
  const core = isGregorovitch ? (Math.random() > 0.5 ? 'שערת זנב של ת\'סטראל' : 'נימת לב של דרקון') : coreKeys[Math.floor(Math.random() * coreKeys.length)];

  const length = (Math.random() * (14 - 9.5) + 9.5).toFixed(1);
  const maker = isGregorovitch ? "גרוגורוביץ'" : "אוליבנדר";

  return {
    fullText: `${wood}, ${core}, ${length} אינץ'`,
    wood,
    core,
    maker,
    isGregorovitch
  };
}

export default function OllivandersPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const { sendOwl } = useOwlMail();
  const { profile, session, profileError, isLoading: authLoading, refreshProfile } = useAuth();

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [revealedWand, setRevealedWand] = useState<any>(null);

  const handlePurchase = async () => {
    if (!profile || isPurchasing) return;
    if (profile.galleons < 15) {
      sendOwl("כיס ריק", "חסרים מטבעות גליאון לרכישת שרביט.", "error");
      return;
    }

    setIsPurchasing(true);
    const newWand = generateWandData();

    const { error } = await supabase.rpc('purchase_wand_secure', {
      p_wand_type: `${newWand.maker}: ${newWand.fullText}`,
      p_cost: 15,
    });

    if (!error) {
      setTimeout(() => {
        setRevealedWand(newWand);
        setIsPurchasing(false);
        sendOwl(newWand.isGregorovitch ? "זכייה ביצירת מופת!" : "השרביט בחר בך!", `שרביט תוצרת ${newWand.maker} כעת ברשותך.`, "magic");
        refreshProfile();
      }, 4000);
    } else {
      sendOwl("רכישת שרביט נכשלה", error.message, "error");
      setIsPurchasing(false);
    }
  };

  if (authLoading || (isPurchasing && !revealedWand)) return <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4 bg-[#020617]"><div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin"></div><p className="font-cinzel text-amber-500 tracking-widest animate-pulse">רוקח שיקוי...</p></div>;

  if (session && !profile) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6" dir="rtl">
        <div className="max-w-md w-full rounded-[2rem] border border-amber-500/20 bg-black/30 p-8 text-center space-y-5 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
          <Wand2 className="mx-auto text-amber-500" size={42} />
          <div>
            <h1 className="font-cinzel text-2xl font-black text-white mb-2">החיבור הצליח, אבל הפרופיל עוד לא נטען</h1>
            <p className="font-crimson text-white/55 leading-relaxed">
              {profileError || "אפשר לנסות לרענן את הפרופיל בלי לנתק את החשבון."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => refreshProfile()}
              className="px-5 py-3 rounded-xl bg-amber-500 text-amber-950 font-cinzel font-black text-sm tracking-widest uppercase"
            >
              רענון פרופיל
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="px-5 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 font-cinzel font-black text-sm tracking-widest uppercase transition-all"
            >
              ניתוק בטוח
            </button>
          </div>
        </div>
      </div>
    );
  }

  const wandData = profile?.wand_type || null;
  const currentWand = revealedWand || (wandData ? {
    maker: wandData.split(':')[0].trim(),
    fullText: wandData.split(':')[1]?.trim() || wandData,
    wood: wandData.split(',')[0].replace(/.*: /, '').trim(),
    core: wandData.split(',')[1]?.trim(),
    isGregorovitch: wandData.includes("גרוגורוביץ'")
  } : null);

  return (
    <main className={`min-h-screen relative overflow-hidden pb-20 transition-all duration-1000 ${currentWand?.isGregorovitch ? 'bg-[#0a0505]' : 'bg-[#020617]'}`} dir="rtl">
      {/* Background Aura */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] blur-[150px] opacity-20 ${currentWand?.isGregorovitch ? 'bg-red-900' : 'bg-amber-900'}`}></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-10">
        <header className="flex justify-between items-center mb-16">
          <Link href="/dashboard" className="text-white/40 hover:text-white flex items-center gap-2 font-cinzel text-sm font-bold transition-all"><ChevronRight size={18} /> חזרה לטירה</Link>
          <div className="bg-black/40 border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 backdrop-blur-md">
            <Coins size={16} className="text-amber-500" /><span className="text-amber-200 font-bold font-cinzel tracking-wider">{profile?.galleons} גליאונים</span>
          </div>
        </header>

        <div className="text-center mb-12 space-y-2">
          <h1 className="font-cinzel text-5xl md:text-7xl font-black text-white drop-shadow-2xl">
            {currentWand?.isGregorovitch ? 'גרוגורוביץ\'' : 'אוליבנדר'} <span className="text-amber-500">IL</span>
          </h1>
          <p className="font-crimson text-xl text-white/40 tracking-[0.2em] italic">
            {currentWand?.isGregorovitch ? 'שרביטים עוצמתיים ונדירים מהמזרח' : 'יצרני שרביטים משובחים משנת 382 לפנה"ס'}
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className={`rounded-[3.5rem] p-10 md:p-16 border backdrop-blur-3xl shadow-2xl relative overflow-hidden transition-all duration-700 ${currentWand?.isGregorovitch ? 'bg-zinc-900/60 border-red-900/30' : 'bg-zinc-950/60 border-white/5'}`}>

            {currentWand ? (
              <div className="relative z-10 flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="relative">
                  <div className={`absolute inset-0 blur-[60px] rounded-full animate-pulse ${currentWand.isGregorovitch ? 'bg-red-600/30' : 'bg-amber-500/20'}`}></div>
                  <div className={`relative p-10 rounded-full border bg-black/40 ${currentWand.isGregorovitch ? 'border-red-500/40' : 'border-amber-500/20'}`}>
                    <Wand2 size={80} className={`rotate-45 ${currentWand.isGregorovitch ? 'text-red-500' : 'text-amber-500'}`} />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className={`font-cinzel text-xs tracking-[0.5em] uppercase font-bold ${currentWand.isGregorovitch ? 'text-red-400' : 'text-amber-500/60'}`}>
                    השרביט נבחר על ידי {currentWand.maker}
                  </span>
                  <h2 className="font-crimson text-4xl md:text-5xl font-black text-white leading-tight">
                    {currentWand.fullText}
                  </h2>
                </div>

                {/* Lore Sections - הסברים מהספרים */}
                <div className="grid grid-cols-1 gap-6 w-full text-right mt-8 border-t border-white/10 pt-8">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-xl h-fit ${currentWand.isGregorovitch ? 'bg-red-500/10' : 'bg-amber-500/10'}`}><ShieldCheck size={20} className={currentWand.isGregorovitch ? 'text-red-400' : 'text-amber-400'} /></div>
                    <div>
                      <h4 className="font-cinzel text-sm font-bold text-white mb-1">סוד העץ: {currentWand.wood}</h4>
                      <p className="font-crimson text-lg text-white/50 leading-relaxed">{WOODS_LORE[currentWand.wood] || 'עץ נדיר שנבחר בקפידה עבור בעליו החדשים.'}</p>
                    </div>
                  </div>
                  {currentWand.core && (
                    <div className="flex gap-4">
                      <div className={`p-3 rounded-xl h-fit ${currentWand.isGregorovitch ? 'bg-red-500/10' : 'bg-amber-500/10'}`}><Flame size={20} className={currentWand.isGregorovitch ? 'text-red-400' : 'text-amber-400'} /></div>
                      <div>
                        <h4 className="font-cinzel text-sm font-bold text-white mb-1">כוח הליבה: {currentWand.core}</h4>
                        <p className="font-crimson text-lg text-white/50 leading-relaxed">{CORES_LORE[currentWand.core] || 'ליבה עוצמתית המעניקה יכולות קסם ייחודיות.'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Link href="/dashboard" className="mt-8 bg-white text-black px-12 py-5 rounded-full font-cinzel font-bold hover:bg-amber-500 transition-all shadow-xl active:scale-95">חזרה לחדר המועדון</Link>
              </div>
            ) : (
              /* מצב רכישה */
              <div className="flex flex-col items-center text-center space-y-10">
                <div className="space-y-4">
                  <h2 className="font-cinzel text-3xl md:text-5xl font-bold text-white">הטקס מתחיל</h2>
                  <p className="font-crimson text-xl text-white/50 max-w-sm mx-auto">השרביט אינו רק כלי, הוא הרחבה של הנשמה. אפשרו לקסם להחליט.</p>
                </div>

                {isPurchasing ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(245,158,11,0.2)]"></div>
                    <p className="font-cinzel text-amber-500 animate-pulse tracking-[0.3em] font-bold">השרביט בוחן את עברך...</p>
                  </div>
                ) : (
                  <div className="space-y-6 w-full">
                    <button onClick={handlePurchase} className="group relative w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-amber-950 px-16 py-7 rounded-2xl font-cinzel font-black text-2xl tracking-widest shadow-2xl transition-all overflow-hidden active:scale-95">
                      <span className="relative z-10 flex items-center gap-4">רכישת שרביט (15 ג') <Sparkles size={24} /></span>
                      <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </button>
                    <p className="text-[10px] font-cinzel text-white/20 uppercase tracking-[0.5em]">השרביט בוחר את בעליו</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
