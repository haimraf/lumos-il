"use client";

import imageCompression from 'browser-image-compression';

import { getMagicFingerprint } from "@/utils/magic-fingerprint";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import MagicAvatar from "@/components/MagicAvatar";
import {
    ChevronRight, Wand2, Shield, ShieldAlert, ShieldOff, Star,
    Calendar, MessageSquare, BookOpen, Package, Clock,
    Sparkles, ExternalLink, Mars, Venus, UserPlus, UserMinus, UserX, UserCheck,
    Users, Camera, ImagePlus, Loader2, Move, Check, Swords, Skull, Ghost, Zap
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { getYearFromProfile, getYearTitle, getYearLabel } from "@/lib/yearSystem";
import { getItemBoostBadges } from "@/lib/inventoryBoosts";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";
import { logAdminAudit } from "@/lib/adminAudit";
import { getHouseDisplayIcon, getHouseDisplayLabel, isUnsortedHouse } from "@/lib/houses";
import { renderAvatarFrameBlob } from "@/lib/mediaFraming";

const ANIMALS_MAP: Record<string, { emoji: string; nameHe: string; nameEn: string }> = {
    stag: { emoji: "🦌", nameHe: "צבי", nameEn: "Stag" },
    otter: { emoji: "🦦", nameHe: "לוטרה", nameEn: "Otter" },
    wolf: { emoji: "🐺", nameHe: "זאב", nameEn: "Wolf" },
    doe: { emoji: "🦌", nameHe: "איילה", nameEn: "Doe" },
    hare: { emoji: "🐇", nameHe: "ארנב בר", nameEn: "Hare" },
    boar: { emoji: "🐗", nameHe: "חזיר בר", nameEn: "Boar" },
    cat: { emoji: "🐱", nameHe: "חתול", nameEn: "Cat" },
    eagle: { emoji: "🦅", nameHe: "נשר", nameEn: "Eagle" },
    lion: { emoji: "🦁", nameHe: "אריה", nameEn: "Lion" },
    dolphin: { emoji: "🐬", nameHe: "דולפין", nameEn: "Dolphin" },
    fox: { emoji: "🦊", nameHe: "שועל", nameEn: "Fox" },
    owl: { emoji: "🦉", nameHe: "ינשוף", nameEn: "Owl" },
    horse: { emoji: "🐴", nameHe: "סוס", nameEn: "Horse" },
    tiger: { emoji: "🐯", nameHe: "נמר", nameEn: "Tiger" },
    swan: { emoji: "🦢", nameHe: "ברבור", nameEn: "Swan" },
    bear: { emoji: "🐻", nameHe: "דוב", nameEn: "Bear" },
    dragon: { emoji: "🐉", nameHe: "דרקון", nameEn: "Dragon" },
    butterfly: { emoji: "🦋", nameHe: "פרפר", nameEn: "Butterfly" },
    phoenix: { emoji: "🔥", nameHe: "פיניקס", nameEn: "Phoenix" },
    serpent: { emoji: "🐍", nameHe: "נחש", nameEn: "Serpent" },
};

const HOUSE_CONFIG: Record<string, {
    name: string; emoji: string;
    accent: string; bg: string; border: string;
    banner: string; glow: string; textColor: string;
    badgeBg: string; quote: string;
}> = {
    Gryffindor: {
        name: "גריפינדור", emoji: "🦁",
        accent: "#dc2626", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.3)",
        banner: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 40%, #450a0a 100%)",
        glow: "rgba(220,38,38,0.4)", textColor: "text-red-400",
        badgeBg: "bg-red-900/50 text-red-300 border-red-700/50",
        quote: "אומץ, תעוזה ואבירות. לב גריפינדורי לעולם לא נכנע."
    },
    Slytherin: {
        name: "סלית'רין", emoji: "🐍",
        accent: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.3)",
        banner: "linear-gradient(135deg, #022c22 0%, #064e3b 40%, #022c22 100%)",
        glow: "rgba(5,150,105,0.4)", textColor: "text-emerald-400",
        badgeBg: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
        quote: "שאפתנות ופיקחות. הדרך לגדולה מתחילה בסלית'רין."
    },
    Ravenclaw: {
        name: "רייבנקלו", emoji: "🦅",
        accent: "#2563eb", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.3)",
        banner: "linear-gradient(135deg, #1e1b4b 0%, #1e3a8a 40%, #1e1b4b 100%)",
        glow: "rgba(37,99,235,0.4)", textColor: "text-blue-400",
        badgeBg: "bg-blue-900/50 text-blue-300 border-blue-700/50",
        quote: "חכמה ויצירתיות. הידע הוא הכוח הגדול מכולם."
    },
    Hufflepuff: {
        name: "הפלפאף", emoji: "🦡",
        accent: "#d97706", bg: "rgba(217,119,6,0.08)", border: "rgba(217,119,6,0.3)",
        banner: "linear-gradient(135deg, #451a03 0%, #78350f 40%, #451a03 100%)",
        glow: "rgba(217,119,6,0.4)", textColor: "text-amber-400",
        badgeBg: "bg-amber-900/50 text-amber-300 border-amber-700/50",
        quote: "נאמנות וטוב לב. הפלפאף הוא בית של כולם."
    },
};

const RANK_CONFIG: Record<string, { label: string; class: string; icon: string }> = {
    "מנהל": { label: "מנהל", class: "bg-amber-500 text-amber-950 border-amber-400", icon: "👑" },
    "פרופסור": { label: "פרופסור", class: "bg-purple-600/80 text-white border-purple-400", icon: "📚" },
    "מדריך": { label: "מדריך", class: "bg-blue-600/80 text-white border-blue-400", icon: "🪄" },
    "תלמיד/ה": { label: "תלמיד/ה", class: "bg-white/10 text-white/70 border-white/20", icon: "🧙" },
};

const TRAITS = [
    { key: "courage", name: "אומץ לב", icon: "⚔️", color: "#dc2626" },
    { key: "wisdom", name: "חכמה", icon: "🧠", color: "#2563eb" },
    { key: "cunning", name: "ערמומיות", icon: "🐍", color: "#059669" },
    { key: "loyalty", name: "נאמנות", icon: "🦡", color: "#d97706" },
];

function timeAgo(dateString: string) {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return "ממש עכשיו";
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
    if (diff < 2592000) return `לפני ${Math.floor(diff / 86400)} ימים`;
    return new Date(dateString).toLocaleDateString("he-IL");
}

function getInventory(raw: any) {
    if (!raw) return { items: [], companions: [], cards: [] };
    try {
        const d = typeof raw === "string" ? JSON.parse(raw) : raw;
        return { items: d.items || [], companions: d.companions || [], cards: d.cards || [] };
    } catch { return { items: [], companions: [], cards: [] }; }
}

export default function WizardProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [supabase] = useState(() => createClient());
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const [profile, setProfile] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [threads, setThreads] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"posts" | "inventory" | "traits" | "friends" | "duels">("posts");
    const [duelsHistory, setDuelsHistory] = useState<any[]>([]);

    // Auth
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isOwnProfile, setIsOwnProfile] = useState(false);

    // Avatar & Cover
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarSourceUrl, setAvatarSourceUrl] = useState<string | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [coverHovered, setCoverHovered] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Cover position
    const [coverPosition, setCoverPosition] = useState("50% 50%");
    const [autoFittingAvatar, setAutoFittingAvatar] = useState(false);
    const bannerRef = useRef<HTMLDivElement>(null);

    // Duel
    const [duelLoading, setDuelLoading] = useState(false);

    // Friends
    const [isFriend, setIsFriend] = useState(false);
    const [friendshipLoading, setFriendshipLoading] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [roleColors, setRoleColors] = useState<Record<string, string>>({});
    const { sendOwl } = useOwlMail();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    useEffect(() => { getRoleColorFromDB(supabase).then(setRoleColors); }, [supabase]);

    // Get current user once
    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUser(session.user);
                
                const { data: p } = await supabase.from('profiles')
                    .select('role, user_groups(name)')
                    .eq('id', session.user.id)
                    .single();
                
                const groupData = p?.user_groups;
                const gName = Array.isArray(groupData) ? groupData[0]?.name : (groupData as any)?.name;
                setUserRole(`${p?.role || ''} ${gName || ''}`);
                
                try {
                    const currentFingerprint = getMagicFingerprint();
                    if (currentFingerprint) {
                        await supabase.from('profiles').update({ fingerprint: currentFingerprint }).eq('id', session.user.id);
                    }
                } catch (err) {
                    // Fail silently
                }
            }
        };
        initAuth();
    }, [supabase]);

    // Sync isOwnProfile when both id and currentUser are ready
    useEffect(() => {
        setIsOwnProfile(!!(currentUser && id && currentUser.id === id));
    }, [currentUser, id]);

    // Load profile data
    useEffect(() => {
        if (!id) return;
        const load = async () => {
            const { data: p } = await supabase
                .from("profiles")
                .select("*, user_groups(name, color)")
                .eq("id", id)
                .single();

            if (!p) { router.push("/forums"); return; }
            setProfile(p);
            setAvatarUrl(p.avatar_url || null);
            setCoverUrl(p.cover_url || null);
            setCoverPosition(typeof p.cover_position === "string" ? p.cover_position : "50% 50%");
            if (currentUser?.id === p.id) {
                const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(`${p.id}/avatar-source.webp`);
                setAvatarSourceUrl(`${publicUrl}?t=${Date.now()}`);
            } else {
                setAvatarSourceUrl(null);
            }

            const { data: fp } = await supabase
                .from("forum_posts")
                .select("id, content, created_at, thread_id")
                .eq("user_id", id)
                .order("created_at", { ascending: false })
                .limit(8);

            if (fp) setPosts(fp);

            if (fp?.length) {
                const threadIds = [...new Set(fp.map((p: any) => p.thread_id))];
                const { data: th } = await supabase
                    .from("threads")
                    .select("id, title, forum_id")
                    .in("id", threadIds);
                if (th) setThreads(th);
            }

            const { data: dh } = await supabase
                .from("duels")
                .select(`id, status, winner_id, created_at, finished_at,
                    challenger:profiles!duels_challenger_id_fkey(id, full_name, house, avatar_url),
                    opponent:profiles!duels_opponent_id_fkey(id, full_name, house, avatar_url)`)
                .or(`challenger_id.eq.${id},opponent_id.eq.${id}`)
                .eq("status", "finished")
                .order("finished_at", { ascending: false })
                .limit(10);
            if (dh) setDuelsHistory(dh);

            setIsLoading(false);
        };
        load();
    }, [currentUser?.id, id, supabase, router]);

    // Load friendship status + friends list
    useEffect(() => {
        if (!id) return;
        const loadFriends = async () => {
            // Friends of profile user (as requester)
            const { data: asUser } = await supabase
                .from("friendships")
                .select("friend_id")
                .eq("user_id", id);

            // Friends of profile user (as addressee)
            const { data: asFriend } = await supabase
                .from("friendships")
                .select("user_id")
                .eq("friend_id", id);

            const friendIds = [
                ...(asUser?.map((r: any) => r.friend_id) || []),
                ...(asFriend?.map((r: any) => r.user_id) || []),
            ];

            if (friendIds.length) {
                const { data: friendProfiles } = await supabase
                    .from("profiles")
                    .select("id, full_name, house, avatar_url")
                    .in("id", friendIds);
                setFriends(friendProfiles || []);
            } else {
                setFriends([]);
            }

            // Check if current user is friends with this profile
            if (currentUser && currentUser.id !== id) {
                const { data: f1 } = await supabase
                    .from("friendships")
                    .select("id")
                    .eq("user_id", currentUser.id)
                    .eq("friend_id", id)
                    .maybeSingle();

                const { data: f2 } = await supabase
                    .from("friendships")
                    .select("id")
                    .eq("user_id", id)
                    .eq("friend_id", currentUser.id)
                    .maybeSingle();

                setIsFriend(!!(f1 || f2));
            }
        };
        loadFriends();
    }, [id, currentUser, supabase]);

    const handleAddFriend = async () => {
        if (!currentUser || !id) return;
        setFriendshipLoading(true);
        await supabase.from("friendships").insert({ user_id: currentUser.id, friend_id: id });
        setIsFriend(true);
        // Add to local friends list
        if (profile) setFriends(prev => [...prev, { id: currentUser.id, full_name: "אתה", house: null, avatar_url: null }]);
        setFriendshipLoading(false);
    };

    const handleRemoveFriend = async () => {
        if (!currentUser || !id) return;
        setFriendshipLoading(true);
        await supabase.from("friendships")
            .delete()
            .eq("user_id", currentUser.id)
            .eq("friend_id", id);
        await supabase.from("friendships")
            .delete()
            .eq("user_id", id)
            .eq("friend_id", currentUser.id);
        setIsFriend(false);
        setFriends(prev => prev.filter(f => f.id !== currentUser.id));
        setFriendshipLoading(false);
    };

    // הרשאות הנהלה - בדיקת דרגות פנימיות ודרגות מוצגות
    const STAFF_KEYWORDS = [
        'מייסד', 'מייסדת', 'ראש הוגוורטס', 'שומר הטירה', 
        'פרופסור', 'צוות Lumos', 'מנהל', 'מנחה', 'הנהלה'
    ];

    const checkIsStaff = (roleText: string) => {
        if (!roleText) return false;
        const normalized = roleText.trim().toLowerCase();
        return STAFF_KEYWORDS.some(keyword => 
            normalized.includes(keyword.toLowerCase())
        );
    };

    // 🛑 התיקון: בודקים נטו את המשתמש המחובר (userRole)!
    const canModerate = currentUser && checkIsStaff(userRole || '');

    // Removed heavy debug logs for performance

    const applyModerationAction = async ({
        status,
        isGhost,
        reason,
        expiresAt,
        auditAction,
        successTitle,
        successMessage,
    }: {
        status: string;
        isGhost: boolean;
        reason: string | null;
        expiresAt: string | null;
        auditAction: string;
        successTitle: string;
        successMessage: string;
    }) => {
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    status,
                    ban_reason: reason,
                    ban_expires_at: expiresAt,
                    is_ghost: isGhost,
                })
                .eq("id", id);

            if (error) throw error;

            await logAdminAudit(supabase, {
                actorId: currentUser?.id || null,
                action: auditAction,
                targetType: "profile",
                targetId: id,
                targetLabel: profile?.full_name || null,
                details: {
                    reason,
                    expiresAt,
                    source: "wizard-profile",
                    previousStatus: profile?.status || null,
                    previousGhost: Boolean(profile?.is_ghost),
                },
            });

            setProfile((previous: any) => previous ? ({
                ...previous,
                status,
                ban_reason: reason,
                ban_expires_at: expiresAt,
                is_ghost: isGhost,
            }) : previous);
            sendOwl(successTitle, successMessage, "success");
        } catch (err: any) {
            console.error(err);
            sendOwl("שגיאה", err?.message || "לא הצלחתי לעדכן את סטטוס המשמעת.", "error");
        }
    };

    const handleSendToAzkaban = async () => {
        const reason = "הרחקה יזומה ע\"י ההנהלה";
        if (!confirm("🚨 להפעיל באן קבוע על המשתמש הזה?")) return;

        await applyModerationAction({
            status: "banned",
            isGhost: false,
            reason,
            expiresAt: null,
            auditAction: "set_user_banned",
            successTitle: "באן הופעל",
            successMessage: "המשתמש עודכן למצב מורחק.",
        });
    };

    const handleCoolingRoom = async () => {
        const rawDays = window.prompt("לכמה ימים לשלוח לקולינג רום?", "1");
        if (rawDays === null) return;

        const days = Math.max(1, Number.parseInt(rawDays, 10) || 1);
        const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();

        await applyModerationAction({
            status: "cooling",
            isGhost: false,
            reason: "התנהגות שאינה הולמת את רוח הטירה",
            expiresAt,
            auditAction: "set_user_cooling",
            successTitle: "קולינג רום הופעל",
            successMessage: `המשתמש נשלח לקולינג רום ל-${days} ימים.`,
        });
    };

    const handleShadowBan = async () => {
        if (!confirm("👻 להפעיל שאדו באן? המשתמש יוכל לפרסם, אבל אחרים לא יראו את התוכן שלו.")) return;

        await applyModerationAction({
            status: "active",
            isGhost: true,
            reason: "הופעל שאדו באן מפרופיל המשתמש",
            expiresAt: null,
            auditAction: "set_user_ghost",
            successTitle: "שאדו באן הופעל",
            successMessage: "המשתמש עבר למצב שאדו באן.",
        });
    };

    const handleReleaseModeration = async () => {
        if (!confirm("לשחרר את המשתמש מכל הגבלה פעילה?")) return;

        await applyModerationAction({
            status: "active",
            isGhost: false,
            reason: null,
            expiresAt: null,
            auditAction: "release_user_moderation",
            successTitle: "ההגבלה הוסרה",
            successMessage: "המשתמש חזר למצב פעיל.",
        });
    };

    const handleChallengeDuel = async () => {
        if (!currentUser || !id) return;
        setDuelLoading(true);
        const { data, error } = await supabase.rpc("create_duel_challenge_secure", {
            p_opponent_id: id,
        });
        const duelId = data?.duel_id;
        if (!error && duelId) {
            window.location.href = `/duels/${duelId}`;
        } else if (error) {
            sendOwl("שגיאה", error.message, "error");
        }
        setDuelLoading(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        setUploadingAvatar(true);
        try {
            const compressed = await imageCompression(file, {
                maxSizeMB: 1,
                maxWidthOrHeight: 1600,
                useWebWorker: true,
                fileType: 'image/webp',
            });
            const sourcePath = `${currentUser.id}/avatar-source.webp`;
            const { error: sourceError } = await supabase.storage.from("avatars").upload(sourcePath, compressed, { upsert: true });
            if (sourceError) throw sourceError;
            const framedAvatar = await renderAvatarFrameBlob(compressed, {
                position: "50% 50%",
                zoom: 1,
            });
            const path = `${currentUser.id}/avatar.webp`;
            const { error } = await supabase.storage.from("avatars").upload(path, framedAvatar, { upsert: true });
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
            const { data: { publicUrl: sourcePublicUrl } } = supabase.storage.from("avatars").getPublicUrl(sourcePath);
            const urlWithBust = `${publicUrl}?t=${Date.now()}`;
            await supabase.from("profiles").update({
                avatar_url: urlWithBust,
            }).eq("id", currentUser.id);
            setAvatarUrl(urlWithBust);
            setAvatarSourceUrl(`${sourcePublicUrl}?t=${Date.now()}`);
        } finally {
            setUploadingAvatar(false);
            e.target.value = "";
        }
    };

    const handleAutoFitAvatar = async () => {
        if (!(avatarSourceUrl || avatarUrl) || !currentUser) return;
        setAutoFittingAvatar(true);
        try {
            let framedAvatar: Blob;
            try {
                framedAvatar = await renderAvatarFrameBlob(avatarSourceUrl || avatarUrl!, {
                    position: "50% 50%",
                    zoom: 1,
                });
            } catch (error) {
                if (!avatarUrl || !avatarSourceUrl || avatarSourceUrl === avatarUrl) throw error;
                setAvatarSourceUrl(null);
                framedAvatar = await renderAvatarFrameBlob(avatarUrl, {
                    position: "50% 50%",
                    zoom: 1,
                });
            }

            const path = `${currentUser.id}/avatar.webp`;
            const { error } = await supabase.storage.from("avatars").upload(path, framedAvatar, { upsert: true });
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
            const urlWithBust = `${publicUrl}?t=${Date.now()}`;
            await supabase.from("profiles").update({ avatar_url: urlWithBust }).eq("id", currentUser.id);
            setAvatarUrl(urlWithBust);
            sendOwl("האווטאר הותאם", "תמונת הפרופיל הותאמה אוטומטית למסגרת.", "success");
        } catch (error) {
            const message = error instanceof Error ? error.message : "לא הצלחנו להתאים את האווטאר אוטומטית.";
            sendOwl("שגיאת אווטאר", message, "error");
        } finally {
            setAutoFittingAvatar(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;
        setUploadingCover(true);
        const compressed = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/webp',
        });
        const path = `${currentUser.id}/cover.webp`;
        const { error } = await supabase.storage.from("avatars").upload(path, compressed, { upsert: true });
        if (!error) {
            const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
            const urlWithBust = `${publicUrl}?t=${Date.now()}`;
            await supabase.from("profiles").update({ cover_url: urlWithBust }).eq("id", currentUser.id);
            setCoverUrl(urlWithBust);
        }
        setUploadingCover(false);
    };


    if (isLoading) return (
        <div className="min-h-screen bg-[#060910] flex items-center justify-center">
            <div className="w-10 h-10 border-t-2 border-amber-500 rounded-full animate-spin" />
        </div>
    );

    if (!profile) return null;

    const house = HOUSE_CONFIG[profile.house] || null;
    const isUnsortedProfile = isUnsortedHouse(profile.house);
    const grp = profile.user_groups as { name: string; color: string } | null;
    const badgeLabel = grp?.name || profile.role || "חבר/ה";
    const badgeColor = grp?.color || getRoleColor(profile.role, profile.house, roleColors);
    const inv = getInventory(profile.inventory);
    const traits = profile.magic_traits || null;
    const allItems = [...inv.items, ...inv.companions, ...inv.cards];
    const postCount = posts.length;
    const joinDate = new Date(profile.created_at).toLocaleDateString("he-IL", { year: "numeric", month: "long" });
    const moderationState = profile.is_ghost
        ? { label: "שאדו באן", color: "#a855f7", background: "rgba(168,85,247,0.12)" }
        : profile.status === "banned"
            ? { label: "באן פעיל", color: "#ef4444", background: "rgba(239,68,68,0.12)" }
            : profile.status === "cooling"
                ? { label: "בקולינג רום", color: "#60a5fa", background: "rgba(96,165,250,0.12)" }
                : null;

    const getThreadTitle = (threadId: string) =>
        threads.find(t => t.id === threadId)?.title || "שרשור";

    return (
        <div className="min-h-screen bg-[#060910] text-white font-assistant" dir="rtl">
            <style>{`
                @keyframes float-particle {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
                    50%       { transform: translateY(-12px) scale(1.1); opacity: 0.8; }
                }
                .particle {
                    position: absolute;
                    border-radius: 50%;
                    pointer-events: none;
                    animation: float-particle var(--dur) var(--delay) ease-in-out infinite;
                }
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .slide-up { animation: slide-up 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
                .delay-1 { animation-delay: 0.1s; opacity: 0; }
                .delay-2 { animation-delay: 0.2s; opacity: 0; }
                .delay-3 { animation-delay: 0.3s; opacity: 0; }
                .delay-4 { animation-delay: 0.4s; opacity: 0; }
                @keyframes bar-fill { from { width: 0; } }
                .trait-bar { animation: bar-fill 1.2s cubic-bezier(0.22,1,0.36,1) forwards; }
                .post-strip {
                    border-right: 2px solid transparent;
                    transition: border-color 0.2s, background 0.2s;
                }
                .post-strip:hover { background: rgba(255,255,255,0.03); }
                .profile-tab {
                    position: relative;
                    transition: color 0.2s;
                }
                .profile-tab::after {
                    content: '';
                    position: absolute;
                    bottom: -1px; left: 0; right: 0;
                    height: 2px;
                    background: var(--accent);
                    transform: scaleX(0);
                    transition: transform 0.2s cubic-bezier(0.22,1,0.36,1);
                }
                .profile-tab.active::after { transform: scaleX(1); }
                .inv-card {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.06);
                    transition: all 0.2s;
                }
                .inv-card:hover {
                    background: rgba(255,255,255,0.05);
                    border-color: var(--accent-dim);
                    transform: translateY(-2px);
                }
                .avatar-upload-overlay {
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .avatar-wrapper:hover .avatar-upload-overlay { opacity: 1; }
                .friend-card {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.06);
                    transition: all 0.2s;
                }
                .friend-card:hover {
                    background: rgba(255,255,255,0.05);
                    transform: translateY(-2px);
                }
            `}</style>

            {/* ══ BANNER / COVER ══ */}
            <div
                ref={bannerRef}
                className="relative h-40 md:h-64 overflow-hidden rounded-b-[2rem] md:rounded-b-[3rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-0"
            >
                {/* Cover image or house gradient */}
                {coverUrl ? (
                    <img
                        src={coverUrl}
                        alt="cover"
                        className="absolute inset-0 w-full h-full object-cover transition-[object-position] duration-100"
                        style={{ objectPosition: coverPosition }}
                        draggable={false}
                    />
                ) : (
                    <div className="absolute inset-0"
                        style={{ background: house?.banner || "linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%)" }} />
                )}

                {/* Overlay darkening when cover image exists */}
                {coverUrl && (
                    <div className="absolute inset-0 bg-black/40" />
                )}

                {/* Particles (only when no cover image) */}
                {!coverUrl && house && Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="particle"
                        style={{
                            left: `${8 + i * 8}%`,
                            top: `${20 + (i % 3) * 25}%`,
                            width: `${4 + (i % 3) * 3}px`,
                            height: `${4 + (i % 3) * 3}px`,
                            background: house.accent,
                            opacity: 0.3,
                            "--dur": `${2.5 + (i % 3) * 0.8}s`,
                            "--delay": `${i * 0.2}s`,
                        } as React.CSSProperties}
                    />
                ))}

                {/* Radial glow */}
                {house && (
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at 30% 50%, ${house.glow} 0%, transparent 65%)` }} />
                )}

                {/* House quote */}
                {house && (
                    <div className="absolute bottom-6 right-6 text-right">
                        <p className="font-cinzel text-[10px] tracking-[0.3em] uppercase"
                            style={{ color: house.accent, opacity: 0.7 }}>
                            {house.name}
                        </p>
                        <p className="font-crimson italic text-white/30 text-sm max-w-xs mt-1">
                            "{house.quote}"
                        </p>
                    </div>
                )}

                {isOwnProfile && (
                    <div className="absolute bottom-4 left-4 z-50 flex items-center gap-2">
                        {/* כפתור שינוי תמונת רקע */}
                        <label
                            htmlFor="cover-upload"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/20 text-white/70 hover:text-white text-xs font-cinzel uppercase tracking-wider backdrop-blur-sm cursor-pointer transition-all"
                        >
                            {uploadingCover ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                            {uploadingCover ? "מעלה..." : "שנה תמונת רקע"}
                            <input
                                id="cover-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleCoverUpload}
                            />
                        </label>

                    </div>
                )}
                {/* Back button */}
                <Link href="/forums"
                    className="absolute top-4 right-4 flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-xs font-cinzel uppercase tracking-widest">
                    <ChevronRight size={14} /> פורומים
                </Link>
            </div>



            {/* ══ PROFILE HEADER ══ */}
            <div className="relative max-w-5xl mx-auto px-4" style={{ zIndex: 10 }}>

                {/* Magical Context Watermark */}
                {house && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 text-[45vw] md:text-[25vw] opacity-[0.03] pointer-events-none select-none blur-[2px] z-[-1]">
                        {house.emoji}
                    </div>
                )}

                {/* ══ PROFILE HEADER INFO ══ */}
                <div className="relative -mt-12 md:-mt-16 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6" style={{ position: 'relative', zIndex: 20 }}>

                    {/* Right Side (Avatar + Name + Badges) */}
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-5 slide-up w-full md:w-auto text-center md:text-right">

                        {/* Avatar */}
                        <div className="avatar-wrapper relative cursor-pointer group shrink-0"
                            onClick={() => isOwnProfile && avatarInputRef.current?.click()}>
                            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                            <MagicAvatar
                                avatarUrl={avatarUrl}
                                name={profile.full_name}
                                house={profile.house}
                                className="w-24 h-24 md:w-32 md:h-32 border-4 border-[#060910] shadow-2xl"
                                roundedClassName="rounded-2xl"
                                fallbackClassName="text-5xl md:text-6xl"
                                style={{ boxShadow: house ? `0 0 30px ${house.glow}, 0 8px 32px rgba(0,0,0,0.8)` : undefined }}
                            />
                            {isOwnProfile && (
                                <div className="avatar-upload-overlay absolute inset-0 rounded-2xl bg-black/60 flex flex-col items-center justify-center gap-1">
                                    {uploadingAvatar ? <Loader2 size={20} className="text-white animate-spin" /> : <Camera size={20} className="text-white" />}
                                    <span className="text-white text-[9px] font-cinzel uppercase tracking-wider">{uploadingAvatar ? "מעלה..." : "שנה"}</span>
                                </div>
                            )}
                            {isOnline && <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#060910] animate-pulse" />}
                        </div>

                        {/* Name & Badges */}
                        <div className="flex flex-col gap-2 pt-2 md:pt-0">
                            <h1 className="font-cinzel text-3xl md:text-4xl font-black tracking-tight"
                                style={{
                                    color: grp?.color || getRoleColor(profile.role, profile.house, roleColors),
                                    textShadow: `0 0 30px ${grp?.color || getRoleColor(profile.role, profile.house, roleColors)}40`
                                }}>
                                {profile.full_name || "קוסם/ת אנונימי/ת"}
                            </h1>
                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                                <span style={{
                                    fontSize: "10px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                                    textTransform: "uppercase", letterSpacing: "0.12em",
                                    padding: "3px 12px", borderRadius: "999px",
                                    color: badgeColor, background: `${badgeColor}20`, border: `1px solid ${badgeColor}50`,
                                }}>
                                    {badgeLabel}
                                </span>
                                {house && (
                                    <span className={`text-[10px] px-3 py-1 rounded-full border font-black uppercase tracking-widest ${house.badgeBg}`}>
                                        {getHouseDisplayIcon(profile.house)} {getHouseDisplayLabel(profile.house, "טרם מוינ/ת")}
                                    </span>
                                )}
                                {profile.duel_badge && (
                                    <span style={{
                                        fontSize: "10px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                                        letterSpacing: "0.1em", padding: "3px 12px", borderRadius: "999px",
                                        color: "#f97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.4)",
                                        textShadow: "0 0 8px rgba(249,115,22,0.5)",
                                    }}>
                                        {profile.duel_badge}
                                    </span>
                                )}
                                <span className="flex items-center gap-1 text-white/30 text-xs mr-1">
                                    {profile.gender === "female" ? <><Venus size={13} className="text-pink-400" /> מכשפה</> : <><Mars size={13} className="text-blue-400" /> קוסם</>}
                                </span>
                            </div>

                            {isUnsortedProfile && (
                                isOwnProfile ? (
                                    <Link
                                        href="/sorting"
                                        className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-xs font-black text-amber-100 transition-all hover:bg-amber-500/20"
                                    >
                                        🎩 טרם עברת מיון. לחצ/י להשלמת הטקס
                                    </Link>
                                ) : (
                                    <div className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-xs font-black text-amber-100">
                                        🎩 הפרופיל הזה עדיין לא עבר מיון לבית
                                    </div>
                                )
                            )}

                            {/* Joining & Year Info */}
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-[11px] text-white/30 font-cinzel mt-1">
                                {(() => {
                                    const y = getYearFromProfile(profile);
                                    return (
                                        <span className="flex items-center gap-1.5">
                                            <BookOpen size={11} /> שנה {getYearLabel(y)} • {getYearTitle(y)}
                                        </span>
                                    );
                                })()}
                                <span className="flex items-center gap-1.5">
                                    <Calendar size={11} /> הצטרפ/ה {joinDate}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Left Side (Actions & Stats) */}
                    <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto slide-up delay-2 mt-2 md:mt-0">
                        <div className="flex flex-wrap justify-center md:justify-end gap-2 w-full">
                            {currentUser && !isOwnProfile && (
                                <>
                                    {moderationState && (
                                        <span
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border font-cinzel text-[10px] font-black uppercase tracking-widest"
                                            style={{
                                                background: moderationState.background,
                                                borderColor: `${moderationState.color}55`,
                                                color: moderationState.color,
                                            }}
                                        >
                                            <ShieldAlert size={13} /> {moderationState.label}
                                        </span>
                                    )}
                                    {canModerate && profile?.role !== 'מייסד' && (
                                        <>
                                            <button
                                                onClick={handleSendToAzkaban}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border font-cinzel text-[10px] font-black uppercase tracking-widest transition-all w-auto"
                                                style={{ background: "rgba(153,27,27,0.2)", borderColor: "rgba(185,28,28,0.5)", color: "#fca5a5" }}
                                            >
                                                <Skull size={13} /> באן
                                            </button>
                                            <button
                                                onClick={handleCoolingRoom}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border font-cinzel text-[10px] font-black uppercase tracking-widest transition-all w-auto"
                                                style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(96,165,250,0.4)", color: "#93c5fd" }}
                                            >
                                                <Clock size={13} /> קולינג
                                            </button>
                                            <button
                                                onClick={handleShadowBan}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border font-cinzel text-[10px] font-black uppercase tracking-widest transition-all w-auto"
                                                style={{ background: "rgba(168,85,247,0.12)", borderColor: "rgba(168,85,247,0.45)", color: "#d8b4fe" }}
                                                title="Shadowban - רואה ואינו נראה"
                                            >
                                                <Ghost size={13} /> שאדו
                                            </button>
                                            {moderationState && (
                                                <button
                                                    onClick={handleReleaseModeration}
                                                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border font-cinzel text-[10px] font-black uppercase tracking-widest transition-all w-auto"
                                                    style={{ background: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.4)", color: "#6ee7b7" }}
                                                >
                                                    <ShieldOff size={13} /> שחרור
                                                </button>
                                            )}
                                        </>
                                    )}
                                    <button
                                        onClick={handleChallengeDuel} disabled={duelLoading}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border font-cinzel text-xs font-black uppercase tracking-widest transition-all w-auto"
                                        style={{ background: "rgba(220,38,38,0.12)", borderColor: "rgba(220,38,38,0.4)", color: "#f87171" }}
                                    >
                                        {duelLoading ? <Loader2 size={13} className="animate-spin" /> : "⚔️"} {duelLoading ? "..." : "אתגר"}
                                    </button>
                                    <button
                                        onClick={isFriend ? handleRemoveFriend : handleAddFriend} disabled={friendshipLoading}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border font-cinzel text-xs font-black uppercase tracking-widest transition-all w-auto"
                                        style={isFriend
                                            ? { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }
                                            : { background: house?.accent ? `${house.accent}20` : "rgba(245,158,11,0.15)", borderColor: house?.accent ? `${house.accent}50` : "rgba(245,158,11,0.4)", color: house?.accent || "#f59e0b" }
                                        }
                                    >
                                        {friendshipLoading ? <Loader2 size={13} className="animate-spin" /> : isFriend ? <UserMinus size={13} /> : <UserPlus size={13} />}
                                        {friendshipLoading ? "..." : isFriend ? "הסר/י" : "הוסף/י חבר/ה"}
                                    </button>
                                </>
                            )}

                            {isOwnProfile && avatarUrl && (
                                <button
                                    type="button"
                                    onClick={handleAutoFitAvatar}
                                    disabled={autoFittingAvatar}
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black text-white/70 transition-all hover:bg-white/[0.08] hover:text-white"
                                >
                                    {autoFittingAvatar ? "מיישר..." : "התאם אווטאר אוטומטית"}
                                </button>
                            )}
                        </div>

                        {/* Stats bar • desktop */}
                        <div className="hidden md:flex items-center gap-6 mt-2">
                            <div className="text-center">
                                <div className="font-cinzel font-black text-xl text-white">{postCount}</div>
                                <div className="text-[10px] text-white/30 font-cinzel uppercase tracking-widest">הודעות</div>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <div className="font-cinzel font-black text-xl text-amber-400">{profile.galleons?.toLocaleString() || 0}</div>
                                <div className="text-[10px] text-white/30 font-cinzel uppercase tracking-widest">גליאונים</div>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <div className="font-cinzel font-black text-xl text-white">{profile.points_contributed?.toLocaleString() || 0}</div>
                                <div className="text-[10px] text-white/30 font-cinzel uppercase tracking-widest">נקודות בית</div>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <div className="font-cinzel font-black text-xl" style={{ color: house?.accent || "#f8fafc" }}>{friends.length}</div>
                                <div className="text-[10px] text-white/30 font-cinzel uppercase tracking-widest">חברים</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile stats */}
                <div className="flex md:hidden items-center gap-4 mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] slide-up delay-2">
                    <div className="text-center flex-1">
                        <div className="font-cinzel font-black text-lg text-white">{postCount}</div>
                        <div className="text-[9px] text-white/30 font-cinzel uppercase">הודעות</div>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="text-center flex-1">
                        <div className="font-cinzel font-black text-lg text-amber-400">{profile.galleons?.toLocaleString() || 0}</div>
                        <div className="text-[9px] text-white/30 font-cinzel uppercase">גליאונים</div>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="text-center flex-1">
                        <div className="font-cinzel font-black text-lg text-white">{profile.points_contributed?.toLocaleString() || 0}</div>
                        <div className="text-[9px] text-white/30 font-cinzel uppercase">נקודות</div>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="text-center flex-1">
                        <div className="font-cinzel font-black text-lg" style={{ color: house?.accent || "#f8fafc" }}>{friends.length}</div>
                        <div className="text-[9px] text-white/30 font-cinzel uppercase">חברים</div>
                    </div>
                </div>

                {/* ══ MAIN CONTENT ══ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">

                    {/* ── LEFT SIDEBAR ── */}
                    <aside className="lg:col-span-1 space-y-4 slide-up delay-3">

                        {/* Traits */}
                        {traits && (
                            <div className="relative rounded-3xl border border-white/[0.08] bg-[#0a0f1a]/80 backdrop-blur-xl p-6 md:p-7 shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden group">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-amber-500/20 transition-all duration-1000" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none" />

                                <div className="relative z-10 space-y-5">
                                    <h3 className="font-cinzel text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <Sparkles size={12} className="text-amber-500" /> תכונות קסומות
                                    </h3>
                                    {TRAITS.map(t => (
                                        <div key={t.key} className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-cinzel text-white/50 flex items-center gap-1.5">
                                                    {t.icon} {t.name}
                                                </span>
                                                <span className="font-cinzel font-black text-sm" style={{ color: t.color }}>
                                                    {traits[t.key] || 0}
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                                                <div className="trait-bar h-full rounded-full"
                                                    style={{
                                                        width: `${traits[t.key] || 0}%`,
                                                        background: t.color,
                                                        boxShadow: `0 0 8px ${t.color}60`,
                                                        animationDelay: "0.3s",
                                                    }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Wand */}
                        {profile.wand_type && (
                            <div className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-6 shadow-xl overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-amber-900/10 pointer-events-none" />
                                <h3 className="relative z-10 font-cinzel text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <Wand2 size={12} className="text-amber-500/60" /> השרביט
                                </h3>
                                <p className="font-crimson italic text-white/60 text-sm leading-relaxed pr-3 border-r border-amber-500/20">
                                    {profile.wand_type}
                                </p>
                            </div>
                        )}

                        {/* Spells */}
                        {profile.learned_spells?.length > 0 && (
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                <h3 className="font-cinzel text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <Star size={12} className="text-amber-500/60" /> כשפים שנלמדו
                                </h3>
                                <div className="font-cinzel font-black text-3xl" style={{ color: house?.accent || "#f8fafc" }}>
                                    {profile.learned_spells.length}
                                </div>
                                <p className="text-[10px] text-white/25 mt-1 font-cinzel uppercase tracking-widest">לחשים שולטים</p>
                            </div>
                        )}

                        {/* Friends preview in sidebar */}
                        {friends.length > 0 && (
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                <h3 className="font-cinzel text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <Users size={12} className="text-amber-500/60" /> חברים ({friends.length})
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {friends.slice(0, 8).map(f => {
                                        const fHouse = HOUSE_CONFIG[f.house] || null;
                                        return (
                                            <Link key={f.id} href={`/wizard/${f.id}`}
                                                className="flex flex-col items-center gap-1 group"
                                                title={f.full_name}>
                                                <MagicAvatar
                                                    avatarUrl={f.avatar_url}
                                                    name={f.full_name}
                                                    house={f.house}
                                                    className="w-10 h-10 border-2 border-white/[0.08] transition-all group-hover:border-white/30"
                                                    roundedClassName="rounded-xl"
                                                    fallbackClassName="text-xl"
                                                />
                                                <span className="text-[9px] text-white/30 group-hover:text-white/60 transition-colors truncate max-w-[40px] font-cinzel">
                                                    {f.full_name?.split(" ")[0]}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                    {friends.length > 8 && (
                                        <button onClick={() => setActiveTab("friends")}
                                            className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[10px] font-cinzel text-white/30 hover:text-white/60 transition-colors">
                                            +{friends.length - 8}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* ── MAIN AREA ── */}
                    <div className="lg:col-span-2 space-y-4 slide-up delay-4">

                        {/* Tabs */}
                        <div className="flex border-b border-white/[0.06] overflow-x-auto"
                            style={{ "--accent": house?.accent || "#f59e0b" } as React.CSSProperties}>
                                {[
                                { key: "posts", label: "הודעות", icon: <MessageSquare size={13} />, count: postCount },
                                { key: "inventory", label: "חפצים", icon: <Package size={13} />, count: allItems.length },
                                { key: "traits", label: "תכונות", icon: <Shield size={13} />, count: null },
                                { key: "friends", label: "חברים", icon: <Users size={13} />, count: friends.length },
                                { key: "duels", label: "קרבות", icon: <Swords size={13} />, count: duelsHistory.length },
                            ].map(tab => (
                                <button key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`profile-tab shrink-0 flex items-center gap-2 px-4 py-3 text-xs font-cinzel font-black uppercase tracking-widest transition-colors ${activeTab === tab.key ? "active text-white" : "text-white/30 hover:text-white/60"}`}
                                    style={{ "--accent": house?.accent || "#f59e0b" } as React.CSSProperties}>
                                    {tab.icon} {tab.label}
                                    {tab.count !== null && tab.count > 0 && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Posts tab */}
                        {activeTab === "posts" && (
                            <div className="space-y-2">
                                {posts.length === 0 ? (
                                    <div className="py-16 text-center text-white/20 font-crimson italic text-lg">
                                        הקוסם עוד לא כתב בפורומים
                                    </div>
                                ) : posts.map(post => {
                                    const threadTitle = getThreadTitle(post.thread_id);
                                    const preview = post.content
                                        .replace(/<[^>]+>/g, "")
                                        .replace(/&nbsp;/g, " ")
                                        .replace(/&amp;/g, "&")
                                        .replace(/&lt;/g, "<")
                                        .replace(/&gt;/g, ">")
                                        .replace(/&quot;/g, '"')
                                        .trim()
                                        .slice(0, 120);
                                    return (
                                        <Link key={post.id}
                                            href={`/forums/thread/${post.thread_id}`}
                                            className="post-strip block rounded-xl p-4 pr-5 group"
                                            style={{ borderRightColor: house?.accent + "80" }}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-cinzel text-xs font-black text-white/40 mb-1.5 flex items-center gap-1.5 group-hover:text-white/60 transition-colors truncate">
                                                        <ExternalLink size={10} />
                                                        {threadTitle}
                                                    </p>
                                                    <p className="text-white/70 text-sm font-crimson leading-relaxed line-clamp-2">
                                                        {preview}…
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-white/20 shrink-0 mt-1">
                                                    <Clock size={9} />
                                                    {timeAgo(post.created_at)}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        {/* Inventory tab */}
                        {activeTab === "inventory" && (
                            <div>
                                {allItems.length === 0 ? (
                                    <div className="py-16 text-center text-white/20 font-crimson italic text-lg">
                                        המזוודה ריקה
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {allItems.map((item: any, i: number) => (
                                            <div key={i} className="inv-card rounded-xl p-4 text-center"
                                                style={{ "--accent-dim": house?.accent + "30" } as React.CSSProperties}>
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name}
                                                        className="w-14 h-14 object-cover rounded-lg mx-auto mb-3 border border-white/10" />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-lg mx-auto mb-3 flex items-center justify-center text-2xl bg-white/[0.03] border border-white/[0.06]">
                                                        🎁
                                                    </div>
                                                )}
                                                <p className="font-cinzel text-[10px] font-black text-white/70 uppercase tracking-wide truncate">
                                                    {item.name}
                                                </p>
                                                {item.rarity && (
                                                    <p className="text-[9px] text-white/25 mt-1 uppercase">{item.rarity}</p>
                                                )}
                                                {getItemBoostBadges(item).map((badge, bi) => (
                                                    <span key={bi} className="inline-block mt-1.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400/80 font-cinzel">
                                                        {badge}
                                                    </span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Traits tab */}
                        {activeTab === "traits" && (
                            <div className="p-4 space-y-5">
                                {!traits ? (
                                    <div className="py-16 text-center text-white/20 font-crimson italic text-lg">
                                        התכונות עדיין לא נחשפו. צריך לעבור קודם את טקס המיון.
                                    </div>
                                ) : TRAITS.map(t => (
                                    <div key={t.key} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{t.icon}</span>
                                                <p className="font-cinzel text-sm font-black text-white/80">{t.name}</p>
                                            </div>
                                            <span className="font-cinzel font-black text-2xl" style={{ color: t.color }}>
                                                {traits[t.key] || 0}
                                            </span>
                                        </div>
                                        <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden">
                                            <div className="trait-bar h-full rounded-full"
                                                style={{
                                                    width: `${traits[t.key] || 0}%`,
                                                    background: `linear-gradient(90deg, ${t.color}80, ${t.color})`,
                                                    boxShadow: `0 0 12px ${t.color}60`,
                                                }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Duels tab */}
                        {activeTab === "duels" && (
                            <div>
                                {duelsHistory.length === 0 ? (
                                    <div className="py-16 text-center text-white/20 font-crimson italic text-lg">
                                        הקוסם/ת עוד לא השתתפ/ה בדו-קרבות
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {duelsHistory.map((duel: any) => {
                                            const profileId = id;
                                            const isChallenger = duel.challenger?.id === profileId;
                                            const self = isChallenger ? duel.challenger : duel.opponent;
                                            const enemy = isChallenger ? duel.opponent : duel.challenger;
                                            const won = duel.winner_id === profileId;
                                            const tied = !duel.winner_id;
                                            const enemyHouse = enemy?.house ? HOUSE_CONFIG[enemy.house] : null;
                                            return (
                                                <Link key={duel.id} href={`/duels/${duel.id}`}
                                                    className="flex items-center gap-4 rounded-xl p-4 transition-all"
                                                    style={{
                                                        background: tied
                                                            ? "rgba(255,255,255,0.03)"
                                                            : won
                                                                ? "rgba(34,197,94,0.06)"
                                                                : "rgba(239,68,68,0.06)",
                                                        border: `1px solid ${tied ? "rgba(255,255,255,0.06)" : won ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
                                                    }}>
                                                    {/* Result badge */}
                                                    <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
                                                        style={{
                                                            background: tied
                                                                ? "rgba(255,255,255,0.06)"
                                                                : won
                                                                    ? "rgba(34,197,94,0.15)"
                                                                    : "rgba(239,68,68,0.12)",
                                                        }}>
                                                        {tied ? "🤝" : won ? "🏆" : "💥"}
                                                    </div>
                                                    {/* Enemy info */}
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <MagicAvatar
                                                            avatarUrl={enemy?.avatar_url}
                                                            name={enemy?.full_name}
                                                            house={enemy?.house}
                                                            className="w-9 h-9 border border-white/[0.08] shrink-0"
                                                            roundedClassName="rounded-xl"
                                                            fallbackClassName="text-lg"
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="font-cinzel text-xs font-black text-white/70 truncate">
                                                                {tied ? "תיקו מול " : won ? "ניצחת את " : "הפסדת מול "}
                                                                <span style={{ color: enemyHouse?.accent || "white" }}>{enemy?.full_name || "קוסם/ת"}</span>
                                                            </p>
                                                            {enemyHouse && (
                                                                <p className="text-[9px] mt-0.5" style={{ color: enemyHouse.accent }}>
                                                                    {getHouseDisplayIcon(enemy?.house)} {getHouseDisplayLabel(enemy?.house)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Date */}
                                                    <div className="shrink-0 flex items-center gap-1 text-[10px] text-white/20">
                                                        <Clock size={9} />
                                                        {timeAgo(duel.finished_at || duel.created_at)}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Friends tab */}
                        {activeTab === "friends" && (
                            <div>
                                {friends.length === 0 ? (
                                    <div className="py-16 text-center text-white/20 font-crimson italic text-lg">
                                        {isOwnProfile ? "עדיין אין לך חברים. חפש/י קוסמים להתחבר אליהם." : "עדיין אין חברים בפרופיל הזה"}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {friends.map(f => {
                                            const fHouse = HOUSE_CONFIG[f.house] || null;
                                            return (
                                                <Link key={f.id} href={`/wizard/${f.id}`}
                                                    className="friend-card rounded-xl p-4 flex flex-col items-center gap-3">
                                                    <MagicAvatar
                                                        avatarUrl={f.avatar_url}
                                                        name={f.full_name}
                                                        house={f.house}
                                                        className="w-16 h-16 border-2 border-white/[0.08]"
                                                        roundedClassName="rounded-2xl"
                                                        fallbackClassName="text-3xl"
                                                    />
                                                    <div className="text-center">
                                                        <p className="font-cinzel text-xs font-black text-white/80 truncate max-w-[100px]">
                                                            {f.full_name || "קוסם"}
                                                        </p>
                                                        {fHouse && (
                                                            <p className="text-[9px] mt-0.5" style={{ color: fHouse.accent }}>
                                                                {getHouseDisplayLabel(f.house)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

