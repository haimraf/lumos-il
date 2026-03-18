"use client";

import { useEffect, useRef } from "react";
import { useUIState } from "@/context/UIContext";

export default function BackgroundMusic() {
  const { isMuted } = useUIState();
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeInterval = useRef<any>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // ניקוי טיימרים ישנים
    if (fadeInterval.current) {
      clearInterval(fadeInterval.current);
    }

    if (!isMuted) {
      // מתחילים מווליום אפס כדי לעשות Fade-in עדין
      audio.volume = 0;

      audio.play().then(() => {
        const targetVolume = 0.25; // היעד: 25% ווליום
        const fadeStep = 0.02;     // קפיצות הווליום
        const fadeSpeed = 150;     // מהירות הקפיצה (במילישניות)

        // פונקציית הפייד-אין
        fadeInterval.current = setInterval(() => {
          if (audio.volume < targetVolume) {
            // מוודאים שלא נעבור את היעד עקב עיגול מספרים
            audio.volume = Math.min(audio.volume + fadeStep, targetVolume);
          } else {
            clearInterval(fadeInterval.current);
          }
        }, fadeSpeed);

      }).catch(() => {
        console.log("Browser blocked autoplay. Waiting for user interaction to cast the spell.");
      });
    } else {
      // אם הושתק - עוצרים מיד (אפשר גם לעשות Fade-out בעתיד אם תרצה)
      audio.pause();
    }

    // ניקוי בעת יציאה מהקומפוננטה
    return () => {
      if (fadeInterval.current) clearInterval(fadeInterval.current);
    };
  }, [isMuted]);

  return (
    <audio ref={audioRef} loop>
      <source src="/hogwarts_theme.mp3" type="audio/mpeg" />
    </audio>
  );
}