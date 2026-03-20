"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Crown } from "lucide-react"; // ✨ תוספת: כתר לבית המוביל

const HOUSES = [
  {
    id: 'Gryffindor',
    name: 'גריפינדור',
    colorFrom: '#7f1d1d',
    colorTo: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.4)',
    textColor: 'text-red-400',
    lineColor: 'bg-red-400'
  },
  {
    id: 'Slytherin',
    name: "סלית'רין",
    colorFrom: '#064e3b',
    colorTo: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
    textColor: 'text-emerald-400',
    lineColor: 'bg-emerald-400'
  },
  {
    id: 'Ravenclaw',
    name: 'רייבנקלו',
    colorFrom: '#1e3a8a',
    colorTo: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.4)',
    textColor: 'text-blue-400',
    lineColor: 'bg-blue-400'
  },
  {
    id: 'Hufflepuff',
    name: 'הפלפאף',
    colorFrom: '#78350f',
    colorTo: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.4)',
    textColor: 'text-amber-400',
    lineColor: 'bg-amber-400'
  },
];

export default function HouseCupLeaderboard() {
  const supabase = createClient();
  const [housePoints, setHousePoints] = useState<Record<string, number>>({
    Gryffindor: 0,
    Slytherin: 0,
    Ravenclaw: 0,
    Hufflepuff: 0,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // ✨ תיקון: הסרת התלות ב-isLoaded כדי למנוע ניתוק וחיבור מחדש של ה-Realtime
  const fetchPoints = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('house, points_contributed');

    if (error || !data) return;

    const points: Record<string, number> = {
      Gryffindor: 0,
      Slytherin: 0,
      Ravenclaw: 0,
      Hufflepuff: 0,
    };

    data.forEach((row) => {
      if (row.house && points[row.house] !== undefined) {
        points[row.house] += row.points_contributed || 0;
      }
    });

    setHousePoints(points);
    setIsLoaded(true); // זה בטוח כאן כי זה לא נמצא ב-dependencies יותר
  }, [supabase]);

  useEffect(() => {
    // טעינה ראשונית
    fetchPoints();

    // הגדרת סנכרון בזמן אמת (Realtime)
    const channel = supabase
      .channel('house_points_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log("שינוי בנקודות זוהה! מעדכן גביע...");
          fetchPoints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchPoints]);

  // חישוב הרף העליון כדי שהמבחנות לא יתפוצצו
  const maxPointsDisplay = Math.max(...Object.values(housePoints), 100);

  // ✨ זיהוי הבית המוביל (בשביל הכתר)
  const actualMaxPoints = Math.max(...Object.values(housePoints));
  const leadingHousePoints = actualMaxPoints > 0 ? actualMaxPoints : -1;

  return (
    <section className="w-full flex flex-col items-center gap-10 py-8" dir="rtl">
      <div className="text-center space-y-3 relative">
        <h2 className="font-cinzel text-3xl md:text-4xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          גביע הבתים
        </h2>
        <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent mx-auto"></div>
        <p className="font-crimson text-sm md:text-base text-white/50 tracking-widest italic">
          הכבוד של הבית שלך נמצא בידיים שלך
        </p>
      </div>

      <div className="flex items-end justify-center gap-4 md:gap-12 lg:gap-16 w-full px-4">
        {HOUSES.map((house) => {
          const points = housePoints[house.id] || 0;
          // מוודאים שיש מינימום 5% גובה כדי שיראו קצת "נוזל" גם אם יש 0 נקודות
          const fillHeight = isLoaded ? Math.max((points / maxPointsDisplay) * 100, 5) : 0;
          const isLeading = points === leadingHousePoints && points > 0;

          return (
            <div key={house.id} className="flex flex-col items-center gap-4 group transition-transform duration-500 hover:-translate-y-2">

              {/* כתר לבית המוביל + ניקוד */}
              <div className="flex flex-col items-center relative min-h-[60px] justify-end pb-2">
                {isLeading && (
                  <Crown size={24} className="text-amber-400 absolute -top-8 animate-bounce drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                )}
                <span className={`font-cinzel text-xl md:text-3xl font-black transition-all duration-1000 ${isLeading ? 'scale-110' : ''} ${house.textColor}`}
                  style={{ textShadow: `0 0 ${isLeading ? '25px' : '15px'} ${house.glow}` }}>
                  {points.toLocaleString()}
                </span>
              </div>

              {/* שעון חול / מבחנה */}
              <div className={`relative w-12 h-56 md:w-16 md:h-72 lg:w-20 lg:h-80 rounded-t-full rounded-b-3xl bg-white/5 border ${isLeading ? 'border-white/30' : 'border-white/10'} shadow-2xl flex items-end overflow-hidden transition-colors duration-500`}>

                {/* אפקט זכוכית (ברק) */}
                <div className="absolute inset-0 opacity-30 pointer-events-none z-20">
                  <div className="absolute top-0 left-[20%] w-[15%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent blur-[1px]"></div>
                </div>

                {/* הנוזל של הנקודות */}
                <div
                  className="w-full relative transition-all duration-[2500ms] ease-in-out"
                  style={{
                    height: `${fillHeight}%`,
                    background: `linear-gradient(to top, ${house.colorFrom}, ${house.colorTo})`,
                    boxShadow: `0 0 ${isLeading ? '40px' : '30px'} ${house.glow}, inset 0 2px 10px rgba(255,255,255,0.4)`
                  }}
                >
                  {/* בועות קסם שעולות למעלה */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
                    <div className="absolute bottom-[10%] left-[25%] w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute bottom-[40%] right-[30%] w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute bottom-[70%] left-[50%] w-2 h-2 bg-white/30 rounded-full animate-pulse" style={{ animationDuration: '2.5s' }}></div>
                  </div>

                  {/* שפת הנוזל המוארת */}
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-white/50 blur-[2px]"></div>
                </div>
              </div>

              {/* שם הבית ופס דקורטיבי */}
              <div className="flex flex-col items-center gap-1.5">
                <span className={`font-cinzel text-[10px] md:text-xs tracking-[0.1em] font-bold uppercase transition-colors ${isLeading ? 'text-white' : 'text-white/60'}`}>
                  {house.name}
                </span>
                <div className={`w-10 h-[2px] ${house.lineColor} ${isLeading ? 'opacity-80 shadow-[0_0_10px_' + house.glow + ']' : 'opacity-30'}`}></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}