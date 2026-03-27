"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AFK_IDLE_MS, isMissingPresenceColumnsError, type PresenceStatus } from "@/lib/presenceStatus";

const LOCATION_LABELS = {
    entrance: "\u05d1\u05e8\u05d7\u05d1\u05ea \u05d4\u05db\u05e0\u05d9\u05e1\u05d4",
    map: "\u05d1\u05de\u05e4\u05ea \u05d4\u05e7\u05d5\u05e0\u05d3\u05e1\u05d0\u05d9\u05dd",
    news: "\u05d1\u05e0\u05d1\u05d9\u05d0 \u05d4\u05d9\u05d5\u05de\u05d9",
    dashboard: "\u05d1\u05d7\u05d3\u05e8 \u05d4\u05de\u05d5\u05e2\u05d3\u05d5\u05df",
    shop: "\u05d1\u05e1\u05de\u05d8\u05ea \u05d3\u05d9\u05d0\u05d2\u05d5\u05df",
    forums: "\u05d1\u05de\u05e1\u05d3\u05e8\u05d5\u05e0\u05d5\u05ea",
};

export default function MagicPresence() {
    const [supabase] = useState(() => createClient());
    const pathname = usePathname();
    const { session, profile, isLoading } = useAuth();
    const lastActivityRef = useRef(Date.now());
    const hasPresenceColumnsRef = useRef<boolean | null>(null);
    const presenceDisabledRef = useRef(false);
    const cleanedLegacyPresenceRef = useRef<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const markActive = () => {
            lastActivityRef.current = Date.now();
        };

        const activityEvents: Array<keyof WindowEventMap> = [
            "pointerdown",
            "keydown",
            "scroll",
            "touchstart",
            "mousemove",
        ];

        const handleVisibility = () => {
            if (!document.hidden) {
                markActive();
            }
        };

        activityEvents.forEach((eventName) => {
            window.addEventListener(eventName, markActive, { passive: true });
        });
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            activityEvents.forEach((eventName) => {
                window.removeEventListener(eventName, markActive);
            });
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, []);

    useEffect(() => {
        const guestId =
            localStorage.getItem("presence_id") ||
            (() => {
                const id = `guest_${crypto.randomUUID()}`;
                localStorage.setItem("presence_id", id);
                return id;
            })();

        if (session?.user && isLoading) {
            return;
        }

        const presenceId = profile?.id || session?.user?.id || guestId;
        const presenceType = session?.user ? "member" : "guest";
        const legacyPresenceId =
            session?.user?.id && profile?.id && profile.id !== session.user.id
                ? session.user.id
                : null;

        const getLocationLabel = () => {
            if (!pathname || pathname === "/" || pathname.includes("/home") || pathname.includes("/great-hall")) {
                return LOCATION_LABELS.entrance;
            }
            if (pathname.includes("/map")) return LOCATION_LABELS.map;
            if (pathname.includes("/news")) return LOCATION_LABELS.news;
            if (pathname.includes("/profile") || pathname.includes("/dashboard")) return LOCATION_LABELS.dashboard;
            if (pathname.includes("/shop") || pathname.includes("/ollivanders")) return LOCATION_LABELS.shop;
            if (pathname.includes("/forums")) return LOCATION_LABELS.forums;
            return LOCATION_LABELS.forums;
        };

        let cancelled = false;

        const updatePresence = async () => {
            if (presenceDisabledRef.current) return;

            const lastActiveAt = new Date(lastActivityRef.current).toISOString();
            const presenceStatus: PresenceStatus =
                document.hidden || Date.now() - lastActivityRef.current >= AFK_IDLE_MS
                    ? "afk"
                    : "online";

            const basePayload = {
                id: presenceId,
                user_name:
                    profile?.full_name?.trim() ||
                    session?.user?.user_metadata?.full_name ||
                    session?.user?.user_metadata?.name ||
                    session?.user?.email?.split("@")[0] ||
                    "\u05d0\u05d5\u05e8\u05d7",
                house: profile?.house || "Guest",
                current_path: pathname,
                location_label: getLocationLabel(),
                last_seen: new Date().toISOString(),
                presence_type: presenceType,
            };

            const advancedPayload = {
                ...basePayload,
                presence_status: presenceStatus,
                last_active_at: lastActiveAt,
            };

            const executeUpsert = async (payload: typeof advancedPayload | typeof basePayload) =>
                supabase.from("online_users").upsert(payload, { onConflict: "id" });

            let response =
                hasPresenceColumnsRef.current === false
                    ? await executeUpsert(basePayload)
                    : await executeUpsert(advancedPayload);

            if (response.error && isMissingPresenceColumnsError(response.error)) {
                hasPresenceColumnsRef.current = false;
                response = await executeUpsert(basePayload);
            } else if (!response.error) {
                hasPresenceColumnsRef.current = true;
            }

            if (
                !response.error &&
                legacyPresenceId &&
                cleanedLegacyPresenceRef.current !== legacyPresenceId
            ) {
                const cleanupResponse = await supabase
                    .from("online_users")
                    .delete()
                    .eq("id", legacyPresenceId);

                if (!cleanupResponse.error) {
                    cleanedLegacyPresenceRef.current = legacyPresenceId;
                }
            }

            if (response.error && !cancelled) {
                presenceDisabledRef.current = true;
                console.warn("[MagicPresence] online presence unavailable, disabling live sync for this session.");
            }
        };

        void updatePresence();
        const interval = setInterval(() => {
            void updatePresence();
        }, 15000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [isLoading, pathname, profile, session, supabase]);

    return null;
}
