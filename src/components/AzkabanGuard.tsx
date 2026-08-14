"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/utils/supabase/client";
import { Skull, ShieldAlert } from "lucide-react";
import { hasStickyMarker } from "@/utils/magic-fingerprint";
import { useAuth } from "@/context/AuthContext";

const LEGACY_BANNED_ROLE = "אסיר אזקבאן";
const STAFF_ROLES = ["מייסד", "ראש הוגוורטס", "שומר הטירה", "פרופסור", "צוות Lumos", "מנהל", "מנחה", "מייסדת", "מנהלת"];

export default function AzkabanGuard({ children }: { children: React.ReactNode }) {
    const { profile, session } = useAuth();
    const [supabase] = useState(() => createClient());
    /*
     * hasStickyMarker() reads localStorage, so it returns false on the server
     * and can return true on the client. Read as a lazy useState initializer —
     * as it was — the server renders the children while the client's first
     * render swaps in the block screen, which is a hydration mismatch. This
     * guard wraps the app, so it was the widest instance of that bug.
     *
     * useSyncExternalStore rather than an effect, because the value is derived
     * and never set from anywhere else: react-hooks/set-state-in-effect
     * correctly rejects effect-plus-setState here, and this is the API React
     * provides for exactly this shape — a client-only value with an explicit
     * server snapshot. The server snapshot is false, so both sides agree on
     * the first render and the real value arrives immediately after.
     *
     * The marker never changes within a page's lifetime, so there is nothing
     * to subscribe to. Nothing is weakened by the one-frame delay either: this
     * marker is a client-side deterrent that a user can clear, not the
     * enforcement. The real block is the profile/status check below and the
     * sign-out it triggers.
     */
    const isFingerprintBanned = useSyncExternalStore(
        () => () => {},
        () => hasStickyMarker(),
        () => false,
    );

    const userRole = profile?.role || "";
    const userStatus = profile?.status || null;
    const isStaff = STAFF_ROLES.some((role) => userRole.includes(role));
    const isLegacyBanOnly = userRole === LEGACY_BANNED_ROLE && !userStatus;
    const isBanned = (userStatus === "banned" || isLegacyBanOnly) && !isStaff;

    useEffect(() => {
        if (isBanned && session) {
            void supabase.auth.signOut();
        }
    }, [isBanned, session, supabase]);

    if ((isBanned || isFingerprintBanned) && !isStaff) {
        return (
            <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center text-center p-6" dir="rtl">
                {isFingerprintBanned ? (
                    <ShieldAlert size={80} className="text-red-900/60 mb-6 animate-pulse" />
                ) : (
                    <Skull size={80} className="text-red-900/60 mb-6 animate-pulse" />
                )}
                <h1 className="font-cinzel text-4xl md:text-6xl font-black text-red-600 mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                    {isFingerprintBanned ? "גישה חסומה" : "צו אזקבאן פעיל"}
                </h1>
                <p className="font-crimson text-white/50 text-lg md:text-xl max-w-lg leading-relaxed italic border-t border-red-900/30 pt-6">
                    {isFingerprintBanned
                        ? "המכשיר הזה זוהה כקשור לפעילות עוינת בטירה. משרד הקסמים חסם את הגישה לצמיתות."
                        : "צו הרחקה קבוע הוטל על חשבון זה בעקבות הפרה חמורה של חוקי הקסם. הגישה למסדרונות הטירה, לינשופים ולכשפים נחסמה."}
                </p>
                <div className="mt-12 text-[10px] font-cinzel text-white/20 uppercase tracking-widest">
                    משרד הקסמים - המחלקה לאכיפת חוקי הקסם
                </div>
            </div>
        );
    }

    return <>{children}</>;
}