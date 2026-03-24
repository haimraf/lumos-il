"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Skull, ShieldAlert } from "lucide-react";
import { hasStickyMarker } from "@/utils/magic-fingerprint";

export default function AzkabanGuard({ children }: { children: React.ReactNode }) {
    const [supabase] = useState(() => createClient());
    const router = useRouter();
    const [isBanned, setIsBanned] = useState(false);
    const [isStaff, setIsStaff] = useState(false);
    const [isFingerprintBanned, setIsFingerprintBanned] = useState(false);

    useEffect(() => {
        let isChecking = false;

        const enforceAzkaban = async (userId: string) => {
            if (isChecking) return;
            isChecking = true;
            try {
                const { data } = await supabase.from('profiles').select('role, status').eq('id', userId).single();
                if (!data) return;

                // דרגות צוות - פטור מהחסימת מכשיר (Fingerprint)
                const STAFF_ROLES = ['מייסד', 'ראש הוגוורטס', 'שומר הטירה', 'פרופסור', 'צוות Lumos', 'מנהל', 'מנחה', 'מייסדת', 'מנהלת'];
                const userRole = data.role || '';
                const userStatus = data.status;
                const isUserStaff = STAFF_ROLES.some(r => userRole.includes(r));
                setIsStaff(isUserStaff);

                if ((userRole === 'אסיר אזקבאן' || userStatus === 'banned') && !isUserStaff) {
                    setIsBanned(true);
                    await supabase.auth.signOut();
                }
            } finally {
                isChecking = false;
            }
        };

        // This was moved into the onAuthStateChange callback as per instruction
        // if (hasStickyMarker()) {
        //     setIsFingerprintBanned(true);
        // }

        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && !isBanned) {
                await enforceAzkaban(session.user.id);
            }
        };

        checkAuth();

        const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (hasStickyMarker()) {
                setIsFingerprintBanned(true);
            }
            if (session?.user && event === 'SIGNED_IN' && !isBanned) {
                await enforceAzkaban(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setIsStaff(false);
                setIsBanned(false);
            }
        });

        return () => {
            if (subscription && (subscription as any).unsubscribe) {
                (subscription as any).unsubscribe();
            }
        };
    }, [supabase]);

    // המסך שיופיע לטרולים חסומים בלבד 
    // התיקון: אם המשתמש הוא מנהל (isStaff), אנחנו נותנים לו לעבור גם אם המכשיר מסומן
    if ((isBanned || isFingerprintBanned) && !isStaff) {
        return (
            <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center text-center p-6" dir="rtl">
                {isFingerprintBanned ? (
                     <ShieldAlert size={80} className="text-red-900/60 mb-6 animate-pulse" />
                ) : (
                     <Skull size={80} className="text-red-900/60 mb-6 animate-pulse" />
                )}
                <h1 className="font-cinzel text-4xl md:text-6xl font-black text-red-600 mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                    {isFingerprintBanned ? "גישה חסומה" : "נשלחת לאזקבאן"}
                </h1>
                <p className="font-crimson text-white/50 text-lg md:text-xl max-w-lg leading-relaxed italic border-t border-red-900/30 pt-6">
                    {isFingerprintBanned 
                        ? "המכשיר שלך מזוהה כקשור לפעילות עוינת בטירה. הגישה נחסמה לצמיתות על ידי משרד הקסמים."
                        : "חשבונך נחסם לצמיתות והוחרם ממערכת הוגוורטס עקב הפרה חמורה של חוקי הקסם. שרביטך נשבר."}
                </p>
                <div className="mt-12 text-[10px] font-cinzel text-white/20 uppercase tracking-widest">
                    משרד הקסמים — המחלקה לאכיפת חוקי הקסם
                </div>
            </div>
        );
    }

    return <>{children}</>;
}