"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Menu, X, Castle, MessageSquare, ScrollText, LogOut, Zap,
    Volume2, VolumeX, Settings, LayoutGrid, ShoppingBag,
    Flame, Coins, Library, Search, PlusCircle, LogIn,
    User, ChevronDown, Shield, BookOpen, Loader2, Sparkles, HelpCircle
} from "lucide-react";
import { useUIState } from "@/context/UIContext";
import { triggerAudioPlay } from "@/utils/audioTrigger";
import { useAuth } from "@/context/AuthContext";
import { getNamedRoleColor, getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";
import { getHouseDisplayLabel, getHousePalette, withAlpha } from "@/lib/houses";
import { getNewsArticlePath } from "@/lib/seo";
import NotificationDropdown from "@/components/NotificationDropdown";
import MagicTicker from "@/components/MagicTicker";
import QuestBeacon from "@/components/QuestBeacon";
import MagicAvatar from "@/components/MagicAvatar";
import { computeQuestProgress, fetchQuestActivitySummary } from "@/lib/gameplay/questProgress";
import { fetchQuestCatalog, subscribeToQuestCatalogChanges } from "@/lib/gameplay/questCatalog";
import { computeNextActions, type NextActionRecommendation } from "@/lib/gameplay/nextActionEngine";

const PAGE_CTA: Record<string, { label: string; href: string }> = {
    '/library': { label: 'כתוב יצירה', href: '/library/create' },
    '/forums': { label: 'צור אשכול', href: '/forums/create' },
};

const NEXT_ACTIONS_ENABLED = true;
const QUESTS_FAQ_LINK = "/faq";

type LiveResult = { id: string; title: string; type: 'story' | 'news' | 'thread'; href: string };
type StorySearchRow = { id: string; title: string };
type NewsSearchRow = { id: string; title: string };
type ThreadSearchRow = {
    id: string;
    title: string;
    forums: { slug: string | null } | { slug: string | null }[] | null;
};

const TYPE_META = {
    story:  { label: 'סיפור',  icon: BookOpen,     color: '#818cf8' },
    news:   { label: 'כתבה',   icon: ScrollText,   color: '#94a3b8' },
    thread: { label: 'אשכול',  icon: MessageSquare,color: '#f59e0b' },
};

function LiveDropdown({ results, onSelect }: { results: LiveResult[]; onSelect: () => void }) {
    return (
        <div
            className="absolute right-0 left-0 top-[calc(100%+6px)] bg-[#070d1a] border border-white/10 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden z-[650]"
            dir="rtl"
        >
            {results.map((r) => {
                const m = TYPE_META[r.type];
                const Icon = m.icon;
                return (
                    <Link
                        key={r.id}
                        href={r.href}
                        onClick={onSelect}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors border-b border-white/[0.04] last:border-0 group"
                    >
                        <Icon size={14} style={{ color: m.color }} className="shrink-0" />
                        <span className="font-assistant text-sm text-white/80 group-hover:text-white truncate flex-1">{r.title}</span>
                        <span className="font-cinzel text-[9px] font-black uppercase tracking-widest shrink-0" style={{ color: m.color }}>{m.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchMode, setSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
    const avatarMenuRef = useRef<HTMLDivElement>(null);
    const [nextAction, setNextAction] = useState<NextActionRecommendation | null>(null);
    const [nextActionLoading, setNextActionLoading] = useState(false);

    // Live search
    const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
    const [liveLoading, setLiveLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const [supabase] = useState(() => createClient());
    const { isMuted, toggleMute } = useUIState();

    // שליפת הפרופיל מהקונטקסט (אם אין פרופיל, סימן שזה אורח)
    const { profile, session } = useAuth();
    const isAuthenticated = Boolean(session);
    const isGuest = !isAuthenticated;
    const displayProfileId = profile?.id || session?.user?.id || "";
    const displayName =
        profile?.full_name ||
        session?.user?.user_metadata?.full_name ||
        session?.user?.email?.split("@")[0] ||
        "Community Member";
    const displayHouse = profile?.house || "Unknown";
    const displayHouseLabel = getHouseDisplayLabel(displayHouse, "טרם מוינ/ת");
    const displayGalleons = profile?.galleons?.toLocaleString() || "0";
    const displayHousePalette = getHousePalette(displayHouse);
    const profileGroupId =
        typeof profile?.group_id === "string" || typeof profile?.group_id === "number"
            ? profile.group_id
            : null;
    const profilePointsContributed = typeof profile?.points_contributed === "number" ? profile.points_contributed : 0;
    const profileDailyPointsEarned = typeof profile?.daily_points_earned === "number" ? profile.daily_points_earned : 0;
    const profileLastRewardDate = typeof profile?.last_reward_date === "string" ? profile.last_reward_date : null;
    const profileLastTriviaDate = typeof profile?.last_trivia_date === "string" ? profile.last_trivia_date : null;
    const profileLastNifflerDate = typeof profile?.last_niffler_date === "string" ? profile.last_niffler_date : null;
    const profileLastSnitchDate = typeof profile?.last_snitch_date === "string" ? profile.last_snitch_date : null;

    const [nameColor, setNameColor] = useState<string>("rgba(255,255,255,0.85)");
    const [displayGroupName, setDisplayGroupName] = useState<string | null>(null);
    useEffect(() => {
        if (!profile) {
            queueMicrotask(() => {
                setNameColor("rgba(255,255,255,0.85)");
                setDisplayGroupName(null);
            });
            return;
        }
        (async () => {
            // אם יש group_id — קח ישירות את צבע הקבוצה
            if (profileGroupId !== null) {
                const { data } = await supabase
                    .from("user_groups")
                    .select("name, color")
                    .eq("id", profileGroupId)
                    .single();
                const groupMeta = data as { name?: string | null; color?: string | null } | null;
                const officialGroupPalette = getHousePalette(groupMeta?.name);
                setDisplayGroupName(groupMeta?.name ?? null);
                if (officialGroupPalette) { setNameColor(officialGroupPalette.readable); return; }
                if (groupMeta?.color) { setNameColor(groupMeta.color); return; }
            } else {
                setDisplayGroupName(null);
            }
            // fallback — roleColors לפי שם דרגה
            const map = await getRoleColorFromDB(supabase);
            const roleColor = getNamedRoleColor(profile.role, map);
            if (roleColor) {
                setNameColor(roleColor);
                return;
            }

            setNameColor(getRoleColor(null, profile.house, map));
        })();
    }, [profile, profileGroupId, supabase]);

    const identityMeta = [
        displayGroupName,
        displayHouseLabel,
        profile?.year ? `שנה ${profile.year}` : null,
    ].filter(Boolean).join(" · ");

    const loadNextAction = useCallback(async () => {
        if (!NEXT_ACTIONS_ENABLED || !isAuthenticated || !displayProfileId) {
            setNextAction(null);
            setNextActionLoading(false);
            return;
        }

        setNextActionLoading(true);

        const [activity, questCatalog] = await Promise.all([
            fetchQuestActivitySummary(supabase, displayProfileId),
            fetchQuestCatalog(supabase),
        ]);
        const questProgress = computeQuestProgress({
            id: displayProfileId,
            house: displayHouse,
            points_contributed: profilePointsContributed,
            daily_points_earned: profileDailyPointsEarned,
            last_reward_date: profileLastRewardDate,
            last_trivia_date: profileLastTriviaDate,
            last_niffler_date: profileLastNifflerDate,
            last_snitch_date: profileLastSnitchDate,
        }, activity, questCatalog);
        const recommendations = computeNextActions({
            profile: {
                daily_points_earned: profileDailyPointsEarned,
                house: displayHouse,
            },
            questProgress,
        });

        setNextAction(recommendations[0] ?? null);
        setNextActionLoading(false);
    }, [
        displayHouse,
        displayProfileId,
        isAuthenticated,
        profileDailyPointsEarned,
        profileLastNifflerDate,
        profileLastRewardDate,
        profileLastSnitchDate,
        profileLastTriviaDate,
        profilePointsContributed,
        supabase,
    ]);

    useEffect(() => {
        if (!NEXT_ACTIONS_ENABLED || !isAuthenticated || !displayProfileId) {
            queueMicrotask(() => {
                setNextAction(null);
                setNextActionLoading(false);
            });
            return;
        }

        void loadNextAction();

        const activityChannel = supabase
            .channel(`header-quest-activity-${displayProfileId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "activity_events",
                    filter: `actor_id=eq.${displayProfileId}`,
                },
                () => {
                    void loadNextAction();
                }
            )
            .subscribe();

        const profileChannel = supabase
            .channel(`header-quest-profile-${displayProfileId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "profiles",
                    filter: `id=eq.${displayProfileId}`,
                },
                () => {
                    void loadNextAction();
                }
            )
            .subscribe();

        const questCatalogChannel = subscribeToQuestCatalogChanges(
            supabase,
            `header-${displayProfileId}`,
            loadNextAction,
        );

        return () => {
            void supabase.removeChannel(activityChannel);
            void supabase.removeChannel(profileChannel);
            void supabase.removeChannel(questCatalogChannel);
        };
    }, [
        displayProfileId,
        isAuthenticated,
        loadNextAction,
        supabase,
    ]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        } else {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        }
        return () => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
        return () => clearTimeout(timer);
    }, [pathname]);

    useEffect(() => {
        if (!searchMode) {
            queueMicrotask(() => {
                setSearchQuery("");
                setLiveResults([]);
            });
        }
    }, [searchMode]);

    // Debounced live search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const q = searchQuery.trim();
        if (q.length < 2) {
            queueMicrotask(() => {
                setLiveResults([]);
                setLiveLoading(false);
            });
            return;
        }
        queueMicrotask(() => {
            setLiveLoading(true);
        });
        debounceRef.current = setTimeout(async () => {
            const found: LiveResult[] = [];
            const [{ data: stories }, { data: news }, { data: threads }] = await Promise.all([
                supabase.from('stories').select('id, title').eq('is_published', true).ilike('title', `%${q}%`).limit(3),
                supabase.from('news').select('id, title').ilike('title', `%${q}%`).limit(3),
                supabase.from('threads').select('id, title, forums(slug)').ilike('title', `%${q}%`).limit(3),
            ]);
            ((stories as StorySearchRow[] | null) || []).forEach((story) => {
                found.push({ id: story.id, title: story.title, type: 'story', href: `/library/${story.id}` });
            });
            ((news as NewsSearchRow[] | null) || []).forEach((article) => {
                found.push({ id: article.id, title: article.title, type: 'news', href: getNewsArticlePath(article.id) });
            });
            ((threads as ThreadSearchRow[] | null) || []).forEach((thread) => {
                const forumMeta = Array.isArray(thread.forums) ? thread.forums[0] : thread.forums;
                if (!forumMeta?.slug) return;
                found.push({ id: thread.id, title: thread.title, type: 'thread', href: `/forums/${forumMeta.slug}/${thread.id}` });
            });
            setLiveResults(found);
            setLiveLoading(false);
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery, supabase]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") { setSearchMode(false); setAvatarMenuOpen(false); }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
                setAvatarMenuOpen(false);
            }
        };
        if (avatarMenuOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [avatarMenuOpen]);

    if (pathname === "/" || pathname.startsWith("/dashboard")) return null;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        setIsOpen(false);
        window.location.href = "/";
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchMode(false);
            setIsOpen(false);
            setLiveResults([]);
        }
    };

    const closeLiveResults = () => { setLiveResults([]); setSearchMode(false); setIsOpen(false); };

    const houseFrameStyle = {
        borderColor: withAlpha(displayHousePalette?.secondary || "#D3A625", 0.45),
        color: displayHousePalette?.primary || "#D3A625",
        boxShadow: `0 0 22px ${withAlpha(displayHousePalette?.primary || "#D3A625", 0.18)}`,
    };
    const currentCTA = Object.entries(PAGE_CTA).find(([path]) => pathname.startsWith(path))?.[1];
    const hideQuestBeacon = isOpen || avatarMenuOpen;
    const questBeaconClassName = pathname.startsWith("/great-hall") ? "hidden md:block" : "";
    const missionHref = nextAction?.href || "/quests";
    const missionTitle = nextActionLoading
        ? "מגבש את הצעד הבא שלך"
        : nextAction?.title || "פתח/י את לוח המשימות";
    const missionHint = nextAction?.gainLabel || "התקדמות, תגמול והשפעה על הבית במקום אחד";
    const navLinks = [
        { name: "רחבת הכניסה", href: "/home", icon: Sparkles },
        { name: "הטירה", href: "/dashboard", icon: Castle },
        { name: "מסדרונות", href: "/forums", icon: LayoutGrid },
        { name: "האולם הגדול", href: "/great-hall", icon: MessageSquare },
        { name: "דיאגון", href: "/shop", icon: ShoppingBag },
        { name: "אוליבנדר", href: "/ollivanders", icon: Flame },
        { name: "הנביא היומי", href: "/news", icon: ScrollText },
        { name: "משימות", href: "/quests", icon: Zap },
        { name: "ספרייה", href: "/library", icon: Library },
    ];

    return (
        <>
            <header
                className={`fixed top-0 w-full z-[500] transition-all duration-500 flex flex-col ${isOpen
                    ? "bg-[#020617] border-b border-amber-500/30"
                    : isScrolled
                        ? "bg-[#020617]/95 backdrop-blur-2xl border-b border-white/5 shadow-2xl"
                        : "bg-[#020617] border-b border-amber-500/10"
                }`}
                dir="rtl"
            >
                <div className={`transition-all duration-300 ${isOpen ? "py-3" : isScrolled ? "py-2 md:py-3" : "py-4 md:py-6"}`}>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

                <div className="w-full max-w-[1440px] mx-auto px-3 md:px-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 xl:gap-8 flex-1 min-w-0">
                        <div className="flex items-center shrink-0">
                            <Link href="/home" className="group relative transition-transform hover:scale-105 block">
                                <Image
                                    src="/logo.png"
                                    alt="Lumos IL Logo"
                                    width={220}
                                    height={220}
                                    className="h-[60px] md:h-[90px] lg:h-[120px] w-auto object-contain drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                                    priority
                                />
                            </Link>
                        </div>

                        {/* Desktop search mode — מחליף את הניווט */}
                        {searchMode ? (
                            <div className="hidden lg:block flex-1 relative">
                                <form onSubmit={handleSearch} className="flex items-center gap-3 bg-white/5 border border-amber-500/30 rounded-2xl px-4 py-2" dir="rtl">
                                    {liveLoading
                                        ? <Loader2 size={16} className="text-amber-500/60 shrink-0 animate-spin" />
                                        : <Search size={16} className="text-amber-500/60 shrink-0" />
                                    }
                                    <input
                                        autoFocus
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="חפש בטירה..."
                                        className="flex-1 bg-transparent text-white outline-none text-right font-assistant text-sm"
                                        dir="rtl"
                                    />
                                    <button type="button" onClick={() => setSearchMode(false)}>
                                        <X size={16} className="text-white/40 hover:text-white transition-colors" />
                                    </button>
                                </form>
                                {liveResults.length > 0 && (
                                    <LiveDropdown results={liveResults} onSelect={closeLiveResults} />
                                )}
                            </div>
                        ) : (
                            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 glass-panel p-1.5 rounded-2xl border border-white/10 bg-white/5">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={`flex items-center gap-1.5 px-2 xl:px-3.5 py-2 rounded-xl font-cinzel text-[10px] font-bold tracking-widest uppercase transition-all duration-300 ${pathname === link.href
                                            ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                                            : "text-white/40 hover:text-white hover:bg-white/5"
                                            }`}
                                    >
                                        <link.icon size={13} className={pathname === link.href ? "text-black" : "text-amber-500/40"} />
                                        <span className="hidden xl:inline">{link.name}</span>
                                    </Link>
                                ))}
                            </nav>
                        )}

                    </div>

                    {/* ══ צד ימין: [Galleons] [🔔] [Avatar▼] [☰] ══ */}
                    <div className="flex items-center gap-2 md:gap-3">

                        {isGuest ? (
                            <Link href="/" className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-cinzel font-black text-[10px] tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
                                <LogIn size={13} /> להתחברות
                            </Link>
                        ) : (
                            <>
                                {/* Galleons */}
                                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/50 border shadow-lg shrink-0" style={houseFrameStyle}>
                                    <Coins size={13} className="text-amber-500" />
                                    <span className="font-cinzel font-black text-white text-[11px]">{displayGalleons}</span>
                                </div>

                                {/* Mute toggle */}
                                <button
                                    onClick={() => { if (isMuted) triggerAudioPlay(); toggleMute(); }}
                                    title={isMuted ? "הפעל מוזיקה" : "השתק מוזיקה"}
                                    aria-label={isMuted ? "הפעל מוזיקה" : "השתק מוזיקה"}
                                    className="shrink-0 hidden md:flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 hover:border-amber-500/30 transition-all duration-200"
                                >
                                    {isMuted
                                        ? <VolumeX size={15} className="text-white/50" />
                                        : <Volume2 size={15} className="text-amber-400 animate-pulse" />
                                    }
                                </button>

                                {/* Notifications */}
                                <div className="relative shrink-0 flex items-center">
                                    <NotificationDropdown />
                                    <style jsx global>{`.notification-dropdown-container { min-width: 320px !important; }`}</style>
                                </div>

                                {/* Avatar + Dropdown — כל האייקונים בפנים */}
                                <div className="relative hidden md:block shrink-0" ref={avatarMenuRef}>
                                    <button
                                        onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                                        className="flex items-center gap-1.5 group"
                                        aria-label="תפריט משתמש"
                                    >
                                        <div className="w-9 h-9 rounded-full border-2 overflow-hidden shadow-2xl transition-transform group-hover:scale-105" style={houseFrameStyle}>
                                            <MagicAvatar
                                                avatarUrl={profile?.avatar_url}
                                                name={displayName}
                                                house={profile?.house}
                                                className="h-full w-full"
                                                roundedClassName="rounded-full"
                                                fallbackClassName="text-lg"
                                            />
                                        </div>
                                        <ChevronDown size={11} className={`text-white/30 transition-transform duration-200 ${avatarMenuOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {avatarMenuOpen && (
                                        <div
                                            className="absolute right-0 top-[calc(100%+12px)] w-80 max-w-[calc(100vw-1.5rem)] bg-[#070d1a] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[600] overflow-hidden"
                                            dir="rtl"
                                            style={{ animation: "avatarMenuIn 0.18s cubic-bezier(0.22,1,0.36,1) forwards" }}
                                        >
                                            <style>{`
                                                @keyframes avatarMenuIn {
                                                    from { opacity: 0; transform: translateY(-8px) scale(0.96); }
                                                    to   { opacity: 1; transform: translateY(0) scale(1); }
                                                }
                                            `}</style>

                                            {/* ── User info ── */}
                                            <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full border overflow-hidden shrink-0 flex items-center justify-center text-lg"
                                                    style={{ ...houseFrameStyle, background: "rgba(255,255,255,0.04)" }}>
                                                    <MagicAvatar
                                                        avatarUrl={profile?.avatar_url}
                                                        name={displayName}
                                                        house={profile?.house}
                                                        className="h-full w-full"
                                                        roundedClassName="rounded-full"
                                                        fallbackClassName="text-lg"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-assistant font-bold text-sm truncate" title={identityMeta} style={{ color: nameColor }}>{displayName}</p>
                                                    <p className="font-assistant text-xs text-white/35 mt-0.5">{identityMeta}</p>
                                                </div>
                                            </div>

                                            {false && !isGuest && (
                                                <div className="px-4 py-4 border-b border-white/[0.07]">
                                                    <div className="rounded-[1.6rem] border border-amber-500/15 bg-amber-500/[0.06] p-4 shadow-[0_0_24px_rgba(245,158,11,0.06)]">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="min-w-0">
                                                                <p className="font-cinzel text-[9px] font-black uppercase tracking-[0.3em] text-amber-300/70">
                                                                    מה כדאי לעשות עכשיו
                                                                </p>
                                                                <p className="mt-1 font-assistant text-sm font-semibold leading-6 text-white/90">
                                                                    {missionTitle}
                                                                </p>
                                                                <p className="mt-1 text-xs leading-5 text-white/50">
                                                                    {missionHint}
                                                                </p>
                                                            </div>
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-black/20">
                                                                <Sparkles size={14} className="text-amber-400" />
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 space-y-2.5">
                                                            <Link
                                                                href={missionHref}
                                                                onClick={() => setAvatarMenuOpen(false)}
                                                                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-center font-assistant text-sm font-bold text-amber-950 transition-colors hover:bg-amber-400"
                                                            >
                                                                <Zap size={13} />
                                                                לצעד הבא
                                                            </Link>
                                                            <Link
                                                                href={QUESTS_FAQ_LINK}
                                                                onClick={() => setAvatarMenuOpen(false)}
                                                                className="flex w-full min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-center font-assistant text-sm font-semibold text-white/65 transition-colors hover:text-white"
                                                            >
                                                                <HelpCircle size={13} className="text-amber-400/70" />
                                                                הסבר מהיר
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Search ── */}
                                            <div className="px-3 pt-2.5 pb-1 border-b border-white/[0.07]">
                                                <button
                                                    onClick={() => { setAvatarMenuOpen(false); setSearchMode(true); }}
                                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/45 hover:text-white hover:bg-white/[0.05] transition-colors text-right"
                                                >
                                                    <Search size={15} className="text-white/25 shrink-0" />
                                                    <span className="font-assistant text-sm">חיפוש בטירה...</span>
                                                </button>
                                            </div>

                                            {/* ── CTA (אם רלוונטי לדף הנוכחי) ── */}
                                            {currentCTA && (
                                                <div className="px-3 py-1 border-b border-white/[0.07]">
                                                    <Link
                                                        href={currentCTA.href}
                                                        onClick={() => setAvatarMenuOpen(false)}
                                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/[0.07] transition-colors"
                                                    >
                                                        <PlusCircle size={15} className="shrink-0" />
                                                        <span className="font-assistant text-sm font-semibold">{currentCTA.label}</span>
                                                    </Link>
                                                </div>
                                            )}

                                            {/* ── Mute toggle ── */}
                                            <div className="px-3 py-1 border-b border-white/[0.07]">
                                                <button
                                                    onClick={toggleMute}
                                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/45 hover:text-white hover:bg-white/[0.05] transition-colors"
                                                >
                                                    {isMuted
                                                        ? <VolumeX size={15} className="text-white/25 shrink-0" />
                                                        : <Volume2 size={15} className="text-amber-500/50 shrink-0" />
                                                    }
                                                    <span className="font-assistant text-sm">{isMuted ? "הפעל מוזיקה" : "השתק מוזיקה"}</span>
                                                </button>
                                            </div>

                                            {/* ── ניווט ── */}
                                            <div className="py-1.5">
                                                {[
        { href: `/wizard/${displayProfileId}`, icon: User, label: "הדף האישי שלי" },
                                                    { href: "/dashboard", icon: Castle, label: "הטירה שלי" },
                                                    { href: "/dashboard?tab=settings", icon: Settings, label: "הגדרות" },
                                                    ...(profile?.role === "מנהל" ? [{ href: "/admin-panel", icon: Shield, label: "לוח הבקרה" }] : []),
                                                ].map(({ href, icon: Icon, label }) => (
                                                    <Link key={href} href={href}
                                                        onClick={() => setAvatarMenuOpen(false)}
                                                        className="flex items-center gap-3 px-5 py-2.5 text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors group">
                                                        <Icon size={15} className="text-white/25 group-hover:text-white/60 shrink-0 transition-colors" />
                                                        <span className="font-assistant text-sm font-medium">{label}</span>
                                                    </Link>
                                                ))}
                                            </div>

                                            {/* ── Logout ── */}
                                            <div className="border-t border-white/[0.07] py-1.5">
                                                <button
                                                    onClick={() => { setAvatarMenuOpen(false); handleLogout(); }}
                                                    className="flex items-center gap-3 px-5 py-2.5 w-full text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.07] transition-colors group"
                                                >
                                                    <LogOut size={15} className="shrink-0 transition-colors" />
                                                    <span className="font-assistant text-sm font-medium">התעתקות</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Hamburger — mobile/tablet */}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="lg:hidden p-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg transition-all relative z-[10001] active:scale-95 shadow-lg shrink-0 flex items-center justify-center"
                        >
                            {isOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
                {pathname !== '/' && (
                    <MagicTicker
                        nextAction={nextAction}
                        nextActionLoading={nextActionLoading}
                    />
                )}
                </div>
            </header>

            <div className={`fixed inset-0 z-[9999] bg-[#020617] transition-all duration-500 ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"}`} dir="rtl">
                <div className="font-cinzel text-white/[0.02] text-[18vw] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none font-black z-0">LUMOS</div>

                <nav className="relative z-10 flex flex-col items-center gap-1 w-full px-10 pt-28 pb-32 h-full overflow-y-auto">
                    <button onClick={() => setIsOpen(false)} className="absolute top-5 left-5 p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors z-20">
                        <X size={22} />
                    </button>
                    {currentCTA && !isGuest && (
                        <Link href={currentCTA.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 w-full justify-center py-4 px-8 mb-4 rounded-2xl bg-amber-500 text-amber-950 font-cinzel font-black text-lg uppercase tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                            <PlusCircle size={22} /> {currentCTA.label}
                        </Link>
                    )}

                    {false && !isGuest && (
                        <div className="w-full mb-5 rounded-3xl border border-amber-500/15 bg-amber-500/[0.06] px-5 py-4 shadow-[0_0_36px_rgba(245,158,11,0.08)]">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.3em] text-amber-300/75">
                                        מה כדאי לעשות עכשיו
                                    </p>
                                    <p className="mt-2 font-assistant text-lg font-semibold text-white/90">
                                        {missionTitle}
                                    </p>
                                    <p className="mt-1 text-sm text-white/45">
                                        {missionHint}
                                    </p>
                                </div>
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-black/25">
                                    <Sparkles size={18} className="text-amber-400" />
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <Link
                                    href={missionHref}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 font-cinzel text-sm font-black uppercase tracking-[0.18em] text-amber-950 shadow-[0_0_24px_rgba(245,158,11,0.18)]"
                                >
                                    <Zap size={16} />
                                    לצעד הבא
                                </Link>
                                <Link
                                    href={QUESTS_FAQ_LINK}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-cinzel text-sm font-bold uppercase tracking-[0.14em] text-white/60"
                                >
                                    <HelpCircle size={16} className="text-amber-400/70" />
                                    איך זה עובד
                                </Link>
                            </div>
                        </div>
                    )}

                    <div className="w-full mb-4">
                        <form onSubmit={handleSearch} dir="rtl">
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-5 py-4" dir="rtl">
                                {liveLoading
                                    ? <Loader2 size={18} className="text-amber-500/50 shrink-0 animate-spin" />
                                    : <Search size={18} className="text-amber-500/50 shrink-0" />
                                }
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="חפש בטירה..."
                                    className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-white/25 text-right font-assistant"
                                    dir="rtl"
                                />
                                {searchQuery && (
                                    <button type="button" onClick={() => setSearchQuery("")} className="p-1 text-white/30 hover:text-white transition-all shrink-0">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </form>
                        {liveResults.length > 0 && (
                            <div className="mt-2">
                                <LiveDropdown results={liveResults} onSelect={closeLiveResults} />
                            </div>
                        )}
                    </div>

                    {navLinks.map((link, i) => (
                        <Link key={link.name} href={link.href} onClick={() => setIsOpen(false)} className="flex items-center gap-6 text-2xl font-cinzel font-black text-white/50 hover:text-amber-500 transition-all uppercase tracking-[0.1em] py-4 w-full justify-center group border-b border-white/5 last:border-0" style={{ transitionDelay: isOpen ? `${i * 30}ms` : '0ms' }}>
                            <link.icon size={20} className="text-amber-500/40 group-hover:text-amber-500 transition-colors" /> {link.name}
                        </Link>
                    ))}

                    <div className="w-1/2 h-px bg-white/10 my-8" />

                    {isGuest ? (
                        <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-4 text-amber-950 font-cinzel font-black tracking-[0.2em] uppercase py-4 px-12 rounded-2xl bg-amber-500 active:scale-95 shadow-lg w-full justify-center mb-10">
                            להתחברות לשערי הטירה
                        </Link>
                    ) : (
                        <>
                                <Link href="/dashboard?tab=settings" onClick={() => setIsOpen(false)} className="flex items-center gap-4 text-xl font-cinzel font-bold text-white/40 hover:text-white transition-all uppercase justify-center mb-6">
                                <Settings size={18} className="text-amber-500/50" /> הגדרות חשבון
                            </Link>

                            <button onClick={handleLogout} className="flex items-center gap-4 text-red-500 font-cinzel font-black tracking-[0.2em] uppercase py-4 px-12 border border-red-500/20 rounded-2xl bg-red-950/20 active:scale-95 shadow-lg w-full justify-center mb-10">
                                <LogOut size={20} /> התעתקות
                            </button>
                        </>
                    )}
                </nav>
            </div>

            <QuestBeacon
                isAuthenticated={isAuthenticated}
                hidden={hideQuestBeacon}
                className={questBeaconClassName}
                nextAction={nextAction}
                nextActionLoading={nextActionLoading}
            />
        </>
    );
}
