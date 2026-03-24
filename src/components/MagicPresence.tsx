"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const LOCATION_LABELS = {
    entrance: "\u05d1\u05e8\u05d7\u05d1\u05ea \u05d4\u05db\u05e0\u05d9\u05e1\u05d4",
    map: "\u05d1\u05de\u05e4\u05ea \u05d4\u05e7\u05d5\u05e1\u05de\u05d9\u05dd",
    news: "\u05d1\u05e0\u05d1\u05d9\u05d0 \u05d4\u05d9\u05d5\u05de\u05d9",
    dashboard: "\u05d1\u05d7\u05d3\u05e8 \u05d4\u05de\u05d5\u05e2\u05d3\u05d5\u05df",
    shop: "\u05d1\u05e1\u05de\u05d8\u05ea \u05d3\u05d9\u05d0\u05d2\u05d5\u05df",
    forums: "\u05d1\u05de\u05e1\u05d3\u05e8\u05d5\u05e0\u05d5\u05ea",
};

export default function MagicPresence() {
    const [supabase] = useState(() => createClient());
    const pathname = usePathname();
    const { session, profile } = useAuth();

    useEffect(() => {
        const guestId =
            localStorage.getItem("presence_id") ||
            (() => {
                const id = crypto.randomUUID();
                localStorage.setItem("presence_id", id);
                return id;
            })();

        const presenceId = profile?.id || session?.user?.id || guestId;
        const presenceType = session?.user ? "member" : "guest";

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
            const payload = {
                id: presenceId,
                user_name: profile?.full_name || profile?.username || "\u05d0\u05d5\u05e8\u05d7",
                house: profile?.house || "Guest",
                current_path: pathname,
                location_label: getLocationLabel(),
                last_seen: new Date().toISOString(),
                presence_type: presenceType,
            };

            const { error, status, statusText } = await supabase
                .from("online_users")
                .upsert(payload, { onConflict: "id" })
                .select();

            if (error) {
                console.error("[MagicPresence] online_users upsert error:", error);
            } else if (!cancelled) {
                console.log("[MagicPresence] online_users upsert ok:", status, statusText);
            }
        };

        void updatePresence();
        const interval = setInterval(() => {
            void updatePresence();
        }, 10000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [pathname, profile, session, supabase]);

    return null;
}
