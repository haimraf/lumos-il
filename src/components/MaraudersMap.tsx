"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Footprints, Map as MapIcon, Coins, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function MaraudersRadar() {
    const supabase = createClient();
    const [stats, setStats] = useState({ online: 0, galleons: 0, house: 'Unknown' });

    useEffect(() => {
        const loadData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase.from('profiles').select('galleons, house').eq('id', session.user.id).single();
                if (profile) setStats(prev => ({ ...prev, galleons: profile.galleons || 0, house: profile.house || 'Unknown' }));
            }
        };
        loadData();

        const channel = supabase.channel('lumos_global_presence', { config: { presence: { key: 'wizard' } } });
        channel.on('presence', { event: 'sync' }, () => {
            const count = Object.values(channel.presenceState()).flat().length;
            setStats(prev => ({ ...prev, online: count > 0 ? count : 1 }));
        }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [supabase]);

    return (
        <div className="w-full bg-[#f3e5ab] rounded-3xl border-2 border-[#8b4513]/20 p-6 shadow-lg relative overflow-hidden font-assistant" dir="rtl">
            <div className="absolute top-0 left-0 p-4 opacity-10 rotate-12"><Footprints size={80} className="text-[#8b4513]" /></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-cinzel text-sm font-black text-[#5d4037] uppercase tracking-widest">Castle Radar</h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#8b4513]/10 rounded-full border border-[#8b4513]/20">
                        <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                        <span className="font-cinzel text-[10px] font-black text-[#8b4513]">{stats.online} WIZARDS</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/40 p-4 rounded-2xl border border-[#8b4513]/10 text-center">
                        <Coins size={18} className="text-amber-600 mx-auto mb-2" />
                        <p className="text-[10px] text-[#8b4513]/60 font-bold uppercase">Galleons</p>
                        <span className="font-cinzel text-xl font-black text-[#5d4037]">{stats.galleons}</span>
                    </div>
                    <div className="bg-white/40 p-4 rounded-2xl border border-[#8b4513]/10 text-center">
                        <MapIcon size={18} className="text-blue-700 mx-auto mb-2" />
                        <p className="text-[10px] text-[#8b4513]/60 font-bold uppercase">House</p>
                        <span className="font-cinzel text-xs font-black text-[#5d4037] truncate">{stats.house}</span>
                    </div>
                </div>

                <Link href="/map" className="group flex items-center justify-center gap-2 w-full py-4 bg-[#8b4513] text-[#f3e5ab] rounded-2xl font-cinzel text-xs font-black uppercase hover:bg-[#5d4037] transition-all shadow-md">
                    Reveal Full Marauder's Map
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    );
}