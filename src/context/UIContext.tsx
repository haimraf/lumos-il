"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from "@/context/AuthContext"; // חייב לוודא שהנתיב נכון

/**
 * LUMOS IL - GLOBAL UI & ACCESS CONTEXT
 * מנהל הגדרות תצוגה, סאונד, ומערכת חסימה אוטומטית.
 */

interface UIContextType {
  isMuted: boolean;
  isInitialized: boolean;
  isSiteLocked: boolean;
  toggleMute: () => void;
  banReason: string | null;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth(); // מושכים את הפרופיל ישירות
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSiteLocked, setIsSiteLocked] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);

  // 🔊 טעינת הגדרות סאונד
  useEffect(() => {
    const stored = localStorage.getItem('lumos_isMuted');
    setIsMuted(stored === 'true');
    setIsInitialized(true);
  }, []);

  // 🛡️ חיישן חסימה אוטומטי
  useEffect(() => {
    if (profile?.status === 'banned') {
      setIsSiteLocked(true);
      setBanReason(profile.ban_reason || "הפרת כללי הטירה");
    } else {
      setIsSiteLocked(false);
      setBanReason(null);
    }
  }, [profile]);

  const toggleMute = () => {
    setIsMuted(prev => {
      const newVal = !prev;
      localStorage.setItem('lumos_isMuted', String(newVal));
      return newVal;
    });
  };

  return (
    <UIContext.Provider value={{ isMuted, isInitialized, isSiteLocked, toggleMute, banReason }}>
      {isSiteLocked ? (
        /* --- דף חסימה מעוצב --- */
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-center p-6 space-y-8 font-assistant" dir="rtl">
          <div className="relative">
            <div className="w-32 h-32 bg-red-600/10 rounded-full flex items-center justify-center border border-red-600/40 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
              <span className="text-6xl animate-pulse">🔒</span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-cinzel text-5xl font-black text-red-500 tracking-tighter uppercase">גורשת מהטירה</h1>
            <p className="text-white/40 italic text-lg max-w-md mx-auto">
              "צו הרחקה רשמי הוצא על ידי משרד הקסמים בעקבות התנהגות שאינה הולמת את רוח לומוס IL."
            </p>
          </div>

          <div className="glass-panel p-6 rounded-[2rem] border border-red-500/20 bg-red-950/10 max-w-sm w-full">
            <p className="text-red-400 text-sm font-bold mb-1 uppercase tracking-widest">סיבת ההרחקה:</p>
            <p className="text-white/80">{banReason}</p>
          </div>

          <button
            onClick={() => window.location.href = 'mailto:support@lumos.il'}
            className="text-[10px] uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all border-b border-white/5 pb-1"
          >
            ערעור למשרד הקסמים
          </button>
        </div>
      ) : (
        children
      )}
    </UIContext.Provider>
  );
}

export function useUIState() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIProvider');
  }
  return context;
}