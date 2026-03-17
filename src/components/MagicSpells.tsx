"use client";

import { useEffect, useState, useRef } from "react";
import { useOwlMail } from "@/components/OwlMail";
import { createClient } from "@/utils/supabase/client";
import { Sparkles } from "lucide-react";

export default function MagicSpells() {
    const { sendOwl } = useOwlMail();
    const supabase = createClient();
    const [isLumosOn, setIsLumosOn] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showHint, setShowHint] = useState(false);
    const [flash, setFlash] = useState(false); // אפקט הבזק לאלוהומורה

    const inputBuffer = useRef("");

    useEffect(() => {
        if (!isLumosOn) return;
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [isLumosOn]);

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

    useEffect(() => {
        const handleAlohomora = async () => {
            if (localStorage.getItem("alohomoraFound")) {
                sendOwl("הדלת כבר פתוחה...", "כבר מצאת את האוצר שבחדר הזה.", "info");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: profile } = await supabase.from("profiles").select("galleons").eq("id", session.user.id).single();
            if (profile) {
                setFlash(true); // מפעיל הבזק
                setTimeout(() => setFlash(false), 500);

                await supabase.from("profiles").update({ galleons: profile.galleons + 50 }).eq("id", session.user.id);
                localStorage.setItem("alohomoraFound", "true");
                sendOwl("אלוהומורה!", "פתחת חדר סודי וזכית ב-50 גליאונים!", "success");
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const key = e.key.toLowerCase();
            if (key.length !== 1) return;

            inputBuffer.current = (inputBuffer.current + key).slice(-10);
            const currentBuffer = inputBuffer.current;

            if (currentBuffer.endsWith("lumos")) {
                setIsLumosOn(true);
                setShowHint(false);
                sendOwl("לומוס מקסימה!", "האור נדלק. הקלד nox כדי לכבות.", "magic");
                inputBuffer.current = "";
            } else if (currentBuffer.endsWith("nox")) {
                setIsLumosOn(false);
                inputBuffer.current = "";
            } else if (currentBuffer.endsWith("alohomora")) {
                handleAlohomora();
                inputBuffer.current = "";
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [sendOwl, supabase]);

    return (
        <>
            {/* הבזק לבן של קסם */}
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

            {/* אפקט הלומוס עם ריצוד */}
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
            `}</style>
        </>
    );
}