"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Map as MapIcon, Footprints, Ghost, Sparkles, Bell } from "lucide-react";
import Link from "next/link";

/**
 * LUMOS IL - MARAUDER'S MAP V2.6 (The "Profile Sync" Fix)
 * תיקון: שינוי שם המשתנה מ-data ל-profile וסנכרון ספירה ייחודית.
 */

export default function MaraudersMap() {
    const supabase = createClient();
    const [stats, setStats] = useState({ wizards: 1, total: 6 });
    const CASTLE_GHOSTS = 5;

    useEffect(() => {
        const channel = supabase.channel('castle_presence', {
            config: { presence: { key: 'wizard' } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const allPresences = Object.values(state).flat() as any[];

                // ספירת שמות ייחודיים בלבד - מונע כפילויות אם פתחת כמה טאבים
                const uniqueWizards = new Set(allPresences.map(p => p.user_name)).size;
                const count = uniqueWizards > 0 ? uniqueWizards : 1;

                setStats({
                    wizards: count,
                    total: count + CASTLE_GHOSTS
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const { data: { session } } = await supabase.auth.getSession();
                    let name = "קוסם מסתורי";

                    if (session) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('full_name')
                            .eq('id', session.user.id)
                            .single();

                        // כאן היה הבאג - תוקן מ-data ל-profile
                        if (profile?.full_name) {
                            name = profile.full_name;
                        }
                    }

                    await channel.track({ user_name: name });
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [supabase]);

    return (
        <section className="relative w-full overflow-hidden rounded-[2rem] border-2 border-amber-500 bg-[#020617] p-6 shadow-2xl group" dir="rtl">

            <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pointer-events-none"></div>

            <div className="relative z-10">
                {/* Header - בולט וקריא */}
                <div className="flex items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <MapIcon size={22} className="text-amber-500" />
                        <h3 className="font-cinzel text-[11px] font-black tracking-[0.2em] text-amber-400 uppercase">
                            מפת הקונדסאים
                        </h3>
                    </div>

                    <div className="whitespace-nowrap px-4 py-1.5 bg-amber-500 text-black rounded-full font-bold shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-2 border border-amber-600">
                        <span className="font-cinzel text-[10px] uppercase leading-none">סה"כ בטירה:</span>
                        <span className="font-cinzel text-[12px] leading-none">{stats.total}</span>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* האולם הגדול */}
                    <Link href="/map" className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border-2 border-amber-500/40 hover:border-amber-400 hover:bg-white/10 transition-all group/room shadow-inner">
                        <div className="flex items-center gap-4">
                            <Footprints size={24} className="text-amber-400 group-hover/room:animate-bounce transition-transform" />
                            <div className="flex flex-col">
                                <h4 className="font-cinzel text-sm font-black text-white uppercase tracking-widest leading-none">The Great Hall</h4>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-1.5 rounded uppercase leading-none">
                                        {stats.wizards} קוסמים
                                    </span>
                                    <span className="text-[10px] text-blue-300 font-bold italic opacity-80 leading-none">
                                        + {CASTLE_GHOSTS} רוחות
                                    </span>
                                </div>
                            </div>
                        </div>
                        <span className="font-cinzel font-black text-3xl text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                            {stats.total}
                        </span>
                    </Link>

                    {/* דיווח חי - נגישות גבוהה */}
                    <div className="p-4 rounded-xl bg-indigo-900/30 border border-indigo-400/50 flex items-start gap-3 shadow-md">
                        <Bell size={18} className="text-indigo-300 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[9px] text-indigo-300 font-black uppercase tracking-widest">דיווח חי מהמסדרונות:</p>
                            <p className="font-crimson text-[14px] text-white font-bold italic leading-tight">
                                "ניק כמעט בלי ראש מארגן נשף רוחות..."
                            </p>
                        </div>
                    </div>
                </div>

                {/* שבועה */}
                <div className="mt-8 pt-5 border-t border-white/10 text-center">
                    <p className="font-crimson text-[12px] text-amber-500/40 font-bold italic uppercase tracking-[0.4em]">
                        "I SOLEMNLY SWEAR THAT I AM UP TO NO GOOD"
                    </p>
                </div>
            </div>
        </section>
    );
}