"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

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

  // פונקציית שליפת הנתונים - הוצאנו אותה החוצה כדי שנוכל לקרוא לה גם בזמן אמת
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
    if (!isLoaded) setIsLoaded(true);
  }, [supabase, isLoaded]);

  useEffect(() => {
    // טעינה ראשונית
    fetchPoints();

    // הגדרת סנכרון בזמן אמת (Realtime)
    // בכל פעם שפרופיל מתעדכן (מישהו מקבל נקודות), המערכת תרענן את הגביע
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

  const maxPoints = Math.max(...Object.values(housePoints), 100);

  return (
    <section className="w-full flex flex-col items-center gap-10 py-6" dir="rtl">
      <div className="text-center space-y-2">
        <h2 className="font-cinzel text-2xl md:text-3xl font-bold tracking-[0.3em] text-white uppercase">
          גביע הבתים
        </h2>
        <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto"></div>
        <p className="font-crimson text-sm text-white/40 tracking-widest italic">
          הכבוד של הבית שלך בידיים שלך
        </p>
      </div>

      <div className="flex items-end justify-center gap-4 md:gap-12 lg:gap-16 w-full px-4">
        {HOUSES.map((house) => {
          const points = housePoints[house.id] || 0;
          const fillHeight = isLoaded ? Math.max((points / maxPoints) * 100, 5) : 0;

          return (
            <div key={house.id} className="flex flex-col items-center gap-4 group">
              <div className="flex flex-col items-center">
                <span className={`font-cinzel text-xl md:text-2xl font-black transition-all duration-700 ${house.textColor}`}
                  style={{ textShadow: `0 0 15px ${house.glow}` }}>
                  {points.toLocaleString()}
                </span>
              </div>

              <div className="relative w-12 h-56 md:w-16 md:h-72 lg:w-20 lg:h-80 rounded-t-full rounded-b-3xl bg-white/5 border border-white/10 shadow-2xl flex items-end overflow-hidden">
                {/* אפקט זכוכית */}
                <div className="absolute inset-0 opacity-20 pointer-events-none z-20">
                  <div className="absolute top-0 left-1/4 w-[2px] h-full bg-white/30 blur-[1px]"></div>
                </div>

                {/* הנוזל/החול של הנקודות */}
                <div
                  className="w-full relative transition-all duration-[2500ms] cubic-bezier(0.4, 0, 0.2, 1)"
                  style={{
                    height: `${fillHeight}%`,
                    background: `linear-gradient(to top, ${house.colorFrom}, ${house.colorTo})`,
                    boxShadow: `0 0 30px ${house.glow}, inset 0 2px 10px rgba(255,255,255,0.3)`
                  }}
                >
                  {/* בועות קסם */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute bottom-[20%] left-[20%] w-1 h-1 bg-white/40 rounded-full animate-pulse"></div>
                    <div className="absolute bottom-[50%] right-[30%] w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce"></div>
                  </div>

                  {/* המפלס העליון */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/40 blur-[2px]"></div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="font-cinzel text-[10px] md:text-xs tracking-[0.1em] font-bold text-white/60 uppercase">
                  {house.name}
                </span>
                <div className={`w-8 h-[2px] ${house.lineColor} opacity-30`}></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}