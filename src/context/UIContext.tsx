"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from "@/context/AuthContext";

interface UIContextType {
  isMuted: boolean;
  isInitialized: boolean;
  isSiteLocked: boolean;
  toggleMute: () => void;
  banReason: string | null;
  banExpiresAt: string | null;
  banType: 'banned' | 'cooling' | null;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function UIProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSiteLocked, setIsSiteLocked] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [banExpiresAt, setBanExpiresAt] = useState<string | null>(null);
  const [banType, setBanType] = useState<'banned' | 'cooling' | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lumos_isMuted');
    setIsMuted(stored === 'true');
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (profile?.status === 'banned') {
      setIsSiteLocked(true);
      setBanType('banned');
      setBanReason(profile.ban_reason || "הפרת כללי הטירה");
      setBanExpiresAt(null);
    } else if (profile?.status === 'cooling') {
      // בדוק אם תם תוקף חדר הקירור
      if (profile.ban_expires_at && new Date(profile.ban_expires_at) < new Date()) {
        setIsSiteLocked(false);
        setBanType(null);
        setBanReason(null);
        setBanExpiresAt(null);
      } else {
        setIsSiteLocked(true);
        setBanType('cooling');
        setBanReason(profile.ban_reason || "התנהגות שאינה הולמת");
        setBanExpiresAt(profile.ban_expires_at || null);
      }
    } else {
      setIsSiteLocked(false);
      setBanType(null);
      setBanReason(null);
      setBanExpiresAt(null);
    }
  }, [profile]);

  const toggleMute = () => {
    setIsMuted(prev => {
      const newVal = !prev;
      localStorage.setItem('lumos_isMuted', String(newVal));
      return newVal;
    });
  };

  const isCooling = banType === 'cooling';

  return (
    <UIContext.Provider value={{ isMuted, isInitialized, isSiteLocked, toggleMute, banReason, banExpiresAt, banType }}>
      {isSiteLocked ? (
        <div
          dir="rtl"
          style={{
            minHeight: "100vh",
            background: isCooling
              ? "linear-gradient(135deg, #020617 0%, #0a1628 50%, #020617 100%)"
              : "linear-gradient(135deg, #020617 0%, #1a0505 50%, #020617 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "24px",
            fontFamily: "'Assistant', sans-serif",
            position: "fixed",
            inset: 0,
            zIndex: 99999,
          }}
        >
          {/* Ambient glow */}
          <div style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: isCooling
              ? "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(220,38,38,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Icon */}
          <div style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background: isCooling ? "rgba(59,130,246,0.08)" : "rgba(220,38,38,0.08)",
            border: `1px solid ${isCooling ? "rgba(59,130,246,0.3)" : "rgba(220,38,38,0.3)"}`,
            boxShadow: `0 0 60px ${isCooling ? "rgba(59,130,246,0.15)" : "rgba(220,38,38,0.15)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "56px",
            marginBottom: "32px",
          }}>
            {isCooling ? "❄️" : "🔒"}
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "clamp(1.8rem, 5vw, 3rem)",
            fontWeight: 900,
            color: isCooling ? "#60a5fa" : "#ef4444",
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            marginBottom: "12px",
            textShadow: `0 0 40px ${isCooling ? "rgba(96,165,250,0.4)" : "rgba(239,68,68,0.4)"}`,
          }}>
            {isCooling ? "חדר הקירור" : "גורשת מהטירה"}
          </h1>

          <p style={{
            color: "rgba(255,255,255,0.35)",
            fontStyle: "italic",
            fontSize: "1rem",
            maxWidth: "420px",
            lineHeight: 1.6,
            marginBottom: "32px",
          }}>
            {isCooling
              ? "\"צינון זמני הוצא על ידי מועצת הטירה. ניתן לחזור לאחר תום התקופה.\""
              : "\"צו הרחקה רשמי הוצא על ידי משרד הקסמים בעקבות התנהגות שאינה הולמת.\""}
          </p>

          {/* Reason card */}
          <div style={{
            background: isCooling ? "rgba(59,130,246,0.06)" : "rgba(220,38,38,0.06)",
            border: `1px solid ${isCooling ? "rgba(59,130,246,0.2)" : "rgba(220,38,38,0.2)"}`,
            borderRadius: "20px",
            padding: "24px 32px",
            maxWidth: "420px",
            width: "100%",
            marginBottom: "16px",
          }}>
            <p style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "9px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: isCooling ? "rgba(96,165,250,0.6)" : "rgba(239,68,68,0.6)",
              marginBottom: "8px",
            }}>
              סיבת ההרחקה
            </p>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", lineHeight: 1.5 }}>
              {banReason}
            </p>
          </div>

          {/* Expiry / Permanent */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px",
            padding: "14px 24px",
            maxWidth: "420px",
            width: "100%",
            marginBottom: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}>
            {isCooling && banExpiresAt ? (
              <>
                <span style={{ fontSize: "14px" }}>🕐</span>
                <div>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", fontFamily: "'Cinzel', serif", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "2px" }}>שחרור בתאריך</p>
                  <p style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, color: "#60a5fa", fontSize: "0.9rem" }}>
                    {formatDate(banExpiresAt)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <span style={{ fontSize: "14px" }}>♾️</span>
                <div>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", fontFamily: "'Cinzel', serif", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "2px" }}>סוג ההרחקה</p>
                  <p style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, color: "#ef4444", fontSize: "0.9rem" }}>
                    הרחקה קבועה
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Appeal button */}
          <button
            onClick={() => window.location.href = 'mailto:support@lumos-il.co.il'}
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              color: "rgba(255,255,255,0.2)",
              background: "none",
              border: "none",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              paddingBottom: "4px",
              cursor: "pointer",
              transition: "color 0.2s",
              fontFamily: "'Cinzel', serif",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
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
