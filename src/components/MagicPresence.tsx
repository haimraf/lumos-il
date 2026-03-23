"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { usePathname } from "next/navigation";

export default function MagicPresence() {
    const supabase = createClient();
    const pathname = usePathname();

    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const loadProfile = async () => {
            const { data: userData } = await supabase.auth.getUser();

            if (!userData?.user) {
                setProfile(null);
                return;
            }

            const { data: profileData, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userData.user.id)
                .single();

            if (error) {
                console.error("❌ profiles load error:", error);
                setProfile(null);
                return;
            }

            setProfile(profileData);
        };

        loadProfile();
    }, [supabase]);

    useEffect(() => {
        const guestId =
            localStorage.getItem("presence_id") ||
            (() => {
                const id = crypto.randomUUID();
                localStorage.setItem("presence_id", id);
                return id;
            })();

        const presenceId = profile?.id || guestId;
        const presenceType = profile?.id ? "member" : "guest";

        const getLocationLabel = () => {
            if (!pathname || pathname === "/" || pathname.includes("/home") || pathname.includes("/great-hall")) return "ברחבת הכניסה";
            if (pathname.includes("/map")) return "במפת הקונדסאים";
            if (pathname.includes("/news")) return "בנביא היומי";
            if (pathname.includes("/profile") || pathname.includes("/dashboard")) return "בחדר המועדון";
            if (pathname.includes("/shop") || pathname.includes("/ollivanders")) return "בסמטת דיאגון";
            if (pathname.includes("/forums")) return "בפורומים";
            return "במסדרונות";
        };

        let cancelled = false;

        const updatePresence = async () => {
            const payload = {
                id: presenceId,
                user_name: profile?.full_name || profile?.username || "אורח",
                house: profile?.house || "Guest",
                current_path: pathname,
                location_label: getLocationLabel(),
                last_seen: new Date().toISOString(),
                presence_type: presenceType,
            };

            const { error } = await supabase
                .from("online_users")
                .upsert(payload, { onConflict: "id" });

            if (error) {
                console.error("❌ online_users upsert error:", error);
                console.log("🔍 upsert error details:", JSON.stringify(error, null, 2));
                console.log("🔍 payload that failed:", JSON.stringify(payload, null, 2));
            } else if (!cancelled) {
                console.log("✅ online_users upsert ok:", payload);
            }
        };

        updatePresence();
        const interval = setInterval(updatePresence, 10000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [pathname, profile, supabase]);

    return null;
}