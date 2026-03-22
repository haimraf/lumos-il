"use client";

import { useEffect, useRef, useCallback } from "react";
import { useUIState } from "@/context/UIContext";

/**
 * LUMOS IL - MAGICAL SOUNDSCAPE V2.6
 * תיקון: ממתין ל-isInitialized לפני הפעלה, כדי לכבד את הגדרת ה-mute מה-localStorage.
 */
export default function BackgroundMusic() {
  const { isMuted, isInitialized } = useUIState();
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeInterval = useRef<NodeJS.Timeout | null>(null);

  const fadeVolume = useCallback((targetVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fadeInterval.current) clearInterval(fadeInterval.current);

    const fadeStep = 0.02;
    const fadeSpeed = 100;

    fadeInterval.current = setInterval(() => {
      if (Math.abs(audio.volume - targetVolume) < fadeStep) {
        audio.volume = targetVolume;
        if (targetVolume === 0) audio.pause();
        if (fadeInterval.current) clearInterval(fadeInterval.current);
      } else {
        audio.volume += audio.volume < targetVolume ? fadeStep : -fadeStep;
      }
    }, fadeSpeed);
  }, []);

  useEffect(() => {
    // ✅ לא עושים כלום עד שה-localStorage נטען
    if (!isInitialized) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      fadeVolume(0);
      return;
    }

    // מנגן רק אם לא מושתק
    audio.play()
      .then(() => fadeVolume(0.25))
      .catch(() => {
        // הדפדפן חסם — ממתינים ללחיצה ראשונה
        const playOnInteraction = () => {
          if (!isMuted) {
            audio.play().then(() => fadeVolume(0.25));
          }
          document.removeEventListener("click", playOnInteraction);
        };
        document.addEventListener("click", playOnInteraction);
      });

    return () => {
      if (fadeInterval.current) clearInterval(fadeInterval.current);
    };
  }, [isMuted, isInitialized, fadeVolume]);

  // Allow gesture-synchronous play trigger from mobile buttons
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleForcePlay = () => {
      audio.play().then(() => fadeVolume(0.25)).catch(() => {});
    };
    window.addEventListener('lumos:play', handleForcePlay);
    return () => window.removeEventListener('lumos:play', handleForcePlay);
  }, [fadeVolume]);

  // השהיה כשהטאב ברקע, חידוש כשחוזרים
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (fadeInterval.current) clearInterval(fadeInterval.current);
        audio.pause();
      } else if (!isMuted) {
        audio.play().then(() => fadeVolume(0.25)).catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isMuted, fadeVolume]);

  return (
    <audio ref={audioRef} loop preload="auto">
      <source src="/hogwarts_theme.mp3" type="audio/mpeg" />
    </audio>
  );
}