"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * LUMOS IL - HOUSE CUP LEADERBOARD V6.2
 * שדרוג: תמיכה בנגישות, תיקון עקומות אנימציה, ותיקון באג הקווים התחתונים (Tailwind Static Scan).
 */

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

  useEffect(() => {
    const fetchPoints = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('house, points_contributed');

      if (error || !data) {
        setIsLoaded(true);
        return;
      }

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
      // השהייה קלה כדי שהאנימציה של מילוי המבחנות תקרה אחרי הטעינה
      setTimeout(() => setIsLoaded(true), 200);
    };

    fetchPoints();
  }, [supabase]);

  // חישוב המקסימום כדי לנרמל את גובה המבחנות (מינימום 100 כדי שהמבחנה לא תהיה ריקה לגמרי בהתחלה)
  const maxPoints = Math.max(...Object.values(housePoints), 100);

  return (
    <section className="w-full flex flex-col items-center gap-10 py-6" aria-labelledby="house-cup-title">

      {/* כותרת הגביע */}
      <div className="text-center space-y-2">
        <h2 id="house-cup-title" className="font-cinzel text-2xl md:text-3xl font-bold tracking-[0.3em] text-white uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          גביע הבתים
        </h2>
        <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto"></div>
        <p className="font-crimson text-sm text-white/40 tracking-widest italic">
          הכבוד של הבית שלך בידיים שלך
        </p>
      </div>

      {/* מבנה המבחנות (Hourglasses) */}
      <div className="flex items-end justify-center gap-6 md:gap-12 lg:gap-16 w-full px-4">
        {HOUSES.map((house) => {
          const points = housePoints[house.id] || 0;
          // חישוב גובה: מינימום 5% (שיראו קצת צבע) מקסימום 100%
          const fillHeight = isLoaded ? Math.max((points / maxPoints) * 100, 5) : 0;

          return (
            <div key={house.id} className="flex flex-col items-center gap-4 group">

              {/* מספר הנקודות - בולט וזוהר */}
              <div className="flex flex-col items-center">
                <span className={`font-cinzel text-xl md:text-2xl font-black transition-all duration-500 group-hover:scale-110 ${house.textColor}`}
                  style={{ textShadow: `0 0 15px ${house.glow}` }}>
                  {points.toLocaleString()}
                </span>
              </div>

              {/* המבחנה עצמה (מונגשת לקוראי מסך) */}
              <div
                role="progressbar"
                aria-label={`נקודות גביע הבתים עבור ${house.name}`}
                aria-valuenow={points}
                aria-valuemin={0}
                aria-valuemax={maxPoints}
                className="relative w-12 h-56 md:w-16 md:h-72 lg:w-20 lg:h-80 rounded-t-full rounded-b-3xl glass-panel shadow-2xl flex items-end overflow-hidden group/tube"
              >

                {/* אפקט השתקפות על הזכוכית */}
                <div className="absolute inset-0 opacity-20 pointer-events-none z-20">
                  <div className="absolute top-0 left-1/4 w-[2px] h-full bg-white/30 blur-[1px]"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer"></div>
                </div>

                {/* הנוזל הקסום */}
                <div
                  className="w-full relative transition-all duration-[2000ms] ease-out"
                  style={{
                    height: `${fillHeight}%`,
                    background: `linear-gradient(to top, ${house.colorFrom}, ${house.colorTo})`,
                    boxShadow: `0 0 30px ${house.glow}, inset 0 2px 10px rgba(255,255,255,0.2)`
                  }}
                >
                  {/* בועות צפות בתוך הנוזל */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-[10%] left-[20%] w-1.5 h-1.5 bg-white/20 rounded-full animate-float opacity-50"></div>
                    <div className="absolute bottom-[40%] right-[30%] w-1 h-1 bg-white/30 rounded-full animate-float opacity-40" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute bottom-[70%] left-[40%] w-0.5 h-0.5 bg-white/40 rounded-full animate-float opacity-60" style={{ animationDelay: '2s' }}></div>
                  </div>

                  {/* המשטח העליון של הנוזל - זוהר ופועם */}
                  <div className="absolute top-0 left-0 w-full h-1">
                    <div className="absolute inset-0 blur-[4px] animate-pulse-slow" style={{ backgroundColor: house.colorTo }}></div>
                    <div className="absolute inset-0 bg-white/30"></div>
                  </div>
                </div>

                {/* עיטורים בקצוות (Top & Bottom Caps) */}
                <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-white/10 to-transparent z-10"></div>
                <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-black/40 to-transparent z-10"></div>
              </div>

              {/* שם הבית */}
              <div className="flex flex-col items-center gap-1">
                <span className="font-cinzel text-[10px] md:text-xs tracking-[0.2em] font-bold text-white/60 uppercase group-hover:text-white transition-colors">
                  {house.name}
                </span>
                <div className={`w-0 h-[1px] ${house.lineColor} transition-all duration-500 group-hover:w-full opacity-50`}></div>
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
}