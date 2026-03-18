"use client";

import { useEffect, useState, useRef } from "react";
import { useOwlMail } from "@/components/OwlMail";
import { createClient } from "@/utils/supabase/client";
import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MagicSpells() {
    const { sendOwl } = useOwlMail();
    const supabase = createClient();
    const router = useRouter();

    const [isLumosOn, setIsLumosOn] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showHint, setShowHint] = useState(false);
    const [flash, setFlash] = useState(false); // אפקט הבזק לאלוהומורה

    // מצב חדש עבור לחש השליטה (Imperio) במקום Accio
    const [isImperioActive, setIsImperioActive] = useState(false);

    const inputBuffer = useRef("");

    // מעקב אחרי העכבר כשהאור דולק
    useEffect(() => {
        if (!isLumosOn) return;
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [isLumosOn]);

    // רמז קולנועי ללומוס
    useEffect(() => {
        const hintTimer = setTimeout(() => {
            if (!localStorage.getItem("lumosHintSeen")) {
                setShowHint(true);
                localStorage.setItem("lumosHintSeen", "true");
                setTimeout(() => setShowHint(false), 7000);
            }
        }, 15000);
        return () => clearTimeout(hintTimer);
    }, []);

    // מנוע זיהוי הלחשים
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // התעלמות אם המשתמש מקליד בתוך שדה טקסט רגיל באתר
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const key = e.key.toLowerCase();
            if (key.length !== 1 && key !== "backspace") return;

            inputBuffer.current = (inputBuffer.current + key).slice(-15);
            const currentBuffer = inputBuffer.current;

            if (currentBuffer.endsWith("lumos")) {
                setIsLumosOn(true);
                setShowHint(false);
                sendOwl("לומוס מקסימה!", "האור נדלק. הקלד nox כדי לכבות.", "magic");
                inputBuffer.current = "";
            }
            else if (currentBuffer.endsWith("nox")) {
                setIsLumosOn(false);
                sendOwl("נוקס.", "האור כבה.", "info");
                inputBuffer.current = "";
            }
            else if (currentBuffer.endsWith("alohomora")) {
                setFlash(true);
                setTimeout(() => setFlash(false), 500);

                // יריית פקודת קסם שההאדר יאזין לה ויפתח את התפריט
                window.dispatchEvent(new CustomEvent("magic-alohomora"));
                sendOwl("אלוהומורה!", "המנעול נפתח...", "magic");

                inputBuffer.current = "";
            }
            else if (currentBuffer.endsWith("imperio")) {
                if (isImperioActive) return; // מונע הפעלה כפולה

                setIsImperioActive(true);
                sendOwl("אימפריו!", "אתה שולט כעת במרחב...", "magic");

                // מפעיל רעידת אדמה קטנה על כל האתר
                document.body.classList.add("animate-imperio-chaos");

                // מפסיק את הכאוס אחרי 3 שניות
                setTimeout(() => {
                    document.body.classList.remove("animate-imperio-chaos");
                    setIsImperioActive(false);
                }, 3000);

                inputBuffer.current = "";
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [sendOwl, isImperioActive]);

    return (
        <>
            {/* הבזק לבן לאלוהומורה */}
            {flash && <div className="fixed inset-0 z-[10001] bg-white animate-out fade-out duration-500 pointer-events-none" />}

            {/* הרמז הקולנועי */}
            <div className={`fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center transition-all duration-1000 ${showHint ? "opacity-100 bg-black/40 backdrop-blur-sm" : "opacity-0"}`}>
                {showHint && (
                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-1000">
                        <Sparkles className="text-amber-400 mx-auto animate-pulse" size={40} />
                        <h2 className="font-cinzel text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                            הקירות מקשיבים...
                        </h2>
                        <p className="font-crimson text-2xl md:text-3xl text-white/90 italic">
                            נסה להקליד <kbd className="font-sans font-bold text-amber-300 mx-2 tracking-widest">LUMOS</kbd>
                        </p>
                    </div>
                )}
            </div>

            {/* אפקט הלומוס */}
            {isLumosOn && (
                <div
                    className="fixed inset-0 z-[9998] pointer-events-none transition-opacity duration-700 animate-pulse-subtle"
                    style={{
                        background: `radial-gradient(circle 280px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, rgba(0,0,0,0.96) 100%)`
                    }}
                />
            )}

            <style jsx global>{`
                @keyframes pulse-subtle {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.97; }
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 3s infinite ease-in-out;
                }
                
                /* אפקט הכאוס של לחש האימפריו */
                @keyframes imperio-chaos {
                    0% { filter: hue-rotate(0deg) contrast(1); transform: scale(1) translate(0, 0); }
                    25% { filter: hue-rotate(90deg) contrast(1.2); transform: scale(1.02) translate(-2px, 2px); }
                    50% { filter: hue-rotate(180deg) contrast(1.5); transform: scale(0.98) translate(2px, -2px); }
                    75% { filter: hue-rotate(270deg) contrast(1.2); transform: scale(1.01) translate(-1px, 1px); }
                    100% { filter: hue-rotate(360deg) contrast(1); transform: scale(1) translate(0, 0); }
                }
                .animate-imperio-chaos {
                    animation: imperio-chaos 0.5s infinite;
                    pointer-events: none; /* מונע לחיצות בטעות בזמן הכאוס */
                }
            `}</style>
        </>
    );
}