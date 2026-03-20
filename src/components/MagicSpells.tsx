"use client";

import { useEffect, useState, useRef } from "react";
import { useOwlMail } from "@/components/OwlMail";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * LUMOS IL - GLOBAL MAGIC ENGINE V2.8 (The Open Gates Update)
 * הוספת "קסמי בסיס" (לומוס/נוקס) שעובדים לכולם כולל אורחים, 
 * בזמן ששאר הקסמים דורשים חיבור ולימוד.
 */

export default function MagicSpells() {
    const { sendOwl } = useOwlMail();
    const { profile } = useAuth();
    const supabase = createClient();

    const [isLumosOn, setIsLumosOn] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [flash, setFlash] = useState(false);
    const [isMischiefManaged, setIsMischiefManaged] = useState(false);

    const inputBuffer = useRef("");

    // שומרים את כל המידע הדינמי ברפרנסים כדי לא לשבור את ה-useEffect
    const allSpellsRef = useRef<any[]>([]);
    const profileRef = useRef<any>(null);
    const sendOwlRef = useRef(sendOwl);

    // עדכון הרפרנסים תמיד לגרסה האחרונה
    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    useEffect(() => {
        sendOwlRef.current = sendOwl;
    }, [sendOwl]);

    // משיכת הלחשים המלאים מהדאטהבייס ושמירתם
    useEffect(() => {
        const fetchAllSpells = async () => {
            const { data } = await supabase.from('spells').select('id, terminal_command');
            if (data) allSpellsRef.current = data;
        };
        fetchAllSpells();
    }, [supabase]);

    // מעקב אחרי העכבר כשהפנס דולק
    useEffect(() => {
        if (!isLumosOn) return;
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [isLumosOn]);

    // מנוע המקלדת המרכזי
    useEffect(() => {
        const hasLearnedCommand = (command: string) => {
            const currentProfile = profileRef.current;
            const currentSpells = allSpellsRef.current;
            const cmdLower = command.toLowerCase();

            // ✨ חוק 1: קסמי בסיס - חינם ועובדים לכולם, גם לאורחים מנותקים!
            if (cmdLower === 'lumos' || cmdLower === 'nox') {
                return true;
            }

            // ✨ חוק 2: אם המשתמש מנותק וניסה קסם מתקדם - חסום אותו
            if (!currentProfile) {
                return false;
            }

            // ✨ חוק 3: מנהלים יכולים להטיל כל קסם
            if (currentProfile.role === 'מנהל' || currentProfile.role?.toLowerCase() === 'admin') {
                return true;
            }

            // ✨ חוק 4: בדיקה רגילה מול הדאטהבייס האם השחקן למד את הקסם
            const spell = currentSpells.find(s => s.terminal_command === cmdLower);
            if (!spell) return false;

            return currentProfile.learned_spells?.includes(spell.id) || false;
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const key = e.key.toLowerCase();
            inputBuffer.current = (inputBuffer.current + key).slice(-30);
            const currentBuffer = inputBuffer.current;

            // לומוס (אור)
            if (currentBuffer.endsWith("lumos") || currentBuffer.endsWith("ךהמםד")) {
                if (hasLearnedCommand("lumos")) {
                    setIsLumosOn(true);
                    sendOwlRef.current("לומוס מקסימה!", "האור נדלק.", "magic");
                } else {
                    sendOwlRef.current("ניסיון כושל", "אינך מכיר את הלחש הזה עדיין...", "error");
                }
                inputBuffer.current = "";
            }
            // נוקס (כיבוי)
            else if (currentBuffer.endsWith("nox") || currentBuffer.endsWith("מםס")) {
                if (hasLearnedCommand("nox")) {
                    setIsLumosOn(false);
                    sendOwlRef.current("נוקס.", "האור כבה.", "info");
                } else {
                    sendOwlRef.current("ניסיון כושל", "אינך מכיר את לחש הכיבוי...", "error");
                }
                inputBuffer.current = "";
            }
            // אלוהומורה (פתיחת מנעולים / תפריט)
            else if (currentBuffer.endsWith("alohomora") || currentBuffer.endsWith("שךחהםצםמש")) {
                if (hasLearnedCommand("alohomora")) {
                    setFlash(true);
                    setTimeout(() => setFlash(false), 500);
                    window.dispatchEvent(new CustomEvent("magic-alohomora"));
                    sendOwlRef.current("אלוהומורה!", "המנעול נפרץ...", "magic");
                } else {
                    // טיזר מעולה לשחקנים מנותקים שניסו להקליד אלוהומורה!
                    sendOwlRef.current("המנעול חסום", "עליך להירשם וללמוד את לחש הפתיחה קודם לכן.", "error");
                }
                inputBuffer.current = "";
            }
            // תם ונשלם הקונדס (יציאה)
            else if (currentBuffer.endsWith("תם ונשלם הקונדס")) {
                setIsMischiefManaged(true);
                setTimeout(async () => {
                    const sb = createClient();
                    await sb.auth.signOut();
                    window.location.href = "/";
                }, 2500);
                inputBuffer.current = "";
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <>
            {isMischiefManaged && (
                <div className="fixed inset-0 z-[30000] pointer-events-auto flex flex-col items-center justify-center">
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-[#1a1a1a] border-b-4 border-amber-900/50 animate-parchment-top flex items-end justify-center pb-10 shadow-2xl">
                        <div className="text-amber-500 font-cinzel text-2xl md:text-4xl animate-pulse tracking-[0.5em]">תם ונשלם הקונדס...</div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[#1a1a1a] border-t-4 border-amber-900/50 animate-parchment-bottom flex items-start justify-center pt-10 shadow-2xl">
                        <div className="text-amber-500/50 text-sm font-crimson italic">הטירה ננעלת. נתראה בקרוב.</div>
                    </div>
                </div>
            )}

            {flash && <div className="fixed inset-0 z-[10001] bg-white animate-out fade-out duration-500 pointer-events-none" />}

            {isLumosOn && (
                <div
                    className="fixed inset-0 z-[9998] pointer-events-none transition-opacity duration-700"
                    style={{
                        background: `radial-gradient(circle 280px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, rgba(0,0,0,0.96) 100%)`
                    }}
                />
            )}

            <style jsx global>{`
                @keyframes parchment-top { 0% { transform: translateY(-100%); } 100% { transform: translateY(0); } }
                @keyframes parchment-bottom { 0% { transform: translateY(100%); } 100% { transform: translateY(0); } }
                .animate-parchment-top { animation: parchment-top 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
                .animate-parchment-bottom { animation: parchment-bottom 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
            `}</style>
        </>
    );
}