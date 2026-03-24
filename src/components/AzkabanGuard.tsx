"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Skull } from "lucide-react";

export default function AzkabanGuard({ children }: { children: React.ReactNode }) {
    const [supabase] = useState(() => createClient());
    const router = useRouter();
    const [isBanned, setIsBanned] = useState(false);

    useEffect(() => {
        const enforceAzkaban = async (userId: string) => {
            const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
            if (data?.role === 'אסיר אזקבאן') {
                setIsBanned(true);
                await supabase.auth.signOut(); // מנתק אותם מיד!
            }
        };

        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await enforceAzkaban(session.user.id);
            }
        };

        checkAuth();

        // מאזין גם לשינויים בזמן אמת (אם נתת להם באן כשהם מחוברים)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                await enforceAzkaban(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase, router]);

    // המסך שיופיע לטרולים חסומים בלבד (לא יראו את האתר בכלל)
    if (isBanned) {
        return (
            <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center text-center p-6" dir="rtl">
                <Skull size={80} className="text-red-900/60 mb-6 animate-pulse" />
                <h1 className="font-cinzel text-4xl md:text-6xl font-black text-red-600 mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                    נשלחת לאזקבאן
                </h1>
                <p className="font-crimson text-white/50 text-lg md:text-xl max-w-lg leading-relaxed italic border-t border-red-900/30 pt-6">
                    חשבונך נחסם לצמיתות והוחרם ממערכת הוגוורטס עקב הפרה חמורה של חוקי הקסם. שרביטך נשבר.
                </p>
                <div className="mt-12 text-[10px] font-cinzel text-white/20 uppercase tracking-widest">
                    משרד הקסמים — המחלקה לאכיפת חוקי הקסם
                </div>
            </div>
        );
    }

    // אם הם לא באזקבאן - האתר עולה כרגיל
    return <>{children}</>;
}