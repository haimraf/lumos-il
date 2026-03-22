"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SortingReminder() {
    const { profile } = useAuth();
    const pathname = usePathname();
    const [dismissed, setDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (localStorage.getItem("sorting_reminder_dismissed") === "true") {
            setDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem("sorting_reminder_dismissed", "true");
    };

    if (!mounted) return null;
    if (!profile) return null;
    if (dismissed) return null;
    if (pathname === '/sorting') return null;

    const isUnsorted = !profile.house || profile.house === 'Unsorted';
    if (!isUnsorted) return null;

    const registeredAt = profile.created_at ? new Date(profile.created_at) : null;
    if (!registeredAt) return null;
    const hoursSinceRegistration = (Date.now() - registeredAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceRegistration < 24) return null;

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 bg-amber-950/90 border border-amber-500/30 backdrop-blur-md px-5 py-3 rounded-full shadow-xl">
            <span className="text-xl">🎩</span>
            <span className="font-cinzel text-amber-300 text-sm">מצנפת המיון מחכה לך!</span>
            <Link href="/sorting" className="font-cinzel text-xs bg-amber-500 text-black px-3 py-1 rounded-full hover:bg-amber-400 transition-all">לגורל שלי</Link>
            <button onClick={handleDismiss} className="text-white/30 hover:text-white/60 transition-colors">✕</button>
        </div>
    );
}
