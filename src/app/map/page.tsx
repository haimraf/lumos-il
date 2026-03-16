"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
    Footprints,
    Compass,
    Shield,
    Home,
    BookOpen,
    Coffee,
    ArrowRight,
    Wand2,
    Ghost,
    Sparkles,
    Lock
} from "lucide-react";
import Link from "next/link";

/**
 * LUMOS IL - THE MARAUDER'S MAP V5.3 (The Colorful Footprints Edition)
 * כולל: טביעות רגל לפי צבעי הבתים וערוץ נוכחות גלובלי מסונכרן.
 */

// הגדרת צבעים לפי בתים למפה
const HOUSE_COLORS: Record<string, { text: string, foot: string }> = {
    'Gryffindor': { text: 'text-red-400', foot: 'text-red-500/80' },
    'Slytherin': { text: 'text-emerald-400', foot: 'text-emerald-500/80' },
    'Ravenclaw': { text: 'text-blue-400', foot: 'text-blue-500/80' },
    'Hufflepuff': { text: 'text-amber-400', foot: 'text-amber-500/80' },
    'Unknown': { text: 'text-slate-300', foot: 'text-slate-400/80' }
};

interface MapUser {
    name: string;
    house: string;
}

export default function FullMaraudersMap() {
    const supabase = createClient();
    const [onlineUsers, setOnlineUsers] = useState<MapUser[]>([]);
    const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

    // לוגיקת ה"רוחות" לסנכרון עם הדאשבורד
    const CASTLE_GHOSTS = 5;

    useEffect(() => {
        // שינינו לערוץ גלובלי כדי שיתחבר גם לדאשבורד וגם לשאר האתר
        const channel = supabase.channel('lumos_global_presence', {
            config: { presence: { key: 'wizard' } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const allPresences = Object.values(state).flat() as any[];

                // סינון שמות ייחודיים תוך שמירה על נתוני הבית
                const uniqueUsersMap = new Map<string, MapUser>();
                allPresences.forEach(p => {
                    if (p.user_name) {
                        uniqueUsersMap.set(p.user_name, {
                            name: p.user_name,
                            house: p.house || 'Unknown'
                        });
                    }
                });

                setOnlineUsers(Array.from(uniqueUsersMap.values()));
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const { data: { session } } = await supabase.auth.getSession();
                    let displayName = "קוסם מסתורי";
                    let userHouse = "Unknown";

                    if (session) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('full_name, house')
                            .eq('id', session.user.id)
                            .single();

                        displayName = profile?.full_name || "קוסם לא מזוהה";
                        userHouse = profile?.house || "Unknown";
                    }

                    await channel.track({
                        user_name: displayName,
                        house: userHouse,
                        online_at: new Date().toISOString()
                    });
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [supabase]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        });
    };

    const totalInCastle = onlineUsers.length + CASTLE_GHOSTS;

    return (
        <main
            className="min-h-screen bg-[#02040a] flex flex-col items-center justify-center p-4 md:p-10 relative overflow-hidden"
            onMouseMove={handleMouseMove}
            dir="rtl"
        >
            <style>{`
        @keyframes ink-walk {
          0% { opacity: 0; transform: scale(0.6) translateY(8px); }
          50% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0.2; transform: scale(0.9) translateY(-4px); }
        }
        .ink-step-1 { animation: ink-walk 2.5s infinite 0s; }
        .ink-step-2 { animation: ink-walk 2.5s infinite 0.6s; }
      `}</style>

            {/* לומוס - אלומת אור ענברית חזקה */}
            <div className="absolute inset-0 pointer-events-none z-10"
                style={{ background: `radial-gradient(circle 500px at ${mousePos.x}% ${mousePos.y}%, rgba(245, 158, 11, 0.15) 0%, transparent 100%)` }} />

            <div className="relative z-20 w-full max-w-7xl space-y-10">

                {/* Header הקלף */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b-2 border-amber-500/20 pb-8">
                    <div className="text-right space-y-2">
                        <h1 className="font-cinzel text-4xl md:text-6xl font-black text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                            THE MARAUDER'S MAP
                        </h1>
                        <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.4em] uppercase">Mischief Managed / Lumos IL</p>
                    </div>

                    {/* תגית ספירה מסונכרנת */}
                    <div className="bg-amber-500 text-black px-8 py-4 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.4)] border-2 border-amber-600 flex items-center gap-4">
                        <div className="flex flex-col items-center leading-none">
                            <span className="font-cinzel text-[10px] uppercase font-black">Castle Presence</span>
                            <span className="font-cinzel text-3xl font-black">{totalInCastle}</span>
                        </div>
                        <Compass className="animate-[spin_10s_linear_infinite]" size={32} />
                    </div>
                </div>

                {/* המפה - שרטוט אדריכלי כהה */}
                <div className="relative w-full border-[12px] border-double border-amber-900/40 bg-[#05070a] rounded-3xl shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden min-h-[650px] flex flex-col lg:flex-row">

                    {/* האולם הגדול */}
                    <div className="flex-[2] p-10 border-l-2 border-amber-900/20 relative">
                        <div className="flex items-center gap-4 mb-12">
                            <Home className="text-amber-500" size={32} />
                            <h2 className="font-cinzel text-3xl font-black text-white tracking-widest uppercase">The Great Hall</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                            {/* קוסמים אמיתיים */}
                            {onlineUsers.map((user, i) => {
                                const colors = HOUSE_COLORS[user.house] || HOUSE_COLORS['Unknown'];

                                return (
                                    <div key={i} className="flex items-center gap-6 group">
                                        <div className="relative w-12 h-16 shrink-0">
                                            <Footprints className={`absolute ${colors.foot} ink-step-1`} size={24} />
                                            <Footprints className={`absolute ${colors.foot} left-4 top-6 ink-step-2`} size={24} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`font-crimson text-3xl ${colors.text} font-black italic tracking-wide`}>
                                                {user.name}
                                            </span>
                                            <span className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest">
                                                {user.house !== 'Unknown' ? `House ${user.house}` : 'Active Wizard'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* רוחות רפאים (סגירת המספר) */}
                            {[...Array(CASTLE_GHOSTS)].map((_, i) => (
                                <div key={`ghost-${i}`} className="flex items-center gap-6 opacity-40">
                                    <Ghost className="text-blue-300" size={24} />
                                    <div className="flex flex-col">
                                        <span className="font-crimson text-2xl text-blue-100 font-bold italic tracking-wide">רוח רפאים מהטירה</span>
                                        <span className="text-[10px] text-blue-300 uppercase tracking-widest">Castle Spirit</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* חדרים נעולים ודיווחים */}
                    <div className="flex-1 p-10 bg-black/40 space-y-8">
                        <MapRoom icon={BookOpen} title="THE LIBRARY" status="RESTRICTED" />
                        <MapRoom icon={Coffee} title="COMMON ROOM" status="LOCKED" />

                        {/* תיבת לחישות */}
                        <div className="p-6 rounded-2xl border-2 border-indigo-500/30 bg-indigo-950/20 flex flex-col gap-2 shadow-lg">
                            <div className="flex items-center gap-3 text-indigo-300">
                                <Sparkles size={20} />
                                <span className="font-cinzel text-xs font-black uppercase">Live Whisper</span>
                            </div>
                            <p className="font-crimson text-lg text-white italic">"פיבס נצפה בקומה השנייה..."</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                    <Link href="/dashboard" className="bg-amber-600 text-black px-12 py-5 rounded-full font-cinzel font-black text-lg hover:bg-amber-400 transition-all flex items-center gap-4 shadow-2xl active:scale-95">
                        <ArrowRight className="rotate-180" size={24} />
                        RETURN TO CASTLE
                    </Link>
                    <h2 className="font-crimson text-5xl md:text-[5rem] text-amber-500/10 italic font-black uppercase tracking-[0.4em] select-none">
                        MISCHIEF MANAGED
                    </h2>
                    <div className="flex items-center gap-3 text-amber-400 font-bold italic">
                        <Wand2 size={20} />
                        <span>The map reveals all</span>
                    </div>
                </div>
            </div>
        </main>
    );
}

function MapRoom({ icon: Icon, title, status }: { icon: any, title: string, status: string }) {
    return (
        <div className="p-6 rounded-3xl border-2 border-white/10 bg-black/60 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <Icon size={24} className="text-white/60" />
                </div>
                <h3 className="font-cinzel text-lg font-black text-white tracking-widest uppercase">{title}</h3>
            </div>
            <div className="text-red-500 font-black tracking-widest text-[10px] italic border border-red-500/30 px-3 py-1.5 rounded-lg bg-red-950/20 w-fit flex items-center gap-2">
                <Lock size={14} />
                <span>{status}</span>
            </div>
        </div>
    );
}