"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { HandHeart, Gift, Lightbulb, Moon, Sun, Quote, Star } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

/**
 * LUMOS IL - HOUSE ELF HELPER V2.0
 * שדרוג: ציטוטים אייקוניים באנגלית ודיאלוגים מותאמים לקהילה.
 */

const QUOTES = [
    // ✅ ציטוטים אייקוניים באנגלית (קצרים ולעניין)
    "Dobby has no master!",
    "Dobby is a free elf!",
    "Master has given Dobby a sock.",
    "Harry Potter must be safe!",
    "Dobby is only trying to help.",
    "Dobby has heard of your greatness, sir!",
    // ✅ עברית - בסגנון "דובי" קלאסי
    "דובי שמח שאתה פה, אדוני קוסם!",
    "אדוני נתן לדובי גרב? דובי חופשי!",
    "דובי בדק - אין סוהרסנים במסדרון היום.",
    "דובי אוהב את לומוס IL כמעט כמו גרביים.",
    "אל תדאגו, דובי שומר על השרתים של הטירה.",
    "כאן כולם חופשיים, אמר דובי בשקט.",
    "דובי מכין לכם תה קסום, רק אל תגלו לפינץ'."
];

const TIPS = [
    "💡 הקלידו LUMOS כדי להאיר את הדרך!",
    "💡 בנביא היומי מחכים לכם גליאונים על כל תגובה.",
    "💡 גביע הבתים צמוד! כל נקודה קובעת.",
    "💡 בספרייה מחכים פרקים חדשים מהספרים.",
    "💡 לחצו על המטבעות כדי לראות את הכספת שלכם."
];

function getSeasonalMessage(): string | null {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    if (month === 10 && day >= 29) return "🎃 דובי מפחד מהדלועים המעופפים הלילה...";
    if (month === 12 && day >= 24 && day <= 26) return "🎄 חג קסום! דובי קיבל גרב עם נצנצים!";
    if (month === 2 && day === 14) return "💝 דובי אוהב את כולם... במיוחד מי שנותן לו גרביים.";
    return null;
}

export default function HouseElfHelper() {
    const [isBubbleVisible, setIsBubbleVisible] = useState(false);
    const [fullMessage, setFullMessage] = useState("");
    const [displayedText, setDisplayedText] = useState("");
    const [msgType, setMsgType] = useState<'quote' | 'tip' | 'time' | 'free' | 'seasonal'>('quote');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isFree, setIsFree] = useState(false);

    const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const soundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const autoHideRef = useRef<NodeJS.Timeout | null>(null);

    const currentHour = new Date().getHours();
    const supabase = createClient();

    useEffect(() => {
        let isMounted = true;
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id && isMounted) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                if (profile?.role === 'מנהל' && isMounted) setIsAdmin(true);
            }
        };
        checkAdmin();
        return () => { isMounted = false; };
    }, [supabase]);

    const pickMessage = useCallback(() => {
        const rand = Math.random();
        if (soundTimeoutRef.current) clearTimeout(soundTimeoutRef.current);

        const seasonal = getSeasonalMessage();
        if (seasonal && rand < 0.15) { setMsgType('seasonal'); setFullMessage(seasonal); return; }

        // 🧦 ה-Easter Egg של הגרב
        if (rand < 0.08) {
            setIsFree(true);
            setMsgType('free');
            setFullMessage("MASTER HAS GIVEN DOBBY A SOCK! DOBBY IS FREE!!!");
            try { const a = new Audio('/sounds/dobby-free.mp3'); a.volume = 0.4; a.play().catch(() => { }); } catch { }
            soundTimeoutRef.current = setTimeout(() => setIsFree(false), 6000);
            return;
        }

        if (rand < 0.25) {
            setMsgType('time');
            if (currentHour >= 5 && currentHour < 12) setFullMessage("בוקר טוב! דובי כבר צחצח את הגביעים בלובי.");
            else if (currentHour >= 21 || currentHour < 5) setFullMessage("כבר מאוחר... אדוני צריך לנוח מהקסמים.");
            else setFullMessage("יום קסום! דובי פה אם תצטרכו עזרה.");
            return;
        }

        if (rand < 0.5) {
            setMsgType('tip');
            setFullMessage(TIPS[Math.floor(Math.random() * TIPS.length)]);
            return;
        }

        setMsgType('quote');
        const adminExtra = isAdmin ? ["הכל פועל כשורה, אדון מנהל!", "דובי חסם את הטרולים היום!"] : [];
        const all = [...QUOTES, ...adminExtra];
        setFullMessage(all[Math.floor(Math.random() * all.length)]);
    }, [isAdmin, currentHour]);

    useEffect(() => {
        if (isBubbleVisible) {
            let i = 0;
            setDisplayedText("");
            if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = setInterval(() => {
                if (i <= fullMessage.length) { setDisplayedText(fullMessage.slice(0, i)); i++; }
                else clearInterval(typingIntervalRef.current!);
            }, 30);
        }
        return () => { if (typingIntervalRef.current) clearInterval(typingIntervalRef.current); };
    }, [isBubbleVisible, fullMessage]);

    const toggleBubble = () => {
        if (!isBubbleVisible) pickMessage();
        setIsBubbleVisible(!isBubbleVisible);
        if (autoHideRef.current) clearTimeout(autoHideRef.current);
        if (!isBubbleVisible) autoHideRef.current = setTimeout(() => setIsBubbleVisible(false), 9000);
    };

    return (
        <div className="hidden md:block fixed bottom-6 right-6 z-[10002]" dir="rtl">
            {/* בועת דיבור - LUMOS IL FINAL FIX V2.0 */}
            {isBubbleVisible && (
                <div
                    className={`absolute bottom-20 md:bottom-24 right-0 w-56 sm:w-72 md:w-80 shrink-0 bg-[#020617]/95 text-[#f8fafc] p-5 rounded-[2.5rem] border-2 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 origin-bottom-right
            ${isFree ? 'border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.4)]'
                            : msgType === 'seasonal' ? 'border-purple-500'
                                : 'border-amber-700/50'}`}
                    style={{ minWidth: '220px' }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        {msgType === 'free' && <Gift className="text-green-400 animate-bounce" size={14} />}
                        {msgType === 'tip' && <Lightbulb className="text-amber-400" size={14} />}
                        {msgType === 'quote' && <Quote className="text-blue-400" size={14} />}
                        <span className={`font-cinzel text-[10px] font-black tracking-widest uppercase
                ${isFree ? 'text-green-400' : 'text-amber-500/80'}`}>
                            {isFree ? 'DOBBY IS FREE!' : 'דובי אומר'}
                        </span>
                    </div>

                    <p
                        dir="auto"
                        className={`font-crimson text-sm md:text-xl leading-relaxed italic text-white/95 whitespace-pre-wrap ${isFree ? 'font-bold uppercase text-green-50' : ''}`}
                    >
                        "{displayedText}"
                        <span className="animate-pulse inline-block w-1.5 h-4 bg-amber-500 mx-1 align-middle" />
                    </p>

                    {/* זנב הבועה */}
                    <div className={`absolute -bottom-2.5 right-10 w-5 h-5 rotate-45 border-r-2 border-b-2
                ${isFree ? 'bg-[#020617] border-green-500' : 'bg-[#020617] border-amber-700/50'}`} />
                </div>
            )}
            {/* דמות דובי */}
            <div 
                className="relative w-16 h-16 md:w-28 md:h-28 cursor-pointer group focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-500 rounded-full" 
                onClick={toggleBubble}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleBubble();
                    }
                }}
                aria-label="עזרה מדובי גמד הבית"
                aria-expanded={isBubbleVisible}
            >
                <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-1000 animate-pulse
                        ${isFree ? 'bg-green-500/50 scale-150' : 'bg-amber-500/20 group-hover:bg-amber-500/40'}`} />

                <Image
                    src="/images/house-elf-helper.png"
                    alt="דובי"
                    width={112}
                    height={112}
                    className={`relative w-full h-full object-contain filter drop-shadow-2xl transition-all duration-500
                        ${isFree ? 'animate-bounce brightness-125 scale-125 rotate-12' : 'group-hover:scale-110 group-hover:-rotate-3'}`}
                />
            </div>
        </div>
    );
}