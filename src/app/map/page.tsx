"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Footprints, Shield, Compass, Eye, Map as MapIcon, Laptop, Smartphone, Sparkles } from "lucide-react";

const HOUSE_THEMES: Record<string, { color: string, foot: string }> = {
    'Gryffindor': { color: 'text-red-900', foot: 'text-red-900/40' },
    'Slytherin': { color: 'text-emerald-900', foot: 'text-emerald-900/40' },
    'Ravenclaw': { color: 'text-blue-900', foot: 'text-blue-900/40' },
    'Hufflepuff': { color: 'text-amber-800', foot: 'text-amber-800/40' },
    'Unknown': { color: 'text-[#8b4513]', foot: 'text-[#8b4513]/40' }
};

// המילון הקסום: מתרגם כתובות URL למיקומים בטירה
const getLocationName = (path: string) => {
    if (!path) return "משוטט/ת בטירה";
    if (path === "/") return "באולם הגדול";
    if (path.includes("/map")) return "מביט/ה במפת הקונדסאים";
    if (path.includes("/news?article")) return "קורא/ת כתבה בנביא היומי";
    if (path.includes("/news")) return "במערכת הנביא היומי";
    if (path.includes("/sorting")) return "חובש/ת את מצנפת המיון";
    if (path.includes("/profile")) return "בחדר המועדון";
    if (path.includes("/store") || path.includes("/diagon")) return "בסמטת דיאגון";
    return "במסדרונות הטירה";
};

export default function MaraudersMasterMap() {
    const supabase = createClient();
    const [wizards, setWizards] = useState<any[]>([]);
    const [stats, setStats] = useState({ hall: 0, library: 0, wandering: 0 });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => setIsMounted(true), []);

    useEffect(() => {
        // המפה רק "מאזינה" לערוץ, היא כבר לא משדרת את עצמה כי MagicPresence עושה את זה
        const channel = supabase.channel('lumos_global_presence');

        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const all = Object.values(state).flat() as any[];

            // מסננים כפילויות לפי שם משתמש כדי שהטבלה תהיה נקייה
            const uniqueWizards = Array.from(new Map(all.map(w => [w.user_name, w])).values());
            setWizards(uniqueWizards);

            const hall = uniqueWizards.filter(p => p.current_path === '/' || p.current_path === '/map').length;
            const lib = uniqueWizards.filter(p => p.current_path?.includes('/news')).length;
            setStats({ hall, library: lib, wandering: uniqueWizards.length - (hall + lib) });
        }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [supabase]);

    const getWandType = (ua: string) => {
        if (!ua) return "שרביט עתיק";
        if (ua.includes("Chrome")) return "שרביט כרום";
        if (ua.includes("Firefox")) return "נוצת עוף חול (FF)";
        if (ua.includes("Safari") && !ua.includes("Chrome")) return "שיער חד-קרן (Safari)";
        return "שרביט מותאם אישית";
    };

    return (
        <div className="min-h-screen bg-[#050505] p-4 md:p-8 font-assistant overflow-hidden" dir="rtl">
            <style>{`
                @keyframes pitter-patter {
                    0% { opacity: 0; transform: translateX(0) scale(0.8); }
                    20% { opacity: 1; transform: translateX(5px) scale(1); }
                    80% { opacity: 1; transform: translateX(10px) scale(1); }
                    100% { opacity: 0; transform: translateX(15px) scale(0.8); }
                }
                @keyframes float-dust {
                    0% { transform: translateY(0) translateX(0); opacity: 0; }
                    50% { opacity: 0.2; }
                    100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
                }
                .walking-feet { animation: pitter-patter 2.5s infinite; }
                .magic-dust { animation: float-dust 10s infinite linear; }
                .map-vignette { box-shadow: inset 0 0 150px rgba(0,0,0,0.7), inset 0 0 50px rgba(139,69,19,0.2); }
            `}</style>

            {isMounted && (
                <div className="fixed inset-0 pointer-events-none">
                    {[...Array(15)].map((_, i) => (
                        <div key={i} className="magic-dust absolute bg-amber-200/20 rounded-full w-1 h-1"
                            style={{
                                top: `${Math.floor(Math.random() * 100)}%`,
                                left: `${Math.floor(Math.random() * 100)}%`,
                                animationDelay: `${(Math.random() * 5).toFixed(2)}s`
                            }} />
                    ))}
                </div>
            )}

            <div className="max-w-6xl mx-auto bg-[#f4e4bc] rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,1)] border-[10px] border-double border-[#8b4513]/20 relative overflow-hidden text-[#3e2723]">
                <div className="absolute inset-0 map-vignette pointer-events-none z-20" />
                <div className="absolute inset-0 opacity-25 bg-[url('https://www.transparenttextures.com/patterns/old-map.png')] pointer-events-none mix-blend-multiply" />

                <div className="relative z-10 p-6 md:p-10">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6 border-b border-[#8b4513]/20 pb-8">
                        <div>
                            <h1 className="font-cinzel text-3xl font-black tracking-[0.1em] text-[#5d4037]">פיקוד הקונדסאים</h1>
                            <p className="font-crimson italic text-[#8b4513]/70">מבט על של מנהל הטירה - Studio Haim</p>
                        </div>
                        <div className="flex items-center gap-6 bg-white/20 px-6 py-3 rounded-2xl border border-[#8b4513]/10 backdrop-blur-sm">
                            <Compass className="text-[#8b4513] animate-[spin_20s_linear_infinite]" size={30} />
                            <div className="text-center">
                                <span className="font-cinzel text-4xl font-black">{wizards.length}</span>
                                <p className="text-[10px] font-bold uppercase tracking-tighter">נשמות בטירה</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <StatCard title="האולם הגדול" count={stats.hall} sub="דף הבית והמפה" icon={MapIcon} active />
                        <StatCard title="הספרייה" count={stats.library} sub="חדשות וכתבות" icon={Eye} />
                        <StatCard title="מסדרונות" count={stats.wandering} sub="דפים אחרים" icon={Footprints} />
                    </div>

                    <div className="bg-white/30 rounded-3xl border border-[#8b4513]/10 overflow-x-auto backdrop-blur-sm">
                        <table className="w-full text-right min-w-[500px]">
                            <thead className="bg-[#8b4513]/10 font-cinzel text-[10px] uppercase text-[#5d4037]">
                                <tr>
                                    <th className="p-4">קוסם/ת</th>
                                    <th className="p-4">בית</th>
                                    <th className="p-4 hidden sm:table-cell">מיקום</th>
                                    <th className="p-4">סוג שרביט</th>
                                </tr>
                            </thead>
                            <tbody className="font-crimson divide-y divide-[#8b4513]/10">
                                {wizards.map((w, i) => {
                                    const theme = HOUSE_THEMES[w.house] || HOUSE_THEMES['Unknown'];
                                    return (
                                        <tr key={i} className="hover:bg-white/30 transition-colors group">
                                            <td className={`p-4 flex items-center gap-3 font-bold ${theme.color}`}>
                                                <div className="relative">
                                                    <Footprints size={14} className={`walking-feet ${theme.foot}`} />
                                                    <Sparkles size={10} className="absolute -top-1 -right-1 text-amber-500/40 animate-pulse" />
                                                </div>
                                                <span className="text-xl italic">{w.user_name}</span>
                                            </td>
                                            <td className={`p-4 font-bold ${theme.color}`}>{w.house}</td>
                                            <td className="p-4 text-sm font-bold opacity-80 hidden sm:table-cell">
                                                {getLocationName(w.current_path)}
                                            </td>
                                            <td className="p-4 text-[11px] font-sans flex items-center gap-2">
                                                {w.user_agent?.includes("Mobi") ? <Smartphone size={12} /> : <Laptop size={12} />}
                                                {getWandType(w.user_agent)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, count, sub, icon: Icon, active }: any) {
    return (
        <div className={`p-6 rounded-3xl border transition-all duration-700 ${active ? 'bg-[#8b4513]/15 border-[#8b4513]/40 shadow-lg' : 'bg-white/10 border-[#8b4513]/10'} text-center shadow-inner`}>
            <Icon className={`mx-auto mb-2 ${active ? 'text-[#8b4513]' : 'text-[#8b4513]/40'}`} size={20} />
            <h4 className="font-cinzel text-[10px] font-black uppercase mb-1">{title}</h4>
            <p className="text-[9px] opacity-60 mb-3">{sub}</p>
            <span className="font-cinzel text-4xl font-black text-[#5d4037]">{count}</span>
        </div>
    );
}