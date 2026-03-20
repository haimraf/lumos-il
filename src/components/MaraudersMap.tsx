"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Footprints, Map as MapIcon, Coins, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

/**
 * LUMOS IL - MARAUDERS RADAR V2.2 (The Inclusive & Elegant Update)
 * שדרוגים: ניסוחים א-בינאריים וניטרליים מגדרית, נעילת רוחב למניעת מתיחה, 
 * ושימוש בנתוני אמת מהדאטהבייס.
 */

export default function MaraudersRadar() {
    const supabase = createClient();
    const { profile } = useAuth();
    const [onlineCount, setOnlineCount] = useState(1);

    useEffect(() => {
        const fetchOnlineCount = async () => {
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('is_online', true);

            setOnlineCount(count || 1);
        };

        fetchOnlineCount();

        const channel = supabase.channel('online_status_radar')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchOnlineCount();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [supabase]);

    return (
        <div
            className="w-full bg-[#f3e5ab] rounded-3xl border-2 border-[#8b4513]/20 p-6 shadow-lg relative overflow-hidden font-assistant mx-auto"
            dir="rtl"
            style={{ maxWidth: '420px' }}
        >
            <div className="absolute top-0 left-0 p-4 opacity-10 rotate-12"><Footprints size={80} className="text-[#8b4513]" /></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-cinzel text-sm font-black text-[#5d4037] uppercase tracking-widest">רדאר הטירה</h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#8b4513]/10 rounded-full border border-[#8b4513]/20">
                        <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                        {/* ✨ שפה מכילה: "שרביטים מחוברים" במקום "קוסמים" */}
                        <span className="font-cinzel text-[10px] font-black text-[#8b4513]">{onlineCount} שרביטים מחוברים</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/40 p-4 rounded-2xl border border-[#8b4513]/10 text-center">
                        <Coins size={18} className="text-amber-600 mx-auto mb-2" />
                        <p className="text-[10px] text-[#8b4513]/60 font-bold uppercase">גליאונים</p>
                        <span className="font-cinzel text-xl font-black text-[#5d4037]">{profile?.galleons || 0}</span>
                    </div>
                    <div className="bg-white/40 p-4 rounded-2xl border border-[#8b4513]/10 text-center">
                        <MapIcon size={18} className="text-blue-700 mx-auto mb-2" />
                        <p className="text-[10px] text-[#8b4513]/60 font-bold uppercase">בית</p>
                        {/* ✨ שפה מכילה: "ללא מיון" במקום "טרם מוין" (שנשמע כמו פנייה לזכר) */}
                        <span className="font-cinzel text-xs font-black text-[#5d4037] truncate">{profile?.house || 'ללא מיון'}</span>
                    </div>
                </div>

                {/* ✨ שפה מכילה: "לחשיפת מפת..." במקום ציווי "חשוף את..." */}
                <Link href="/map" className="group flex items-center justify-center gap-2 w-full py-4 bg-[#8b4513] text-[#f3e5ab] rounded-2xl font-cinzel text-xs font-black uppercase hover:bg-[#5d4037] transition-all shadow-md">
                    לחשיפת מפת הקונדסאים המלאה
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    );
}