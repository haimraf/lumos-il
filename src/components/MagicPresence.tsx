"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const ACTIVITY_TIMEOUT = 1000 * 60 * 2; // 2 דקות AFK
const HEARTBEAT_INTERVAL = 1000 * 30; // כל 30 שניות

const getGuestKey = () => {
    if (typeof window === "undefined") return "ssr";
    let key = localStorage.getItem("lumos_guest_key");
    if (!key) {
        key = "guest_" + Math.random().toString(36).slice(2);
        localStorage.setItem("lumos_guest_key", key);
    }
    return key;
};

export default function MagicPresence() {
    const supabase = createClient();
    const pathname = usePathname();
    const { profile, session } = useAuth();

    const channelRef = useRef<any>(null);
    const lastActiveRef = useRef(Date.now());

    // 🧠 פעילות משתמש
    useEffect(() => {
        const updateActivity = () => {
            lastActiveRef.current = Date.now();
        };

        window.addEventListener("mousemove", updateActivity);
        window.addEventListener("keydown", updateActivity);
        window.addEventListener("click", updateActivity);

        return () => {
            window.removeEventListener("mousemove", updateActivity);
            window.removeEventListener("keydown", updateActivity);
            window.removeEventListener("click", updateActivity);
        };
    }, []);

    const buildPayload = useCallback(() => {
        const isGuest = !session?.user?.id;
        const now = Date.now();
        const isAFK = now - lastActiveRef.current > ACTIVITY_TIMEOUT;

        return {
            user_id: session?.user?.id || getGuestKey(),
            user_name: isGuest
                ? "אורח מסתורי"
                : profile?.full_name || "קוסם",
            house: isGuest ? "Guest" : profile?.house || "Unknown",
            current_path: pathname,
            location_label: document.title || "בטירה",
            user_agent: navigator.userAgent,
            online_at: new Date().toISOString(),
            is_afk: isAFK,
            last_seen: new Date().toISOString(),
        };
    }, [pathname, profile, session]);

    useEffect(() => {
        if (channelRef.current) return;

        const channel = supabase.channel("lumos_global_presence", {
            config: {
                presence: {
                    key: session?.user?.id || getGuestKey(),
                },
            },
        });

        channelRef.current = channel;

        channel.subscribe((status) => {
            console.log("STATUS:", status);

            if (status === "SUBSCRIBED") {
                console.log("TRACK 🔥");

                channel.track(buildPayload());
            }
        });

        // 🫀 heartbeat
        const interval = setInterval(() => {
            if (channelRef.current) {
                channelRef.current.track(buildPayload());
            }
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(interval);

    }, [session, profile, pathname]);
    return null;
}