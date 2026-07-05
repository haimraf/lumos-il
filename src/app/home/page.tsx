"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    BookOpen, ScrollText, Users, Store, Wand2,
    Trophy, Map, Shield, Footprints, Hourglass, MessageSquare,
    HelpCircle, GraduationCap, Swords, X
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import HotTopicsTeaser from "@/components/HotTopicsTeaser";
import WhoIsOnline from "@/components/WhoIsOnline";
import CastlePulseTeaser from "@/components/CastlePulseTeaser";
import LiveEventTeaser from "@/components/LiveEventTeaser";
import {
    fetchLiveEventSettings,
    isLiveEventVisible,
    LIVE_EVENTS_CATALOG_KEY,
    LIVE_EVENT_SETTINGS_KEY,
    type LiveEventSettings,
} from "@/lib/liveEvent";
import { fetchProfileWithFallback } from "@/lib/profileAccess";

// הציטוטים הנבחרים - הכי מתאימים ללובי ולהרפתקאות
const magicalQuotes = [
    '"ועכשיו, הארי, בוא נצא אל הלילה, לחזר אחרי אותה פתיינית הפכפכה, ההרפתקה." - אלבוס דמבלדור',
    '"לא טוב לשקוע בחלומות ולשכוח לחיות. זכור את זה." - אלבוס דמבלדור',
    '"מילים הן, ללא ספק, מקור הקסם הבלתי נדלה ביותר שלנו." - אלבוס דמבלדור',
    '"אני חושב שאפשר לצפות ממך לדברים גדולים... אחרי הכל, גם זה-שאין-לנקוב-בשמו עשה דברים גדולים." - מר אוליבנדר',
    '"האמת היא דבר יפה ונורא, ולפיכך יש לטפל בה במירב הזהירות." - אלבוס דמבלדור',
    '"לרבים מהקוסמים הגדולים ביותר אין קמצוץ של היגיון." - הרמיוני גריינג\'ר',
    '"פטפטת! קשקשת! בלדרדש! צביט! - אלבוס דמבלדור"',
    '"מפת הקונדסאים פתוחה. לאן נשלוח פעמינו היום?"',
    '"זה הזמן לקסם..."'
];

export default function HomePage() {
    const [userHouse, setUserHouse] = useState<string>("Unknown");
    const [randomQuote, setRandomQuote] = useState<string>("");
    const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
    useEffect(() => {
        setRandomQuote(magicalQuotes[Math.floor(Math.random() * magicalQuotes.length)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!localStorage.getItem("lumos_welcomed")) {
            setShowWelcomeBanner(true);
        }
    }, []);
    const [candles, setCandles] = useState<{ id: number; left: number; delay: number; duration: number }[]>([]);
    const [eventConfig, setEventConfig] = useState<LiveEventSettings | null>(null);

    const [supabase] = useState(() => createClient());

    const refreshHomeEvent = useCallback(async () => {
        setEventConfig(await fetchLiveEventSettings(supabase));
    }, [supabase]);

    useEffect(() => {
        const count = window.innerWidth < 768 ? 8 : 20;
        const generatedCandles = Array.from({ length: count }).map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 15 + Math.random() * 20
        }));
        const frame = window.requestAnimationFrame(() => setCandles(generatedCandles));

        const fetchHouse = async () => {
            await refreshHomeEvent();
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await fetchProfileWithFallback<{ house: string | null }>(
                    supabase,
                    { id: session.user.id, email: session.user.email },
                    'house'
                );
                if (profile?.house) setUserHouse(profile.house);
            }
        };
        fetchHouse();

        const refreshOnReturn = () => {
            if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
            void refreshHomeEvent();
        };

        window.addEventListener("focus", refreshOnReturn);
        document.addEventListener("visibilitychange", refreshOnReturn);
        const interval = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void refreshHomeEvent();
            }
        }, 30000);
        const siteSettingsChannel = supabase
            .channel("home-live-events-sync")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "site_settings" },
                (payload: any) => {
                    const key = payload?.new?.key || payload?.old?.key;
                    if (key === LIVE_EVENT_SETTINGS_KEY || key === LIVE_EVENTS_CATALOG_KEY) {
                        void refreshHomeEvent();
                    }
                },
            )
            .subscribe();

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("focus", refreshOnReturn);
            document.removeEventListener("visibilitychange", refreshOnReturn);
            window.clearInterval(interval);
            void supabase.removeChannel(siteSettingsChannel);
        };
    }, [refreshHomeEvent, supabase]);

    const getHouseStyles = (house: string) => {
        switch (house) {
            case 'Gryffindor': return { gradient: "from-red-950/40", border: "group-hover:border-red-500/50", text: "group-hover:text-red-400", shadow: "hover:shadow-[0_0_50px_rgba(220,38,38,0.3)]", icon: "text-red-500/70", glow: "rgba(220,38,38,0.15)" };
            case 'Slytherin': return { gradient: "from-emerald-950/40", border: "group-hover:border-emerald-500/50", text: "group-hover:text-emerald-400", shadow: "hover:shadow-[0_0_50px_rgba(16,185,129,0.3)]", icon: "text-emerald-500/70", glow: "rgba(16,185,129,0.15)" };
            case 'Ravenclaw': return { gradient: "from-blue-950/40", border: "group-hover:border-blue-500/50", text: "group-hover:text-blue-400", shadow: "hover:shadow-[0_0_50px_rgba(59,130,246,0.3)]", icon: "text-blue-500/70", glow: "rgba(59,130,246,0.15)" };
            case 'Hufflepuff': return { gradient: "from-yellow-950/40", border: "group-hover:border-yellow-500/50", text: "group-hover:text-yellow-400", shadow: "hover:shadow-[0_0_50px_rgba(234,179,8,0.3)]", icon: "text-yellow-500/70", glow: "rgba(234,179,8,0.15)" };
            default: return { gradient: "from-amber-950/40", border: "group-hover:border-amber-500/50", text: "group-hover:text-amber-400", shadow: "hover:shadow-[0_0_50px_rgba(245,158,11,0.3)]", icon: "text-amber-500/70", glow: "rgba(245,158,11,0.15)" };
        }
    };

    const houseTheme = getHouseStyles(userHouse);
    const showLiveEventCard = isLiveEventVisible(eventConfig);

    const destinations = [
        {
            id: 'dashboard',
            title: "חדר המועדון",
            desc: "דף הקוסם שלך, נתוני המסע והגדרות הטירה",
            icon: Shield,
            href: "/dashboard",
            className: "col-span-1 lg:col-span-2",
            customGradient: houseTheme.gradient,
            hoverBorder: houseTheme.border,
            hoverShadow: houseTheme.shadow,
            iconColor: houseTheme.icon,
            hoverText: houseTheme.text,
            badge: "הבית שלך"
        },
        {
            id: 'library',
            title: "הספרייה",
            desc: "מאות סיפורים ויצירות פאנפיקשן קסומות",
            icon: BookOpen,
            href: "/library",
            className: "col-span-1",
            customGradient: "from-indigo-950/30",
            hoverBorder: "group-hover:border-indigo-500/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(99,102,241,0.25)]",
            iconColor: "text-indigo-400/70",
            hoverText: "group-hover:text-indigo-400"
        },
        {
            id: 'forums',
            title: "מסדרונות הטירה (פורומים)",
            desc: "דיונים, הצעות, תמיכה ומפגשים חברתיים",
            icon: Users,
            href: "/forums",
            className: "col-span-1 lg:col-span-2",
            customGradient: "from-amber-950/30",
            hoverBorder: "group-hover:border-amber-500/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(245,158,11,0.25)]",
            iconColor: "text-amber-400/70",
            hoverText: "group-hover:text-amber-400"
        },
        {
            id: 'news',
            title: "הנביא היומי",
            desc: "חדשות, כתבות ועדכונים שוטפים מהקהילה",
            icon: ScrollText,
            href: "/news",
            className: "col-span-1",
            customGradient: "from-zinc-800/20",
            hoverBorder: "group-hover:border-zinc-400/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(161,161,170,0.2)]",
            iconColor: "text-zinc-400/70",
            hoverText: "group-hover:text-zinc-300"
        },
        {
            id: 'shop',
            title: "סמטת דיאגון",
            desc: "חנות הקסמים הרשמית של לומוס IL",
            icon: Store,
            href: "/shop",
            className: "col-span-1",
            customGradient: "from-purple-950/30",
            hoverBorder: "group-hover:border-purple-500/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(168,85,247,0.25)]",
            iconColor: "text-purple-400/70",
            hoverText: "group-hover:text-purple-400"
        },
        {
            id: 'ollivanders',
            title: "אוליבנדר",
            desc: "מבחן התאמת שרביטים אישי וייחודי",
            icon: Wand2,
            href: "/shop/ollivanders",
            className: "col-span-1",
            customGradient: "from-orange-950/30",
            hoverBorder: "group-hover:border-orange-500/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(249,115,22,0.25)]",
            iconColor: "text-orange-400/70",
            hoverText: "group-hover:text-orange-400"
        },
        {
            id: 'quests',
            title: "לוח משימות",
            desc: "אתגרים יומיים, משימות ותגמולי נקודות",
            icon: Trophy,
            href: "/quests",
            className: "col-span-1",
            customGradient: "from-cyan-950/30",
            hoverBorder: "group-hover:border-cyan-500/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(6,182,212,0.25)]",
            iconColor: "text-cyan-400/70",
            hoverText: "group-hover:text-cyan-400"
        },
        {
            id: 'map',
            title: "מפת הקונדסאים",
            desc: "גלה היכן הקוסמים נמצאים בזמן אמת",
            icon: Map,
            href: "/map",
            className: "col-span-1",
            customGradient: "from-teal-950/30",
            hoverBorder: "group-hover:border-teal-500/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(20,184,166,0.25)]",
            iconColor: "text-teal-400/70",
            hoverText: "group-hover:text-teal-400"
        },
        {
            id: 'wizards',
            title: "ספר הקוסמים",
            desc: "כל המשתתפים במקום אחד: שם, בית, אווטאר, דרגה ומי מחובר ממש עכשיו",
            icon: Users,
            href: "/wizards",
            className: "col-span-1",
            customGradient: "from-emerald-950/30",
            hoverBorder: "group-hover:border-emerald-500/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(16,185,129,0.25)]",
            iconColor: "text-emerald-400/70",
            hoverText: "group-hover:text-emerald-300",
            badge: "חדש"
        },
        {
            id: 'great-hall',
            title: "האולם הגדול (צ'אט חי)",
            desc: "שיחה אינטראקטיבית מיידית עם חברי הקהילה",
            icon: MessageSquare,
            href: "/great-hall",
            className: "col-span-1",
            customGradient: "from-rose-950/30",
            hoverBorder: "group-hover:border-rose-500/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(244,63,94,0.25)]",
            iconColor: "text-rose-400/70",
            hoverText: "group-hover:text-rose-400"
        },
        {
            id: 'exams',
            title: "בחינות O.W.L & N.E.W.T",
            desc: "מבחני ידע קסומים לקוסמים מתקדמים",
            icon: GraduationCap,
            href: "/exams/owl",
            className: "col-span-1",
            customGradient: "from-violet-950/30",
            hoverBorder: "group-hover:border-violet-500/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(139,92,246,0.25)]",
            iconColor: "text-violet-400/70",
            hoverText: "group-hover:text-violet-400",
            badge: "חדש"
        },
        {
            id: 'faq',
            title: "ספר השאלות",
            desc: "מדריכים, סודות וכל מה שרציתם לדעת על הטירה",
            icon: HelpCircle,
            href: "/faq",
            className: "col-span-1",
            customGradient: "from-pink-950/30",
            hoverBorder: "group-hover:border-pink-500/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(236,72,153,0.25)]",
            iconColor: "text-pink-400/70",
            hoverText: "group-hover:text-pink-400",
            badge: "חדש"
        },
        {
            id: 'arena',
            title: "זירת הקרבות",
            desc: "דו-קרב לחשים אסטרטגי וטבלת אלופים",
            icon: Swords,
            href: "/arena",
            className: "col-span-1 lg:col-span-2",
            customGradient: "from-red-950/40",
            hoverBorder: "group-hover:border-red-500/50",
            hoverShadow: "hover:shadow-[0_0_50px_rgba(220,38,38,0.35)]",
            iconColor: "text-red-500/70",
            hoverText: "group-hover:text-red-400",
            badge: "חדש"
        }
    ];

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#060403] px-4 pb-20 pt-24 md:px-6 md:pb-24 md:pt-28" dir="rtl">
            {/* רקע התקרה המכושפת */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-60" aria-hidden="true">
                {candles.map((candle) => (
                    <motion.div
                        key={candle.id}
                        initial={{ y: "100vh", opacity: 0 }}
                        animate={{ y: "-10vh", opacity: [0, 1, 1, 0] }}
                        transition={{ duration: candle.duration, delay: candle.delay, repeat: Infinity, ease: "linear" }}
                        className="absolute w-1 h-3 bg-amber-100 rounded-full shadow-[0_0_8px_2px_rgba(253,230,138,0.6)]"
                        style={{ left: `${candle.left}%` }}
                    >
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-400 rounded-full blur-[1px]" />
                    </motion.div>
                ))}
            </div>

            <div className="pointer-events-none absolute left-1/2 top-[-10%] z-0 hidden h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-amber-600/8 blur-[180px] sm:block" />
            <div className="pointer-events-none absolute bottom-0 right-[-10%] z-0 hidden h-[600px] w-[600px] rounded-full bg-blue-900/8 blur-[180px] md:block" />

            <div className="relative z-10" style={{ maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto' }}>

                {/* באנר ברוך הבא — מוצג פעם אחת בלבד */}
                {showWelcomeBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-950/30 px-5 py-4 backdrop-blur-sm"
                    >
                        <div className="flex flex-col gap-1">
                            <p className="font-cinzel text-sm font-black text-amber-300 tracking-wide">
                                ברוך הבא לטירה, קוסם! ✨
                            </p>
                            <p className="font-crimson text-white/60 text-sm">
                                המשימה הראשונה שלך: עבור ל
                                <Link href="/quests" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 mx-1">לוח המשימות</Link>
                                והשלם אתגר יומי אחד.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setShowWelcomeBanner(false);
                                localStorage.setItem("lumos_welcomed", "1");
                            }}
                            aria-label="סגור באנר ברוך הבא"
                            className="shrink-0 text-white/30 hover:text-white/70 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                )}

                {/* כותרת ובאנר היכרות */}
                <motion.header
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="relative mb-10 text-center md:mb-16"
                >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border border-amber-500/20 bg-amber-500/5 mb-8">
                        <Map size={36} className="text-amber-500/60" />
                    </div>
                    <h1 className="mb-5 bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700 bg-clip-text font-cinzel text-4xl font-black uppercase tracking-[0.12em] text-transparent drop-shadow-[0_5px_15px_rgba(245,158,11,0.2)] md:text-6xl md:tracking-widest">
                        רחבת הכניסה
                    </h1>

                    {/* באנר ה-SEO הקצר והקולע */}
                    <div className="max-w-3xl mx-auto bg-amber-950/20 border border-amber-500/10 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                        <h2 className="font-cinzel text-2xl text-amber-300/90 mb-2">הבית של קהילת הארי פוטר בישראל</h2>
                        <p className="lumos-reading font-crimson text-base leading-relaxed text-white/70 md:text-xl">
                            הגעתם לפורטל המרכזי של קהילת הקוסמים של ישראל. מכאן תוכלו לנווט בין מסדרונות הטירה, לצלול אל ספריית הפאנפיקים העצומה שלנו, להתעדכן בנביא היומי או להיכנס אל חדר המועדון האישי שלכם.
                        </p>
                    </div>

                    <div className="w-40 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto mb-6" />

                    <p className="min-h-[4rem] font-crimson text-lg italic tracking-wide text-amber-100/50 md:min-h-[3rem] md:text-2xl">
                        {randomQuote}
                    </p>
                </motion.header>

                {/* תפריט ניווט תגיות סמנטי (Bento Grid) */}
                {showLiveEventCard && <LiveEventTeaser eventConfig={eventConfig} />}

                <nav aria-label="ניווט בטירה" className="grid grid-cols-1 gap-4 md:auto-rows-[200px] md:grid-cols-2 lg:grid-cols-3">
                    {destinations.map((dest, idx) => {
                        const Icon = dest.icon;
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.07, duration: 0.5 }}
                                className={dest.className}
                            >
                                <Link
                                    href={dest.href}
                                    className={`group relative flex min-h-[160px] flex-col justify-between overflow-hidden rounded-[1.5rem] border border-white/6 bg-gradient-to-br p-5 transition-all duration-500 md:h-full md:p-7 ${dest.customGradient || ''} to-[#0a0a0c] backdrop-blur-sm
                                        ${dest.hoverBorder} ${dest.hoverShadow} hover:-translate-y-1.5 active:scale-[0.98]`}
                                    aria-label={`מעבר אל ${dest.title}`}
                                >
                                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity duration-700 flex items-center justify-center gap-6 -rotate-12 scale-150 z-0">
                                        <Footprints size={48} className="text-white translate-y-6" />
                                        <Footprints size={48} className="text-white -translate-y-6" />
                                    </div>

                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.03] rounded-bl-[100px] -mr-12 -mt-12 transition-transform group-hover:scale-[1.8] duration-700 pointer-events-none z-0" />

                                    <div className="flex items-start justify-between relative z-10">
                                        <div className={`p-3 rounded-2xl bg-white/5 border border-white/8 transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/15`}>
                                            <Icon size={26} className={`${dest.iconColor} transition-all duration-300 group-hover:scale-110`} aria-hidden="true" />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {dest.id === 'dashboard' && (
                                                <motion.div
                                                    animate={{ rotate: [0, 180, 180, 360] }}
                                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.5, 0.9] }}
                                                    className={`p-1.5 rounded-full border border-white/10 bg-white/5 ${dest.iconColor}`}
                                                >
                                                    <Hourglass size={14} aria-hidden="true" />
                                                </motion.div>
                                            )}
                                            {dest.badge && (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/30 bg-white/5 border border-white/8 px-3 py-1.5 rounded-full">
                                                    {dest.badge}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="relative z-10">
                                        <h2 className={`font-cinzel text-xl md:text-2xl font-black text-white/85 mb-2 tracking-wide transition-colors duration-300 ${dest.hoverText}`}>
                                            {dest.title}
                                        </h2>
                                        <p className="font-crimson text-white/45 text-base leading-snug group-hover:text-white/60 transition-colors duration-300">
                                            {dest.desc}
                                        </p>
                                    </div>

                                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center z-10" />
                                </Link>
                            </motion.div>
                        );
                    })}
                </nav>

            </div>

            <div className="relative z-10 mt-16 space-y-10" style={{ maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto' }}>
                <WhoIsOnline />
                <CastlePulseTeaser />
                <HotTopicsTeaser />
            </div>
        </main>
    );
}
