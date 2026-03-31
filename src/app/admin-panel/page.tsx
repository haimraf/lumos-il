"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    ShieldCheck, Search, Trophy, ChevronRight, Flag, CheckCircle, Radio,
    Trash2, Newspaper, FileText, Edit3, Globe, Megaphone, Image as ImageIcon,
    X, AlertCircle, Clock, Zap, RotateCcw, Crown, Users, Coins, Gift,
    TrendingUp, Activity, Eye, Bell, GraduationCap, Pencil, Save,
    UserCog, Shield, ChevronDown as ChevronDownIcon,
    Store, BookOpenCheck, MessageSquare, Lock, Pin, Plus, Hash, Swords, Ban, BarChart3, Sparkles, ShieldAlert, ScrollText, Settings
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import { getRoleColor } from "@/lib/roleColor";
import Link from "next/link";
import dynamic from "next/dynamic";

const SunEditor = dynamic(() => import("suneditor-react"), { ssr: false });
import "suneditor/dist/css/suneditor.min.css";

import { useAuth } from "@/context/AuthContext";
import ModerationTab from "@/components/admin/ModerationTab";
import AdminLogsTab from "@/components/admin/AdminLogsTab";
import EmailBroadcastCard from "@/components/admin/EmailBroadcastCard";
import AdminActivityTab from "@/components/admin/AdminActivityTab";
import AdminPresencePanel from "@/components/admin/AdminPresencePanel";
import AdminOverviewTab from "@/components/admin/AdminOverviewTab";
import AdminQuestCatalogTab from "@/components/admin/AdminQuestCatalogTab";
import AdminSystemHealthPanel from "@/components/admin/AdminSystemHealthPanel";
import AdminTabGuide, { type AdminTabGuideContent } from "@/components/admin/AdminTabGuide";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminForumsTab from "@/components/admin/AdminForumsTab";
import AdminSiteSettingsTab from "@/components/admin/AdminSiteSettingsTab";
import { getYearFromProfile, getYearTitle } from "@/lib/yearSystem";
import { logAdminAudit, type AdminAuditInput } from "@/lib/adminAudit";
import { logActivityEvent } from "@/lib/activityEvents";
import { triggerAudioPlay } from "@/utils/audioTrigger";
import { getHouseDisplayIcon, getHouseDisplayLabel, isUnsortedHouse } from "@/lib/houses";
import { getNewsArticlePath } from "@/lib/seo";
import {
    compareLiveEventParticipants,
    LIVE_EVENTS_CATALOG_KEY,
    LIVE_EVENT_SETTINGS_KEY,
    buildLiveEventLegacyMirror,
    getDefaultLiveEventCatalogEntry,
    getLiveEventCatalogStatus,
    getLiveEventLabel,
    getProfileLiveEventPoints,
    normalizeLiveEventCatalog,
    normalizeLiveEventCatalogEntry,
    normalizeLiveEventSettings,
    pickFeaturedLiveEvent,
    sortLiveEventCatalog,
    type LiveEventCatalogEntry,
    type LiveEventMission,
    type LiveEventReward,
} from "@/lib/liveEvent";

const HOUSE_CONFIG: Record<string, { color: string; accent: string; icon: string; barColor: string; barGlow: string }> = {
    Gryffindor: { color: "text-red-400", accent: "rgba(220,38,38,0.15)", icon: "🦁", barColor: "#f87171", barGlow: "0 0 18px rgba(248,113,113,0.45)" },
    Slytherin: { color: "text-emerald-400", accent: "rgba(5,150,105,0.15)", icon: "🐍", barColor: "#34d399", barGlow: "0 0 18px rgba(52,211,153,0.45)" },
    Ravenclaw: { color: "text-blue-400", accent: "rgba(37,99,235,0.15)", icon: "🦅", barColor: "#60a5fa", barGlow: "0 0 18px rgba(96,165,250,0.45)" },
    Hufflepuff: { color: "text-amber-400", accent: "rgba(251,191,36,0.15)", icon: "🦡", barColor: "#fbbf24", barGlow: "0 0 18px rgba(251,191,36,0.45)" },
};

const REPORT_TARGET_TABLE: Record<string, "comments" | "messages" | "forum_posts"> = {
    comment: "comments",
    chat: "messages",
    forum_post: "forum_posts",
};

type AdminTab = "house-cup" | "health" | "prophet" | "moderation" | "presence" | "activity" | "logs" | "quests" | "events" | "tournaments" | "library" | "year-system" | "users" | "forums" | "shop" | "exams" | "arena" | "settings";
type EventSettings = LiveEventCatalogEntry;
type ForumCategory = { id: string; name: string; display_order?: number | null };
type ForumFormState = {
    name: string;
    description: string;
    slug: string;
    icon: string;
    category_id: string;
    staff_only_create: boolean;
    house_restriction: string;
    min_year: string;
};

const HOUSE_OPTIONS = ["", "Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"] as const;

const getDefaultForumForm = (): ForumFormState => ({
    name: "",
    description: "",
    slug: "",
    icon: "💬",
    category_id: "",
    staff_only_create: false,
    house_restriction: "",
    min_year: "",
});

const normalizeForumSlug = (value: string) => value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const toDateTimeLocalValue = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromDateTimeLocalValue = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const formatEventDateLabel = (value: string) => {
    if (!value) return "לא הוגדר";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" });
};

const EVENT_ICON_OPTIONS = [
    { value: "Sparkles", label: "ניצוצות" },
    { value: "ScrollText", label: "מגילה" },
    { value: "Feather", label: "נוצה" },
    { value: "Search", label: "חיפוש" },
    { value: "Gift", label: "פרס" },
    { value: "Crown", label: "כתר" },
    { value: "Trophy", label: "גביע" },
    { value: "Swords", label: "דו-קרב" },
    { value: "House", label: "בית" },
    { value: "Flame", label: "להבה" },
    { value: "Newspaper", label: "נביא יומי" },
    { value: "BookOpen", label: "ספר" },
    { value: "Shirt", label: "לבוש" },
] as const;

const EVENT_COLOR_OPTIONS = [
    { value: "amber", label: "ענבר" },
    { value: "pink", label: "ורוד" },
    { value: "rose", label: "רוז" },
    { value: "emerald", label: "אזמרגד" },
    { value: "blue", label: "כחול" },
    { value: "sky", label: "תכלת" },
    { value: "violet", label: "סגול" },
    { value: "red", label: "אדום" },
] as const;

const EVENT_ACTIVITY_OPTIONS = [
    { value: "", label: "תצוגה בלבד" },
    { value: "forum_thread_created", label: "פתיחת שרשור בפורום" },
    { value: "forum_reply_created", label: "תגובה בפורום" },
    { value: "forum_post_created", label: "פוסט בפורום" },
    { value: "news_comment_created", label: "תגובה בנביא היומי" },
    { value: "news_poll_voted", label: "הצבעה בסקר" },
    { value: "quest_trivia_completed", label: "טריוויה יומית" },
    { value: "quest_niffler_found", label: "ניפלר" },
    { value: "quest_snitch_caught", label: "סניץ'" },
    { value: "quest_reward_claimed", label: "איסוף תגמול" },
    { value: "library_chapter_read", label: "קריאת פרק" },
    { value: "story_published", label: "פרסום סיפור" },
    { value: "chapter_published", label: "פרסום פרק" },
    { value: "shop_purchase", label: "רכישה בחנות" },
    { value: "house_sorted", label: "מיון לבית" },
    { value: "arena_duel_completed", label: "ניצחון בזירה" },
] as const;

const EVENT_ADMIN_LEADERBOARD_COPY = {
    title: "\u05DC\u05D5\u05D7 \u05DE\u05D5\u05D1\u05D9\u05DC\u05D9\u05DD \u05D7\u05D9",
    explainer: "\u05D6\u05D4 \u05D4\u05E1\u05D3\u05E8 \u05E9\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05EA\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D5 \u05D0\u05DD \u05EA\u05DC\u05D7\u05E6\u05D9 \u05E2\u05DB\u05E9\u05D9\u05D5 \u05E2\u05DC \u05D7\u05DC\u05D5\u05E7\u05EA \u05E4\u05E8\u05E1\u05D9\u05DD. \u05D0\u05D5\u05EA\u05D5 \u05D3\u05D9\u05E8\u05D5\u05D2, \u05D0\u05D5\u05EA\u05D4 \u05DC\u05D5\u05D2\u05D9\u05E7\u05EA \u05E9\u05D5\u05D5\u05D9\u05D5\u05DF, \u05D1\u05DC\u05D9 \u05D4\u05E4\u05EA\u05E2\u05D5\u05EA \u05D1\u05E8\u05D2\u05E2 \u05D4\u05D0\u05D7\u05E8\u05D5\u05DF.",
    withPoints: "\u05E2\u05DD \u05E0\u05D9\u05E7\u05D5\u05D3",
    firstPlaceNow: "\u05DE\u05E7\u05D5\u05DD \u05E8\u05D0\u05E9\u05D5\u05DF \u05DB\u05E8\u05D2\u05E2",
    empty: "\u05E2\u05D3\u05D9\u05D9\u05DF \u05D0\u05D9\u05DF \u05E9\u05D7\u05E7\u05E0\u05D9\u05DD \u05E2\u05DD \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D0\u05D9\u05D5\u05D5\u05E0\u05D8. \u05D1\u05E8\u05D2\u05E2 \u05E9\u05D4\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05EA\u05EA\u05D7\u05D9\u05DC \u05DC\u05D4\u05D9\u05E1\u05E4\u05E8, \u05D4\u05D8\u05D1\u05DC\u05D4 \u05EA\u05D5\u05E4\u05D9\u05E2 \u05DB\u05D0\u05DF \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA.",
    guest: "\u05E7\u05D5\u05E1\u05DD/\u05EA",
    finishNow: "\u05D0\u05DD \u05EA\u05D7\u05DC\u05E7\u05D9 \u05E2\u05DB\u05E9\u05D9\u05D5 \u05E4\u05E8\u05E1\u05D9\u05DD, \u05D6\u05D4 \u05D4\u05DE\u05E7\u05D5\u05DD \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF.",
    points: "\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA",
    tieBreak: "\u05E9\u05D5\u05D5\u05D9\u05D5\u05DF \u05D1\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E0\u05E9\u05D1\u05E8 \u05DC\u05E4\u05D9 \u05EA\u05D0\u05E8\u05D9\u05DA \u05D4\u05E8\u05E9\u05DE\u05D4 \u05DE\u05D5\u05E7\u05D3\u05DD \u05D9\u05D5\u05EA\u05E8. \u05D6\u05D0\u05EA \u05D0\u05D5\u05EA\u05D4 \u05DC\u05D5\u05D2\u05D9\u05E7\u05D4 \u05E9\u05D4-RPC \u05E9\u05DC \u05D7\u05DC\u05D5\u05E7\u05EA \u05D4\u05E4\u05E8\u05E1\u05D9\u05DD \u05DE\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D4 \u05D1\u05DE\u05E1\u05D3.",
} as const;

const getDefaultEventMission = (): LiveEventMission => ({
    title: "",
    description: "",
    href: "/quests",
    icon: "Sparkles",
    color: "amber",
    points: 0,
    event_type: "",
});

const getDefaultEventReward = (rank: number): LiveEventReward => ({
    rank,
    title: `מקום ${rank}`,
    description: "",
    galleons: 0,
    points: 0,
    icon: "Gift",
    group_name: "",
    group_color: "#fbbf24",
    group_display_order: 900 + rank,
});

const TAB_CONFIG: { id: AdminTab; label: string; icon: any; color: string }[] = [
    { id: "house-cup",   label: "גביע הבית",    icon: Trophy,        color: "text-amber-400"  },
    { id: "settings",   label: "הגדרות האתר", icon: Settings,      color: "text-violet-400" },
    { id: "moderation", label: "מודרציה",      icon: Flag,          color: "text-red-400"    },
    { id: "health",     label: "בריאות מערכת", icon: ShieldCheck,   color: "text-cyan-300"   },
    { id: "users",      label: "קוסמים",       icon: UserCog,       color: "text-teal-400"   },
    { id: "events",     label: "איוונטים",     icon: Sparkles,      color: "text-pink-400"   },
    { id: "quests",     label: "משימות",       icon: Zap,           color: "text-yellow-400" },
    { id: "forums",     label: "פורומים",      icon: MessageSquare, color: "text-orange-400" },
    { id: "prophet",    label: "נביא היומי",   icon: Newspaper,     color: "text-blue-400"   },
    { id: "presence",   label: "נוכחות",       icon: Radio,         color: "text-cyan-300"   },
    { id: "activity",   label: "פעילות",       icon: Activity,      color: "text-cyan-400"   },
    { id: "logs",       label: "לוגים",        icon: ShieldAlert,   color: "text-rose-400"   },
    { id: "tournaments",label: "טורנירים",     icon: Swords,        color: "text-orange-400" },
    { id: "library",    label: "הספרייה",      icon: FileText,      color: "text-blue-400"   },
    { id: "year-system",label: "מערכת שנים",  icon: GraduationCap, color: "text-purple-400" },
    { id: "shop",       label: "חנות",         icon: Store,         color: "text-emerald-400"},
    { id: "exams",      label: "בחינות",       icon: BookOpenCheck, color: "text-violet-400" },
    { id: "arena",      label: "זירת קרבות",  icon: Swords,        color: "text-orange-400" },
];

const TAB_GUIDES: Record<AdminTab, AdminTabGuideContent> = {
    "house-cup": {
        title: "גביע הבית והדופק הראשי של הטירה",
        description: "כאן רואים את תמונת העל של הביתים, המיקומים החמים, והאם העונה מתקדמת כמו שצריך או דורשת התערבות שלך.",
        bullets: [
            "הנקודות כאן נשענות על points_contributed, אז אם בית נראה חלש צריך לבדוק מי לא מזרים פעילות ולא רק מי מחובר.",
            "פסי ההתקדמות מראים יחס למוביל הנוכחי, כדי שתראה מיד מי רודף ומי מוביל את המרוץ.",
            "כרטיסי הסיכום כאן הם נקודת כניסה: משם יורדים למודרציה, נוכחות, משימות או פעילות לפי מה שנראה חריג.",
        ],
    footer: "אם משהו נראה תקוע כאן, בדרך כלל הבעיה נמצאת בדאטה שמוזן מהפעילות או מדפי הקוסם.",
        tone: "amber",
    },
    health: {
        title: "לוח בריאות מערכת",
        description: "כאן מרוכזות הבדיקות הכי חשובות של הטירה: קידוד, קווסטים, נוכחות, משתמשים, לוגים ודיוור.",
        bullets: [
            "הכרטיסים כאן לא רק מסכמים מצב, אלא גם מקפיצים אותך ישירות לטאב שצריך טיפול.",
            "זה המקום הכי מהיר להבין אם הבעיה היא בתוכן שבור, בחיבור בין משימות, או פשוט בחוסר תנועה.",
            "כשמסך הבריאות נראה טוב, אפשר לסמוך הרבה יותר על שאר הנתונים בלוח הבקרה.",
        ],
        footer: "כדאי להתחיל כאן בכל פעם שהאתר מרגיש שקט, איטי או לא מסונכרן, לפני שנכנסים לעומק בטאב אחד.",
        tone: "cyan",
    },
    prophet: {
        title: "שליטה על הנביא היומי והמסרים הציבוריים",
        description: "הטאב הזה מרכז את התוכן העריכתי והעדכונים שרואים באתר. הוא משפיע על תחושת חיות, אמינות וקצב.",
        bullets: [
            "כאן כדאי לחשוב כמו עורך: מה צריך למשוך אנשים לחזור, לא רק מה צריך להתפרסם.",
            "כתבות וסקרים שנכנסים כאן הם שכבת ההנעה הציבורית, בנפרד ממשימות אישיות או הודעות מערכת.",
            "אם האתר מרגיש שקט, זה אחד המקומות הראשונים שכדאי לרענן כדי לייצר תנועה טבעית.",
        ],
        tone: "cyan",
    },
    moderation: {
        title: "השליטה המשמעתית של הטירה",
        description: "כאן רואים מי כרגע מוגבל, מי נתן את ההגבלה, למה, ואיך ההיסטוריה של המודרציה נבנתה לאורך זמן.",
        bullets: [
            "הסטטוסים הפעילים נשענים על status ו-is_ghost, לא על role ישן כמו אסיר אזקבאן.",
            "אם משהו לא מופיע כאן אבל אתה בטוח שנתת באן, צריך לבדוק אם זאת חסימת legacy או פעולה בלי audit log.",
            "רצף הפעולות עוזר להבין לא רק מה קרה, אלא אם יש דפוס חוזר שדורש מדיניות ברורה יותר.",
        ],
        tone: "rose",
    },
    presence: {
        title: "ראיית לייב על מי בטירה, איפה, ובאיזה מצב",
        description: "זה מסך שליטה לנוכחות חיה. הוא מפריד בין פעילים עכשיו, AFK, אורחים, ונצפו לאחרונה כדי שלא תערבב בין לייב להיסטוריה.",
        bullets: [
            "פעיל עכשיו מבוסס על חלון זמן קצר, ונצפה לאחרונה שומר לך הקשר גם אם המשתמש כבר לא לייב.",
            "הנתיב הגולמי והקישור עוזרים לראות איפה אנשים באמת מסתובבים באתר, לא רק כמה יש.",
            "אם אתה רואה תנועה בלי פעילות, זה סימן שהמסלולים פתוחים אבל אין מספיק טריגרים שמחזירים אנשים לפעולה.",
        ],
        tone: "cyan",
    },
    activity: {
        title: "יומן הפעילות של הטירה",
        description: "כאן בודקים אם האתר באמת מייצר פעולות, מאיפה הן מגיעות, ואיזה חלקים עובדים טוב יותר מהאחרים.",
        bullets: [
            "זה המקום להבין אם יש פער בין נוכחות לבין מעשים בפועל, כמו תגובות, קווסטים, זירה או פורומים.",
            "פעילות חריגה כאן יכולה להסביר גם קפיצות בגביע הבית וגם התראות או עומסים אחרים.",
            "כשמשהו מרגיש מת, הטאב הזה בדרך כלל יראה אם הבעיה היא באפס תוכן, אפס תגמול או אפס חיבור בין אזורים.",
        ],
        tone: "emerald",
    },
    logs: {
        title: "לוגים, עקבות, ומה באמת קרה",
        description: "זה טאב הבקרה כשצריך להבין עובדות. הוא מיועד למעקב, בדיקות, ואימות שלא הולכים לאיבוד אחרי פעולה אדמינית.",
        bullets: [
            "כאן רואים פעולות אדמין, טרייסים של שינויים, ואירועים שצריכים להשאיר עקבה היסטורית.",
            "אם פעולה נראית תקינה בממשק אבל אין לה עקבה כאן, שווה לבדוק אם חסר audit log או realtime trigger.",
            "לוגים טובים הם מה שמבדיל בין תחושת בטן לבין ניהול בטוח של האתר.",
        ],
        tone: "violet",
    },
    quests: {
        title: "ניהול קטלוג הקווסטים של כל האתר",
        description: "כאן מגדירים את המשימות עצמן: איך הן נספרות, מה הן מחלקות, ואיך הן נדחפות לדאשבורד, Header ועמוד /quests.",
        bullets: [
            "כל קווסט נשען על מקור התקדמות אחד ברור, כדי למנוע מצב שמשימה נראית נכון אבל לא נסגרת בפועל.",
            "שינוי כאן מתעדכן לכל האזורים המחוברים לקטלוג, כך שהטירה לא תלויה יותר ברענון ידני.",
            "הקווסטים הטובים ביותר מחברים בין אזורים באתר, לא רק נותנים עוד נקודות על פעולה בודדת.",
        ],
        tone: "amber",
    },
    events: {
        title: "איוונטים עונתיים והפעלת מומנטום קהילתי",
        description: "כאן שולטים באירועים זמניים, משימות מיוחדות ופרסים שמייצרים שיאים חוזרים בחיים של האתר.",
        bullets: [
            "איוונט טוב צריך לייצר סיבה להיכנס עכשיו, לא רק עוד תוכן שנשאר בתפריט.",
            "כאן כדאי להסתכל על תזמון, בולטות, וריוורדס, כי אלה מה שמבדיל בין אירוע שקט לאירוע שמרים טירה.",
            "זה טאב שמחבר בין תוכן, פרסים, נקודות, ותזמון חכם לאורך העונה.",
        ],
        tone: "violet",
    },
    tournaments: {
        title: "ניהול תחרויות וטורנירים",
        description: "כאן יושבת שכבת התחרות הרשמית. גם אם חלקים עדיין בבנייה, זה המקום לחשוב על חוקים, ניקוד ופרסים.",
        bullets: [
            "טורנירים צריכים להיות ברורים יותר ממשימות רגילות, כי שחקנים משקיעים בהם יותר זמן ורגש.",
            "כדאי לנהל כאן גם חוקים וגם תצוגת סטטוס, כדי שלא יהיו פערים בין מה שהכרזת לבין מה שיומן הטירה סופר.",
            "אם תרצה להפוך את זה ללב האתר, הטאב הזה צריך להיות מחובר ללוגים, נוכחות ופרסים.",
        ],
        tone: "amber",
    },
    library: {
        title: "הספרייה, יצירות ותנועה סביב קריאה",
        description: "כאן עוקבים אחרי תוכן ארוך, פרקים, ופעולות שמזינות חזרתיות שקטה אבל חשובה באתר.",
        bullets: [
            "הספרייה מייצרת עומק, לאו דווקא רעש. לכן מודדים כאן התמדה ולא רק פיקים רגעיים.",
            "קריאה, פרסום ותגובות בספרייה יכולים להזין גם משימות וגם קצב פעילות כללי.",
            "אם רוצים שהאתר ירגיש עשיר ולא רק מהיר, זה אחד המוקדים שכדאי לחזק.",
        ],
        tone: "emerald",
    },
    "year-system": {
        title: "מערכת השנים והתקדמות לימודית",
        description: "כאן רואים איך שחקנים מתקדמים במסלול הלימודי, ומה חסר להם כדי לעלות שלב בצורה ברורה ומסודרת.",
        bullets: [
            "הטאב הזה חשוב כדי שהאתר ירגיש כמו מסע, לא כמו אוסף דפים בלי התקדמות.",
            "כששנים ברורות, גם הקווסטים, הלחשים והיעדים האישיים מרגישים משמעותיים יותר.",
            "אם משתמשים נתקעים, כאן בודקים אם הדרישות ברורות או אם חסר גשר ביניים לשלב הבא.",
        ],
        tone: "violet",
    },
    users: {
    title: "ניהול משתמשים, דפי קוסם ותמונת עומק על הקהילה",
        description: "כאן נכנסים לרזולוציה של חשבון יחיד: פרטים, בית, דרגה, והקשר הרחב של המשתמש בתוך האתר.",
        bullets: [
            "זה הטאב לחקירות נקודתיות: מי המשתמש, מה מצבו, ואיפה הוא משתלב או נתקע.",
    "כאן רואים דברים שלא נוח לראות דרך נוכחות או לוגים בלבד, כמו פרטים מצטברים על דף קוסם.",
            "כדאי להשתמש בטאב הזה יחד עם מודרציה ונוכחות כדי לקבל תמונה מלאה, לא רק חלקית.",
        ],
        tone: "cyan",
    },
    forums: {
        title: "פורומים, חדרי שיח והזרמת שיחה",
        description: "כאן מנהלים את מבנה השיח, מי יכול לפתוח מה, ואיך המסדרונות נשארים חיים ולא מתפרקים לרעש.",
        bullets: [
            "פורום טוב צריך היררכיה ברורה, חופש מספיק, ומעט חיכוך בדרך לפתיחת דיון.",
            "אם יש הרבה נוכחות אבל מעט כתיבה, שווה לבדוק כאן אם המבנה עצמו מרתיע משתמשים.",
            "הפורומים הם עוגן מרכזי באתר שלך, ולכן כל החלטה כאן משפיעה על החיות הכללית.",
        ],
        tone: "emerald",
    },
    shop: {
        title: "חנות, כלכלה ותמריצים לחזור",
        description: "הטאב הזה שולט בכל מה שנוגע למשאבים, חפצים ותחושת התגמול של השחקנים לאורך זמן.",
        bullets: [
            "תגמול טוב לא חייב להיות גדול, הוא צריך להיות מורגש ומחובר להתנהגות שאתה רוצה לעודד.",
            "אם שחקנים לא מתלהבים מהחנות, כדאי לבדוק אם יש מספיק מה לקנות ואם המטבע באמת זורם.",
            "חנות חיה עוזרת למשימות, לדיוור ולהרגלי חזרה לעבוד יחד ולא בנפרד.",
        ],
        tone: "amber",
    },
    exams: {
        title: "בחינות, בדיקות ידע והוכחת התקדמות",
        description: "כאן יושבת שכבת האתגר הרשמית. היא טובה במיוחד כשצריך לתת משמעות להתקדמות, לא רק זמן מסך.",
        bullets: [
            "בחינה טובה בודקת מוכנות ויוצרת ציפייה, לא סתם חוסמת גישה.",
            "הטאב הזה צריך לעבוד עם מערכת השנים והקווסטים כדי שכל הצלחה תרגיש מוצדקת.",
            "אם בחינות מרגישות מתות, בדרך כלל חסר להן חיבור לפרסים, יוקרה או פתיחת תוכן חדש.",
        ],
        tone: "violet",
    },
    arena: {
        title: "הזירה והתחרות הישירה בין קוסמים",
        description: "הטאב הזה מרכז את הדו-קרבות והמתח התחרותי. הוא טוב במיוחד ליצירת ביקורים קצרים אבל חזרתיים.",
        bullets: [
            "ניצחונות, תיקו והיסטוריית קרבות צריכים להיות ברורים כאן כדי שהזירה תרגיש הוגנת ולא אקראית.",
            "אם הזירה חיה, היא יכולה להזין גם משימות, גם נוכחות וגם גאוות בית.",
            "זה מקום מצוין לבנות סביבו אירועים קצרים, טורנירים ותגמולים מיוחדים.",
        ],
        tone: "rose",
    },
    settings: {
        title: "הגדרות האתר — SEO, באנר והתנהגות כללית",
        description: "כאן שולטים על ההגדרות הגלובליות שמשפיעות על כל האתר: באנר הודעה, תיאור SEO, תמונת OG ומצב הרשמה.",
        bullets: [
            "הגדרות SEO שנשמרות כאן מסונכרנות מהמסד — לא צריך לעדכן קוד בכל שינוי.",
            "הבאנר פעיל ברגע שמדליקים אותו ויוצג בכל עמוד באתר, המשתמש יכול לסגור.",
            "כתובת תמונת OG חייבת לצביע לקובץ שאכן קיים ב-/public — בדקו לפני ההפעלה.",
        ],
        footer: "שינויים כאן חיים מיידית — אין צורך בפריסה חדשה.",
        tone: "violet",
    },
};

// Removed old logs injection

export default function AdminPanel() {
    const router = useRouter();
    const supabase = createClient();
    const { sendOwl } = useOwlMail();
    const { profile, isLoading: authLoading } = useAuth();
    const isAdmin = profile?.role === 'מנהל';
    const isModerator = profile?.role === 'מנחה';

    const [activeTab, setActiveTab] = useState<AdminTab>("house-cup");
    const [loading, setLoading] = useState(true);

    // Search & users
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Data
    const [reports, setReports] = useState<any[]>([]);
    const [news, setNews] = useState<any[]>([]);
    const [housePoints, setHousePoints] = useState<any>({});
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [adminLogs, setAdminLogs] = useState<any[]>([]);
    const [activityEvents, setActivityEvents] = useState<any[]>([]);
    const [siteSettings, setSiteSettings] = useState<Record<string, any>>({});

    // News editor
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newArticle, setNewArticle] = useState({
        title: "", content: "", author: "",
        meta_title: "", meta_description: "", image_url: ""
    });
    const [isPublishing, setIsPublishing] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", "", "", ""]);
    const [isCreatingPoll, setIsCreatingPoll] = useState(false);

    // Rewards
    const [pointsToAdd, setPointsToAdd] = useState(0);
    const [galleonsToAdd, setGalleonsToAdd] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);

    // Season
    const [isResetting, setIsResetting] = useState(false);

    // Broadcast
    const [broadcastMsg, setBroadcastMsg] = useState("");

    // Year system
    const [editingYear, setEditingYear] = useState<{ id: string; year: number } | null>(null);
    const [isSavingYear, setIsSavingYear] = useState(false);

    // Users management
    const [userSearch, setUserSearch] = useState("");
    const [userFilter, setUserFilter] = useState<"all" | "מנהל" | "מנחה" | "תלמידי טירה" | "unsorted">("all");
    const [editingRole, setEditingRole] = useState<{ id: string; role: string } | null>(null);
    const [isSavingRole, setIsSavingRole] = useState(false);
    const [userGroups, setUserGroups] = useState<any[]>([]);
    const [editingGroup, setEditingGroup] = useState<{ id: string; group_id: number | null } | null>(null);
    const [isSavingGroup, setIsSavingGroup] = useState(false);

    // Forums management
    const [forums, setForums] = useState<any[]>([]);
    const [forumCategories, setForumCategories] = useState<ForumCategory[]>([]);
    const [threads, setThreads] = useState<any[]>([]);
    const [threadSearch, setThreadSearch] = useState("");
    const [selectedForum, setSelectedForum] = useState<any>(null);
    const [forumForm, setForumForm] = useState<ForumFormState>(() => getDefaultForumForm());
    const [isAddingForum, setIsAddingForum] = useState(false);
    const [editingForumId, setEditingForumId] = useState<string | null>(null);
    const [isSavingForum, setIsSavingForum] = useState(false);

    // Shop management
    const [shopItems, setShopItems] = useState<any[]>([]);
    const [stories, setStories] = useState<any[]>([]);
    const [shopFilter, setShopFilter] = useState("all");
    const [editingItem, setEditingItem] = useState<any>(null);
    const [newItem, setNewItem] = useState({ name: "", description: "", price: 0, category: "wands", image_url: "", is_available: true });
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isSavingItem, setIsSavingItem] = useState(false);
    const isItemAvailable = (item: any) => item?.is_available === true;

    // Exams management
    const [examQuestions, setExamQuestions] = useState<any[]>([]);
    const [examFilter, setExamFilter] = useState<"owl" | "newt">("owl");
    const [editingQuestion, setEditingQuestion] = useState<any>(null);
    const [newQuestion, setNewQuestion] = useState({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "a", exam_type: "owl" });
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [isSavingQuestion, setIsSavingQuestion] = useState(false);

    // Arena management
    const [arenaStats, setArenaStats] = useState<any>(null);
    const [arenaRecentDuels, setArenaRecentDuels] = useState<any[]>([]);
    const [arenaPendingDuels, setArenaPendingDuels] = useState<any[]>([]);
    const [arenaSuspects, setArenaSuspects] = useState<any[]>([]);
    const [arenaLoaded, setArenaLoaded] = useState(false);
    const [badgeGrantUserId, setBadgeGrantUserId] = useState("");
    const [badgeGrantSearch, setBadgeGrantSearch] = useState("");
    const [badgeGrantResults, setBadgeGrantResults] = useState<any[]>([]);
    const [badgeGrantLoading, setBadgeGrantLoading] = useState<string | null>(null);
    const [isCleaningPending, setIsCleaningPending] = useState(false);
    const [isTestingActivity, setIsTestingActivity] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [rewardPreview, setRewardPreview] = useState<{ rank: number; name: string; galleons: number; points: number; group: string | null }[] | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const audit = useCallback((entry: Omit<AdminAuditInput, "actorId" | "actorName" | "actorRole">) => {
        if (!profile?.id) return Promise.resolve();

        return logAdminAudit(supabase, {
            actorId: profile.id,
            actorName: profile.full_name || null,
            actorRole: profile.role || null,
            ...entry,
        });
    }, [profile?.id, profile?.full_name, profile?.role, supabase]);

    const fetchShopItems = useCallback(async () => {
        const { data } = await supabase.from('shop_items').select('*').order('created_at', { ascending: false });
        setShopItems(data || []);
    }, [supabase]);

    const fetchExamQuestions = useCallback(async () => {
        const { data } = await supabase.from('exam_questions').select('*').order('created_at', { ascending: false });
        setExamQuestions(data || []);
    }, [supabase]);

    const fetchStories = useCallback(async () => {
        const { data } = await supabase.from('stories').select('*').order('created_at', { ascending: false }).limit(20);
        setStories(data || []);
    }, [supabase]);

    /* ── Fetch ── */
    const fetchData = useCallback(async () => {
        try {
            const [{ data: reportData }, { data: newsData }, { data: profilesData },
                { data: forumsData }, { data: forumCategoriesData }, { data: groupsData },
                { data: logsData }, { data: activityData }, { data: settingsData }] = await Promise.all([
                    supabase.from('reports').select('*').order('created_at', { ascending: false }),
                    supabase.from('news').select('*').order('created_at', { ascending: false }),
                    supabase.from('profiles').select('*, user_groups(id, name, color)').order('created_at', { ascending: true }),
                    supabase.from('forums').select('*, thread_count:threads(count)').order('created_at', { ascending: true }),
                    supabase.from('forum_categories').select('*').order('display_order'),
                    supabase.from('user_groups').select('*').order('display_order'),
                    supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(150),
                    supabase.from('activity_events').select('*').order('created_at', { ascending: false }).limit(100),
                    supabase.from('site_settings').select('*'),
                ]);

            setReports(reportData || []);
            setNews(newsData || []);
            setForums(forumsData || []);
            setForumCategories((forumCategoriesData as ForumCategory[]) || []);
            setUserGroups(groupsData || []);
            setAdminLogs(logsData || []);
            setActivityEvents((activityData as any) || []);

        const settingsMap: Record<string, any> = {};
        settingsData?.forEach(s => { settingsMap[s.key] = s.value; });
        setSiteSettings(settingsMap);

        const points: Record<string, number> = { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 };
        profilesData?.forEach((row: any) => {
            if (row.house && points[row.house] !== undefined) points[row.house] += row.points_contributed || 0;
        });
        setHousePoints(points);
        setAllProfiles(profilesData || []);
        } catch {
            // Fetch failed — admin panel will show stale data until next refresh
        }
    }, [supabase]);

    const fetchThreads = useCallback(async (forumId: string) => {
        const { data } = await supabase
            .from('threads')
            .select('*, profiles(full_name), post_count:forum_posts(count)')
            .eq('forum_id', forumId)
            .order('created_at', { ascending: false });
        setThreads(data || []);
    }, [supabase]);


    useEffect(() => {
        if (activeTab === "arena" && !arenaLoaded) fetchArenaData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === "shop" && shopItems.length === 0) {
            void fetchShopItems();
        }
        if (activeTab === "exams" && examQuestions.length === 0) {
            void fetchExamQuestions();
        }
        if (activeTab === "library" && stories.length === 0) {
            void fetchStories();
        }
    }, [activeTab, examQuestions.length, fetchExamQuestions, fetchShopItems, fetchStories, shopItems.length, stories.length]);

    useEffect(() => {
        if (!authLoading) {
            if (!profile || !['מנהל', 'מנחה'].includes(profile.role || '')) { router.push('/dashboard'); return; }
            setNewArticle(prev => ({ ...prev, author: profile.full_name || "הנהלה" }));
            fetchData();
            setLoading(false);
        }
    }, [router, supabase, fetchData, profile, authLoading]);

    useEffect(() => {
        if (authLoading || !profile || !['מנהל', 'מנחה'].includes(profile.role || '')) return;

        const shouldRefreshLiveAdminData = () => ["events", "activity", "moderation", "users", "logs", "health"].includes(activeTab);
        const channel = supabase
            .channel('admin_live_event_scoreboard_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                (payload: any) => {
                    if (!shouldRefreshLiveAdminData()) return;

                    const nextProfile = payload?.new || {};
                    const prevProfile = payload?.old || {};
                    const shouldRefreshModerationViews = ["moderation", "users", "logs"].includes(activeTab);
                    const pointsChanged = payload?.eventType !== 'UPDATE'
                        || nextProfile.event_points !== prevProfile.event_points
                        || nextProfile.passover_points !== prevProfile.passover_points
                        || nextProfile.group_id !== prevProfile.group_id
                        || nextProfile.full_name !== prevProfile.full_name
                        || nextProfile.house !== prevProfile.house;
                    const moderationChanged = payload?.eventType !== 'UPDATE'
                        || nextProfile.status !== prevProfile.status
                        || nextProfile.is_ghost !== prevProfile.is_ghost
                        || nextProfile.ban_reason !== prevProfile.ban_reason
                        || nextProfile.ban_expires_at !== prevProfile.ban_expires_at
                        || nextProfile.role !== prevProfile.role;

                    if ((shouldRefreshModerationViews && moderationChanged) || pointsChanged) {
                        void fetchData();
                    }
                },
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'site_settings' },
                (payload: any) => {
                    if (!shouldRefreshLiveAdminData()) return;

                    const key = payload?.new?.key || payload?.old?.key;
                    if (key === LIVE_EVENT_SETTINGS_KEY || key === LIVE_EVENTS_CATALOG_KEY) {
                        void fetchData();
                    }
                },
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeTab, authLoading, fetchData, profile, supabase]);

    /* ── Search ── */
    const searchUsers = useCallback(async (q: string) => {
        if (!q.trim()) { setUsers([]); return; }
        setIsSearching(true);
        const { data } = await supabase.from('profiles').select('*').ilike('full_name', `%${q}%`).limit(6);
        setUsers(data || []);
        setIsSearching(false);
    }, [supabase]);

    const getEventCatalogFromState = (source: Record<string, any>) => sortLiveEventCatalog(
        normalizeLiveEventCatalog(source[LIVE_EVENTS_CATALOG_KEY], source[LIVE_EVENT_SETTINGS_KEY]),
    );

    const createEventDraft = (patch: Partial<EventSettings> = {}): EventSettings => {
        const nowIso = new Date().toISOString();
        const nextId = globalThis.crypto?.randomUUID?.() || `event-${Date.now()}`;
        const nextSlug = normalizeForumSlug(String(patch.eventName || patch.title || `event-${Date.now()}`)) || `event-${Date.now()}`;

        return normalizeLiveEventCatalogEntry({
            ...getDefaultLiveEventCatalogEntry(0),
            id: nextId,
            slug: nextSlug,
            created_at: nowIso,
            updated_at: nowIso,
            ...patch,
        });
    };

    const resolveSelectedEvent = (source: Record<string, any>) => {
        const catalog = getEventCatalogFromState(source);
        return catalog.find((event) => event.id === selectedEventId)
            || pickFeaturedLiveEvent(catalog)
            || catalog[0]
            || null;
    };

    const buildEventSettings = (patch: Partial<EventSettings> = {}): EventSettings => {
        const selectedEvent = resolveSelectedEvent(siteSettings);
        return normalizeLiveEventCatalogEntry({
            ...(selectedEvent || createEventDraft()),
            ...patch,
        });
    };

    const replaceEventInCatalog = (
        catalog: EventSettings[],
        nextEvent: EventSettings,
    ) => {
        const existingIndex = catalog.findIndex((event) => event.id === nextEvent.id);
        const nextCatalog = existingIndex >= 0
            ? catalog.map((event, index) => (index === existingIndex ? nextEvent : event))
            : [nextEvent, ...catalog];

        return sortLiveEventCatalog(nextCatalog);
    };

    const updateEventSettingsDraft = (patch: Partial<EventSettings>) => {
        setSiteSettings((prev) => {
            const catalog = getEventCatalogFromState(prev);
            const currentEvent = resolveSelectedEvent(prev) || createEventDraft();
            const nextEvent = normalizeLiveEventCatalogEntry({
                ...currentEvent,
                ...patch,
                updated_at: new Date().toISOString(),
            });
            const nextCatalog = replaceEventInCatalog(catalog, nextEvent);

            return {
                ...prev,
                [LIVE_EVENTS_CATALOG_KEY]: nextCatalog,
                [LIVE_EVENT_SETTINGS_KEY]: buildLiveEventLegacyMirror(pickFeaturedLiveEvent(nextCatalog)),
            };
        });
    };

    const persistEventCatalog = async (
        catalogInput?: EventSettings[],
        mirrorEvent?: EventSettings | null,
    ) => {
        const nextCatalog = sortLiveEventCatalog(catalogInput || getEventCatalogFromState(siteSettings));
        const nextMirror = buildLiveEventLegacyMirror(mirrorEvent || pickFeaturedLiveEvent(nextCatalog));
        const prevSettings = { ...siteSettings };

        setSiteSettings((prev) => ({
            ...prev,
            [LIVE_EVENTS_CATALOG_KEY]: nextCatalog,
            [LIVE_EVENT_SETTINGS_KEY]: nextMirror,
        }));

        const updatedAt = new Date().toISOString();
        const payload = [
            {
                key: LIVE_EVENTS_CATALOG_KEY,
                value: nextCatalog,
                updated_at: updatedAt,
                updated_by: profile?.id,
            },
            {
                key: LIVE_EVENT_SETTINGS_KEY,
                value: nextMirror,
                updated_at: updatedAt,
                updated_by: profile?.id,
            },
        ];

        const { error, data } = await supabase
            .from("site_settings")
            .upsert(payload, { onConflict: "key" })
            .select();

        if (error || !data || data.length < 2) {
            console.error("Event catalog save error:", error || "No rows updated");
            sendOwl("עדכון נכשל", error?.message || "שמירת מערכת האיוונטים נכשלה.", "error");
            setSiteSettings(prevSettings);
            return false;
        }

        sendOwl("האיוונטים עודכנו", "הקטלוג, האיוונט החי והתוכן נשמרו בהצלחה.", "success");
        void audit({
            action: "edit_live_events_catalog",
            targetType: "site_settings",
            targetId: LIVE_EVENTS_CATALOG_KEY,
            targetLabel: nextMirror.eventName || nextMirror.title,
            details: { totalEvents: nextCatalog.length },
        });
        return true;
    };

    const handleSaveEventContent = async () => {
        await persistEventCatalog();
    };

    const handleCreateEventDraft = () => {
        const currentCatalog = getEventCatalogFromState(siteSettings);
        const nextEvent = createEventDraft({
            featured: currentCatalog.length === 0,
            title: "איוונט חדש בטירה",
            eventName: "",
            year: new Date().getFullYear(),
        });

        setSiteSettings((prev) => {
            const nextCatalog = sortLiveEventCatalog([nextEvent, ...getEventCatalogFromState(prev)]);
            return {
                ...prev,
                [LIVE_EVENTS_CATALOG_KEY]: nextCatalog,
                [LIVE_EVENT_SETTINGS_KEY]: buildLiveEventLegacyMirror(pickFeaturedLiveEvent(nextCatalog)),
            };
        });
        setSelectedEventId(nextEvent.id);
    };

    const handleSelectEventDraft = (eventId: string) => {
        setSelectedEventId(eventId);
    };

    const handleArchiveEventDraft = (eventId: string) => {
        const currentCatalog = getEventCatalogFromState(siteSettings);
        const currentEvent = currentCatalog.find((event) => event.id === eventId);
        if (!currentEvent) return;

        const nextEvent = normalizeLiveEventCatalogEntry({
            ...currentEvent,
            archived: !currentEvent.archived,
            updated_at: new Date().toISOString(),
        });

        void persistEventCatalog(replaceEventInCatalog(currentCatalog, nextEvent));
    };

    const handleMarkEventFeatured = (eventId: string) => {
        const nextCatalog = sortLiveEventCatalog(
            getEventCatalogFromState(siteSettings).map((event) => normalizeLiveEventCatalogEntry({
                ...event,
                featured: event.id === eventId,
                updated_at: new Date().toISOString(),
            })),
        );

        void persistEventCatalog(nextCatalog, nextCatalog.find((event) => event.id === eventId) || null);
    };

    const handleDeleteEventDraft = async (eventId: string) => {
        const currentCatalog = getEventCatalogFromState(siteSettings);
        const currentEvent = currentCatalog.find((event) => event.id === eventId);
        if (!currentEvent) return;

        const eventLabel = getLiveEventLabel(currentEvent);
        if (!confirm(`למחוק את האיוונט "${eventLabel}"?`)) return;

        let nextCatalog = sortLiveEventCatalog(currentCatalog.filter((event) => event.id !== eventId));
        const deletedWasFeatured = currentEvent.featured;

        if (deletedWasFeatured && nextCatalog.length > 0) {
            const fallbackFeatured = pickFeaturedLiveEvent(nextCatalog) || nextCatalog[0];
            nextCatalog = sortLiveEventCatalog(
                nextCatalog.map((event) => normalizeLiveEventCatalogEntry({
                    ...event,
                    featured: event.id === fallbackFeatured.id,
                    updated_at: new Date().toISOString(),
                })),
            );
        }

        const nextSelectedEvent = selectedEventId === eventId
            ? (pickFeaturedLiveEvent(nextCatalog) || nextCatalog[0] || null)
            : resolveSelectedEvent({
                ...siteSettings,
                [LIVE_EVENTS_CATALOG_KEY]: nextCatalog,
                [LIVE_EVENT_SETTINGS_KEY]: buildLiveEventLegacyMirror(pickFeaturedLiveEvent(nextCatalog)),
            });

        const saved = await persistEventCatalog(nextCatalog, pickFeaturedLiveEvent(nextCatalog));
        if (!saved) return;

        setSelectedEventId(nextSelectedEvent?.id || null);
        sendOwl("האיוונט נמחק", `${eventLabel} הוסר מהקטלוג.`, "success");
    };

    const handleAddEventMission = () => {
        const current = buildEventSettings();
        updateEventSettingsDraft({ missions: [...current.missions, getDefaultEventMission()] });
    };

    const handleUpdateEventMission = (index: number, patch: Partial<LiveEventMission>) => {
        const current = buildEventSettings();
        const missions = current.missions.map((mission, missionIndex) => (
            missionIndex === index
                ? { ...mission, ...patch }
                : mission
        ));
        updateEventSettingsDraft({ missions });
    };

    const handleRemoveEventMission = (index: number) => {
        const current = buildEventSettings();
        updateEventSettingsDraft({ missions: current.missions.filter((_, missionIndex) => missionIndex !== index) });
    };

    const handleAddEventReward = () => {
        const current = buildEventSettings();
        const nextRank = current.rewards.reduce((maxRank, reward) => {
            const parsedRank = Number(reward.rank);
            return Number.isFinite(parsedRank) ? Math.max(maxRank, parsedRank) : maxRank;
        }, 0) + 1;

        updateEventSettingsDraft({ rewards: [...current.rewards, getDefaultEventReward(nextRank)] });
    };

    const handleUpdateEventReward = (index: number, patch: Partial<LiveEventReward>) => {
        const current = buildEventSettings();
        const rewards = current.rewards.map((reward, rewardIndex) => (
            rewardIndex === index
                ? { ...reward, ...patch }
                : reward
        ));
        updateEventSettingsDraft({ rewards });
    };

    const handleRemoveEventReward = (index: number) => {
        const current = buildEventSettings();
        updateEventSettingsDraft({ rewards: current.rewards.filter((_, rewardIndex) => rewardIndex !== index) });
    };

    const closeForumEditor = () => {
        setIsAddingForum(false);
        setEditingForumId(null);
        setForumForm(getDefaultForumForm());
    };

    const handleCreateForumDraft = () => {
        closeForumEditor();
        setIsAddingForum(true);
    };

    const handleEditForumDraft = (forum: any) => {
        setIsAddingForum(false);
        setEditingForumId(forum.id);
        setForumForm({
            name: forum.name || "",
            description: forum.description || "",
            slug: forum.slug || "",
            icon: forum.icon || "💬",
            category_id: forum.category_id || "",
            staff_only_create: forum.staff_only_create === true,
            house_restriction: forum.house_restriction || "",
            min_year: forum.min_year ? String(forum.min_year) : "",
        });
    };

    const handleForumNameChange = (value: string) => {
        setForumForm(prev => {
            const currentAutoSlug = normalizeForumSlug(prev.name);
            const shouldSyncSlug = !prev.slug || prev.slug === currentAutoSlug;

            return {
                ...prev,
                name: value,
                slug: shouldSyncSlug ? normalizeForumSlug(value) : prev.slug,
            };
        });
    };

    const handleSaveForum = async () => {
        const trimmedName = forumForm.name.trim();
        const trimmedDescription = forumForm.description.trim();
        const nextSlug = normalizeForumSlug(forumForm.slug || forumForm.name);
        const minYearNumber = forumForm.min_year ? Math.max(1, parseInt(forumForm.min_year, 10) || 1) : null;

        if (!trimmedName || !nextSlug) {
            sendOwl("חסר מידע", "חובה למלא שם פורום וסלאג תקין.", "error");
            return;
        }

        setIsSavingForum(true);
        const payload = {
            name: trimmedName,
            description: trimmedDescription,
            slug: nextSlug,
            icon: forumForm.icon.trim() || "💬",
            category_id: forumForm.category_id || null,
            staff_only_create: forumForm.staff_only_create,
            house_restriction: forumForm.house_restriction || null,
            min_year: minYearNumber,
        };

        const query = editingForumId
            ? supabase.from('forums').update(payload).eq('id', editingForumId)
            : supabase.from('forums').insert([payload]);

        const { data, error } = await query.select('*').single();

        if (error) {
            sendOwl("שגיאה", error.message, "error");
            setIsSavingForum(false);
            return;
        }

        sendOwl(editingForumId ? "עודכן" : "נוצר", editingForumId ? "הפורום עודכן בהצלחה." : "הפורום נוסף בהצלחה.", "success");
        void audit({
            action: editingForumId ? "update_forum" : "create_forum",
            targetType: "forum",
            targetId: data?.id || editingForumId,
            targetLabel: trimmedName,
            details: {
                slug: nextSlug,
                categoryId: payload.category_id,
                staffOnlyCreate: payload.staff_only_create,
                houseRestriction: payload.house_restriction,
                minYear: payload.min_year,
            },
        });

        closeForumEditor();
        await fetchData();

        if (data?.id) {
            setSelectedForum(data);
            void fetchThreads(data.id);
        }

        setIsSavingForum(false);
    };

    const handlePreviewEventRewards = async () => {
        setIsLoadingPreview(true);
        setRewardPreview(null);

        const ev = buildEventSettings();
        const rewards = (ev.rewards || []) as LiveEventReward[];
        const hasConfiguredRewards = rewards.length > 0;

        const { data: participants } = await supabase
            .from("profiles")
            .select("id, full_name, created_at, event_points, passover_points")
            .or("event_points.gt.0,passover_points.gt.0")
            .limit(250);

        const ranked = [...(participants || [])]
            .filter((p: any) => getProfileLiveEventPoints(p) > 0)
            .sort(compareLiveEventParticipants);

        const LEGACY_GALLEONS: Record<number, number> = { 1: 1000, 2: 500, 3: 250 };

        const preview: { rank: number; name: string; galleons: number; points: number; group: string | null }[] = [];
        let rank = 1;
        for (const participant of ranked.slice(0, 10)) {
            const rewardEntry = rewards.find((r: any) => Number(r.rank) === rank);
            if (hasConfiguredRewards && !rewardEntry) { rank++; continue; }

            const galleons = rewardEntry?.galleons != null ? Number(rewardEntry.galleons) : (LEGACY_GALLEONS[rank] ?? 100);
            const points = rewardEntry?.points != null ? Number(rewardEntry.points) : 0;
            const group = (rewardEntry?.group_name as string | undefined) || null;

            preview.push({ rank, name: (participant as any).full_name || "קוסם", galleons, points, group });
            rank++;
        }

        setRewardPreview(preview);
        setIsLoadingPreview(false);
    };

    const handleDistributeEventRewards = async () => {
        if (!confirm("⚠️ האם אתה בטוח שברצונך לסיים את האיוונט ולחלק את כל הפרסים? פעולה זו תחלק גליאונים ודרגות ולא ניתנת לביטול!")) return;

        const currentEvent = buildEventSettings();
        if (currentEvent.rewards_distributed || currentEvent.completed_at) {
            sendOwl("הפרסים כבר חולקו", "האיוונט הזה כבר נסגר, ולכן לא נבצע חלוקה נוספת.", "info");
            return;
        }

        const currentCatalog = getEventCatalogFromState(siteSettings);
        const synced = await persistEventCatalog(currentCatalog, currentEvent);
        if (!synced) return;

        const { error } = await supabase.rpc('distribute_event_rewards');

        const isMissingRpc = Boolean(
            error?.message
            && (
                /Could not find the function/i.test(error.message)
                || /schema cache/i.test(error.message)
                || /function\s+public\.(distribute_event_rewards|distribute_passover_rewards).*does not exist/i.test(error.message)
            ),
        );
        if (isMissingRpc) {
            sendOwl(
                "נדרש עדכון מסד",
                'ה-RPC של חלוקת הפרסים לא זמין למשתמש המחובר. אם כבר הרצת את מיגרציות הפרסים, תריץ גם את 20260325_event_reward_rpc_grants.sql כדי לתת הרשאת EXECUTE ל-admin המחובר.',
                "error",
            );
            return;
        }

        const isAlreadyDistributed = Boolean(
            error?.message
            && (
                /already distributed/i.test(error.message)
                || /already been distributed/i.test(error.message)
            ),
        );
        if (isAlreadyDistributed) {
            sendOwl("הפרסים כבר חולקו", "האיוונט כבר סומן כנסגר במסד, ולכן לא נשלחה חלוקה נוספת.", "info");
            fetchData();
            return;
        }

        if (error) {
            sendOwl("שגיאה בחלוקה", error.message, "error");
        } else {
            const closedEvent = normalizeLiveEventCatalogEntry({
                ...currentEvent,
                active: false,
                featured: false,
                rewards_distributed: true,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            const updatedCatalog = replaceEventInCatalog(currentCatalog, closedEvent);
            const nextFeaturedId = pickFeaturedLiveEvent(
                updatedCatalog.filter((event) => event.id !== closedEvent.id),
            )?.id || null;
            const normalizedCatalog = updatedCatalog.map((event) => normalizeLiveEventCatalogEntry({
                ...event,
                featured: nextFeaturedId ? event.id === nextFeaturedId : false,
            }));

            await persistEventCatalog(normalizedCatalog);
            triggerAudioPlay();
            sendOwl("קסם בוצע!", "הפרסים חולקו בהצלחה, והאיוונט הסתיים.", "magic");
            fetchData();
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => searchUsers(q), 300);
    };

    const handleTestActivity = async () => {
        if (!profile) return;
        setIsTestingActivity(true);
        await logActivityEvent(supabase, {
            actorId: profile.id,
            actorName: profile.full_name,
            eventType: "admin_test_event",
            title: "בדיקת מערכת",
            subtitle: "המנהל בדק את תקינות יומן הפעילות",
            icon: "⚠️"
        });
        fetchData();
        setIsTestingActivity(false);
        sendOwl("לוג נשלח", "האירוע נוסף ליומן הפעילות בהצלחה.", "info");
    };

    /* ── Season Reset ── */
    const handleResetSeason = async () => {
        if (!confirm("⚠️ אזהרה: פעולה זו תאפס את כל נקודות הבתים. להמשיך?")) return;
        setIsResetting(true);
        const { error } = await supabase.rpc('reset_house_cup');
        if (error) { sendOwl("שגיאה", error?.message || "", "error"); }
        else {
            triggerAudioPlay();
            sendOwl("העונה הסתיימה!", "הנקודות אופסו והגביע הוענק.", "magic");
            fetchData();
        }
        setIsResetting(false);
    };

    /* ── Rewards ── */
    const handleUpdateReward = async () => {
        if (!selectedUser) return;
        setIsUpdating(true);
        const pAdd = parseInt(pointsToAdd.toString()) || 0;
        const gAdd = parseInt(galleonsToAdd.toString()) || 0;
        const { error } = await supabase.rpc('admin_add_reward', {
            target_user_id: selectedUser.id,
            points_to_add: pAdd,
            galleons_to_add: gAdd
        });
        if (error) { sendOwl("תקלה", error.message, "error"); }
        else {
            triggerAudioPlay();
            sendOwl("המענק הועבר", `המשאבים הועברו אל ${selectedUser.full_name}.`, "success");
            setPointsToAdd(0); setGalleonsToAdd(0);
            setSelectedUser(null); setSearchQuery(""); setUsers([]);
            fetchData();
        }
        setIsUpdating(false);
    };

    /* ── News ── */
    const startEdit = (item: any) => {
        setEditingId(item.id);
        setNewArticle({ title: item.title || "", content: item.content || "", author: item.author || "הנהלת הטירה", meta_title: item.meta_title || "", meta_description: item.meta_description || "", image_url: item.image_url || "" });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSavePoll = async (newsId: string) => {
        if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
            sendOwl("שגיאה", "יש למלא שאלה ולפחות 2 אפשרויות.", "error");
            return;
        }
        setIsCreatingPoll(true);
        const { data: poll, error: pollError } = await supabase
            .from('polls')
            .insert({ news_id: newsId, question: pollQuestion })
            .select('id')
            .single();
        if (pollError) {
            sendOwl("שגיאת סקר", pollError.message, "error");
            setIsCreatingPoll(false);
            return;
        }
        if (poll) {
            const options = pollOptions
                .filter(o => o.trim())
                .map(o => ({ poll_id: poll.id, option_text: o.trim(), votes_count: 0 }));
            await supabase.from('poll_options').insert(options);
            sendOwl("סקר נוצר!", "הסקר נוסף לכתבה.", "magic");
            setPollQuestion("");
            setPollOptions(["", "", "", ""]);
        }
        setIsCreatingPoll(false);
    };

    const handleSaveNews = async () => {
        if (!newArticle.title || !newArticle.content) { sendOwl("מידע חסר", "חובה למלא כותרת ותוכן.", "error"); return; }
        setIsPublishing(true);
        const { data: created, error } = editingId
            ? await supabase.from('news').update(newArticle).eq('id', editingId).select('id').single()
            : await supabase.from('news').insert([{ ...newArticle, author_id: profile?.id }]).select('id').single();
        if (!error && created) {
            triggerAudioPlay();
            sendOwl(editingId ? "עודכן!" : "פורסם!", "השינויים נשמרו.", "success");
            if (!editingId && pollQuestion.trim()) {
                await handleSavePoll(created.id);
            }
            void audit({
                action: editingId ? "update_news" : "create_news",
                targetType: "news",
                targetId: created.id,
                targetLabel: newArticle.title,
            });
            if (!editingId && profile?.id) {
                void logActivityEvent(supabase, {
                    actorId: profile.id,
                    eventType: "news_published",
                    icon: "📰",
                    title: "פרסמ/ה כתבה חדשה בנביא היומי",
                    subtitle: newArticle.title,
                    description: newArticle.meta_description || null,
                    targetType: "news",
                    targetId: created.id,
                    targetUrl: getNewsArticlePath(created.id),
                });
            }
            setNewArticle(prev => ({ ...prev, title: "", content: "", image_url: "" }));
            setEditingId(null);
            fetchData();
        }
        setIsPublishing(false);
    };

    const handleDeleteNews = async (id: string) => {
        if (!confirm("למחוק?")) return;
        const newsItem = news.find((item) => item.id === id);
        const { error } = await supabase.from('news').delete().eq('id', id);
        if (!error) {
            sendOwl("נמחק", "", "success");
            void audit({ action: "delete_news", targetType: "news", targetId: id, targetLabel: newsItem?.title || null });
            fetchData();
        }
    };
    const handleDeleteContent = async (report: any) => {
        const targetTable = REPORT_TARGET_TABLE[report.target_type];
        if (!targetTable) {
            sendOwl("שגיאה", "סוג הדיווח עדיין לא נתמך.", "error");
            return;
        }

        const { error } = await supabase.from(targetTable).delete().eq('id', report.target_id);
        if (!error) {
            await supabase.from('reports').delete().eq('id', report.id);
            sendOwl("הוסר", "", "success");
            void audit({
                action: "resolve_report_delete_content",
                targetType: report.target_type,
                targetId: report.target_id,
                targetLabel: report.content_preview || null,
                details: { reportId: report.id, reason: report.reason },
            });
            fetchData();
        } else {
            sendOwl("שגיאה", error.message, "error");
        }
    };
    const handleDismissReport = async (id: string) => {
        const report = reports.find((item) => item.id === id);
        await supabase.from('reports').delete().eq('id', id);
        sendOwl("בוטל", "", "success");
        void audit({
            action: "dismiss_report",
            targetType: report?.target_type || "report",
            targetId: report?.target_id || id,
            targetLabel: report?.content_preview || null,
            details: { reportId: id, reason: report?.reason || null },
        });
        fetchData();
    };

    /* ── Broadcast ── */
    const handleBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        await supabase.channel('lumos_global_presence').send({ type: 'broadcast', event: 'ministry_announcement', payload: { message: broadcastMsg, from: "הנהלת הטירה" } });
        triggerAudioPlay();
        sendOwl("שוגר!", "ההכרזה נשלחה.", "magic");
        void audit({
            action: "broadcast_announcement",
            targetType: "presence_broadcast",
            targetLabel: broadcastMsg.slice(0, 80),
            details: { message: broadcastMsg },
        });
        setBroadcastMsg("");
    };

    /* ── Year system ── */
    const handleSaveYear = async () => {
        if (!editingYear) return;
        const { id, year } = editingYear;
        setIsSavingYear(true);
        const { error } = await supabase.from('profiles').update({ year }).eq('id', id);
        if (error) { sendOwl("שגיאה", error?.message || "", "error"); }
        else {
            sendOwl("עודכן", "שנת הלימודים של הדמות עודכנה.", "success");
            setAllProfiles(prev => prev.map(p => p.id === id ? { ...p, year } : p));
            setEditingYear(null);
        }
        setIsSavingYear(false);
    };

    /* ── Role management ── */
    const handleSaveRole = async () => {
        if (!editingRole) return;
        const { id, role } = editingRole;
        setIsSavingRole(true);
        const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else {
            sendOwl("עודכן", `תפקיד הדמות שונה ל-${role === "קוסמ׳" ? "תלמיד בטירה" : role}.`, "success");
            setEditingRole(null);
            fetchData();
        }
        setIsSavingRole(false);
    };

    const handleSaveGroup = async () => {
        if (!editingGroup) return;
        const { id, group_id } = editingGroup;
        setIsSavingGroup(true);
        const { error } = await supabase.from('profiles').update({ group_id: group_id || null }).eq('id', id);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else {
            const grp = userGroups.find(g => g.id === group_id);
            sendOwl("עודכן", `קבוצת הדמות שונתה ל-${grp?.name || "ללא קבוצה"}.`, "success");
            setEditingGroup(null);
            fetchData();
        }
        setIsSavingGroup(false);
    };

    const handleToggleBan = async (userId: string, currentStatus: string) => {
        const currentUserProfile = allProfiles.find((profile) => profile.id === userId);
        const isCurrentlyRestricted = currentStatus === 'banned' || currentStatus === 'cooling';
        const newStatus = isCurrentlyRestricted ? 'active' : 'banned';
        const label = newStatus === 'banned' ? 'חסום' : 'פעיל';
        if (newStatus === 'banned' && !confirm(`לחסום את הדמות הזאת?`)) return;
        const updateData = newStatus === 'banned'
            ? {
                status: 'banned',
                ban_reason: currentUserProfile?.ban_reason?.trim() || 'הורחק ע"י הנהלה',
                ban_expires_at: null,
                is_ghost: false,
            }
            : {
                status: 'active',
                ban_reason: null,
                ban_expires_at: null,
                is_ghost: false,
            };

        const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else {
            await audit({
                action: newStatus === 'banned' ? 'set_user_banned' : 'release_user_moderation',
                targetType: 'profile',
                targetId: userId,
                targetLabel: currentUserProfile?.full_name || null,
                details: newStatus === 'banned'
                    ? { reason: updateData.ban_reason, previousStatus: currentStatus || null }
                    : { previousStatus: currentStatus || null },
            });
            sendOwl("עודכן", `סטטוס הדמות שונה ל${label}.`, "success");
            await fetchData();
        }
    };

    /* ── Forums ── */
    const handleDeleteThread = async (threadId: string) => {
        if (!confirm("למחוק שרשור זה?")) return;
        const { error } = await supabase.from('threads').delete().eq('id', threadId);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else { sendOwl("נמחק", "השרשור הוסר.", "success"); setThreads(prev => prev.filter(t => t.id !== threadId)); }
    };
    const handleLockThread = async (thread: any) => {
        const locked = !thread.is_locked;
        const { error } = await supabase.from('threads').update({ is_locked: locked }).eq('id', thread.id);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else { sendOwl(locked ? "נעול" : "נפתח", "", "success"); setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, is_locked: locked } : t)); }
    };
    const handlePinThread = async (thread: any) => {
        const pinned = !thread.is_pinned;
        const { error } = await supabase.from('threads').update({ is_pinned: pinned }).eq('id', thread.id);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else { sendOwl(pinned ? "📌 נעוץ" : "בוטל עיגון", "", "success"); setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, is_pinned: pinned } : t)); }
    };
    const handleDeleteForum = async (forumId: string) => {
        if (!confirm("למחוק פורום זה וכל תכניו? פעולה בלתי הפיכה!")) return;
        const forum = forums.find((item) => item.id === forumId);
        const { error } = await supabase.from('forums').delete().eq('id', forumId);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else {
            sendOwl("נמחק", "הפורום הוסר.", "success");
            void audit({ action: "delete_forum", targetType: "forum", targetId: forumId, targetLabel: forum?.name || null });
            setForums(prev => prev.filter(f => f.id !== forumId));
            if (selectedForum?.id === forumId) {
                setSelectedForum(null);
                setThreads([]);
            }
            if (editingForumId === forumId) {
                closeForumEditor();
            }
        }
    };

    /* ── Shop ── */
    const handleSaveItem = async () => {
        setIsSavingItem(true);
        const data = editingItem || newItem;
        const { error } = editingItem?.id
            ? await supabase.from('shop_items').update(data).eq('id', editingItem.id)
            : await supabase.from('shop_items').insert([data]);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else {
            sendOwl(editingItem?.id ? "עודכן" : "נוסף", "הפריט נשמר.", "success");
            setEditingItem(null); setIsAddingItem(false);
            setNewItem({ name: "", description: "", price: 0, category: "wands", image_url: "", is_available: true });
            await fetchShopItems();
        }
        setIsSavingItem(false);
    };
    const handleDeleteItem = async (id: string) => {
        if (!confirm("למחוק פריט זה?")) return;
        const { error } = await supabase.from('shop_items').delete().eq('id', id);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else { sendOwl("נמחק", "", "success"); setShopItems(prev => prev.filter(i => i.id !== id)); }
    };
    const handleToggleAvailable = async (item: any) => {
        const nextAvailability = item.is_available !== true;
        // Optimistic update
        setShopItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: nextAvailability } : i));

        const { error: toggleError } = await supabase.from('shop_items').update({ is_available: nextAvailability }).eq('id', item.id);
        if (toggleError) {
            sendOwl("שגיאה", toggleError.message, "error");
            // Rollback
            setShopItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !nextAvailability } : i));
            return;
        }

        void audit({
            action: nextAvailability ? "enable_shop_item" : "disable_shop_item",
            targetType: "shop_item",
            targetId: item.id,
            targetLabel: item.name,
        });
        sendOwl(nextAvailability ? "מוצג" : "מוסתר", "", "success");
    };

    /* ── Exams ── */
    const handleSaveQuestion = async () => {
        setIsSavingQuestion(true);
        const data = editingQuestion || { ...newQuestion, exam_type: examFilter };
        const { error } = editingQuestion?.id
            ? await supabase.from('exam_questions').update(data).eq('id', editingQuestion.id)
            : await supabase.from('exam_questions').insert([{ ...newQuestion, exam_type: examFilter }]);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else {
            sendOwl(editingQuestion?.id ? "עודכן" : "נוסף", "השאלה נשמרה.", "success");
            setEditingQuestion(null); setIsAddingQuestion(false);
            setNewQuestion({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "a", exam_type: "owl" });
            await fetchExamQuestions();
        }
        setIsSavingQuestion(false);
    };
    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("למחוק שאלה זו?")) return;
        const { error } = await supabase.from('exam_questions').delete().eq('id', id);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else { sendOwl("נמחק", "", "success"); setExamQuestions(prev => prev.filter(q => q.id !== id)); }
    };

    /* ── Arena ── */
    const fetchArenaData = async () => {
        const [{ data: statsData }, { data: recData }, { data: pendingData }, { data: suspData }] = await Promise.all([
            supabase.from("duels").select("id, status, winner_id, expires_at"),
            supabase.from("duels")
                .select(`id, status, winner_id, created_at, finished_at,
                    challenger:profiles!duels_challenger_id_fkey(id, full_name, house),
                    opponent:profiles!duels_opponent_id_fkey(id, full_name, house),
                    winner:profiles!duels_winner_id_fkey(id, full_name)`)
                .eq("status", "finished")
                .order("finished_at", { ascending: false })
                .limit(20),
            supabase.from("duels")
                .select(`id, status, created_at, expires_at,
                    challenger:profiles!duels_challenger_id_fkey(id, full_name, house),
                    opponent:profiles!duels_opponent_id_fkey(id, full_name, house)`)
                .eq("status", "pending")
                .order("created_at", { ascending: false })
                .limit(20),
            // Suspicious: winners with >5 wins in one day in last 7 days
            supabase.from("duels")
                .select(`winner_id, finished_at, winner:profiles!duels_winner_id_fkey(id, full_name, house)`)
                .eq("status", "finished")
                .not("winner_id", "is", null)
                .gte("finished_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        ]);

        const now = Date.now();
        const stalePendingRows = (pendingData || []).filter((duel: any) => duel.expires_at && new Date(duel.expires_at).getTime() <= now);
        const livePendingRows = (pendingData || []).filter((duel: any) => !duel.expires_at || new Date(duel.expires_at).getTime() > now);

        if (stalePendingRows.length > 0) {
            const staleIds = stalePendingRows.map((duel: any) => duel.id);
            const nowIso = new Date().toISOString();

            const { error } = await supabase
                .from("duels")
                .update({ status: "expired" })
                .in("id", staleIds)
                .eq("status", "pending")
                .lt("expires_at", nowIso);

            if (error) {
                console.error("Failed to auto-expire stale pending duels", error);
            }
        }

        if (statsData) {
            const pendingLive = statsData.filter((d: any) => d.status === "pending" && (!d.expires_at || new Date(d.expires_at).getTime() > now));
            const pendingExpired = statsData.filter((d: any) => d.status === "pending" && d.expires_at && new Date(d.expires_at).getTime() <= now);
            const autoExpiredCount = stalePendingRows.length;
            setArenaStats({
                total: statsData.length,
                finished: statsData.filter((d: any) => d.status === "finished").length,
                active: statsData.filter((d: any) => d.status === "active").length,
                pending: pendingLive.length,
                stalePending: stalePendingRows.length > 0 ? Math.max(0, pendingExpired.length - autoExpiredCount) : pendingExpired.length,
                ties: statsData.filter((d: any) => d.status === "finished" && !d.winner_id).length,
            });
        }
        setArenaRecentDuels(recData || []);
        setArenaPendingDuels(stalePendingRows.length > 0 ? livePendingRows : (pendingData || []));

        // Aggregate suspects client-side
        if (suspData) {
            const dayMap: Record<string, Record<string, { player: any; count: number }>> = {};
            for (const d of suspData as any[]) {
                const day = d.finished_at?.slice(0, 10);
                if (!day || !d.winner_id) continue;
                if (!dayMap[day]) dayMap[day] = {};
                if (!dayMap[day][d.winner_id]) dayMap[day][d.winner_id] = { player: d.winner, count: 0 };
                dayMap[day][d.winner_id].count++;
            }
            const suspects: any[] = [];
            for (const [day, players] of Object.entries(dayMap)) {
                for (const [uid, info] of Object.entries(players)) {
                    if (info.count > 5) suspects.push({ ...info.player, daily_wins: info.count, day });
                }
            }
            setArenaSuspects(suspects.sort((a, b) => b.daily_wins - a.daily_wins));
        }
        setArenaLoaded(true);
    };

    const handleExpirePendingDuels = async () => {
        const nowIso = new Date().toISOString();
        setIsCleaningPending(true);
        const staleIds = arenaPendingDuels
            .filter((duel: any) => duel.expires_at && new Date(duel.expires_at).getTime() <= Date.now())
            .map((duel: any) => duel.id);

        if (!staleIds.length) {
            sendOwl("אין מה לנקות", "לא נמצאו אתגרים שפג להם התוקף כרגע.", "info");
            setIsCleaningPending(false);
            return;
        }

        const { error } = await supabase
            .from("duels")
            .update({ status: "expired" })
            .in("id", staleIds)
            .eq("status", "pending")
            .lt("expires_at", nowIso);

        if (error) {
            sendOwl("שגיאה", error.message, "error");
        } else {
            sendOwl("נוקה בהצלחה", `${staleIds.length} אתגרי דו-קרב הועברו ל-expired.`, "success");
            void audit({
                action: "expire_pending_duels",
                targetType: "duel",
                targetLabel: "arena_pending_cleanup",
                details: { expiredCount: staleIds.length },
            });
            fetchArenaData();
        }
        setIsCleaningPending(false);
    };

    const handleCancelDuel = async (duelId: string) => {
        if (!confirm("לבטל קרב זה?")) return;
        const { error } = await supabase.from("duels").update({ status: "cancelled" }).eq("id", duelId);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else { sendOwl("בוטל", "הקרב בוטל.", "success"); fetchArenaData(); }
    };

    const handleResetDuelBadge = async (userId: string, userName: string) => {
        if (!confirm(`להסיר תואר מ-${userName}?`)) return;
        setBadgeGrantLoading(userId);
        const { error } = await supabase.from("profiles").update({ duel_badge: null }).eq("id", userId);
        if (error) { sendOwl("שגיאה", `${error.message} — האם קיים עמודה duel_badge בטבלת profiles?`, "error"); }
        else {
            sendOwl("הוסר", `התואר הוסר מ-${userName}.`, "success");
            // update local state immediately so button disappears
            setBadgeGrantResults(prev => prev.map(u => u.id === userId ? { ...u, duel_badge: null } : u));
            setArenaSuspects(prev => prev.map(u => u.id === userId ? { ...u, duel_badge: null } : u));
        }
        setBadgeGrantLoading(null);
    };

    const handleGrantDuelBadge = async (userId: string, userName: string) => {
        setBadgeGrantLoading(userId);
        const badge = "אלוף הזירה ⚔️";
        const { error } = await supabase.from("profiles").update({ duel_badge: badge }).eq("id", userId);
        if (error) { sendOwl("שגיאה", `${error.message} — האם קיימת עמודה duel_badge בטבלת profiles?`, "error"); }
        else {
            await supabase.from("notifications").insert({ user_id: userId, type: "achievement", content: '🏆 המנהל הענק לך את תואר "אלוף הזירה"!', is_read: false });
            sendOwl("הוענק", `התואר הוענק ל-${userName}.`, "success");
            setBadgeGrantResults(prev => prev.map(u => u.id === userId ? { ...u, duel_badge: badge } : u));
        }
        setBadgeGrantLoading(null);
    };

    const searchBadgeGrantUsers = async (q: string) => {
        setBadgeGrantSearch(q);
        if (!q.trim()) { setBadgeGrantResults([]); return; }
        // Don't select duel_badge here — column may not exist yet; we'll add it after grant
        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, house, avatar_url")
            .ilike("full_name", `%${q}%`)
            .limit(8);
        if (error) { sendOwl("שגיאה בחיפוש", error.message, "error"); return; }
        // Try to also get duel_badge, ignore if column missing
        const ids = (data || []).map((u: any) => u.id);
        if (ids.length) {
            const { data: withBadge } = await supabase
                .from("profiles")
                .select("id, duel_badge")
                .in("id", ids);
            const badgeMap: Record<string, string | null> = {};
            (withBadge || []).forEach((u: any) => { badgeMap[u.id] = u.duel_badge; });
            setBadgeGrantResults((data || []).map((u: any) => ({ ...u, duel_badge: badgeMap[u.id] ?? null })));
        } else {
            setBadgeGrantResults(data || []);
        }
    };

    const unsortedUsersCount = allProfiles.filter((entry: any) => isUnsortedHouse(entry.house)).length;
    const profilesWithEmailCount = allProfiles.filter(
        (entry: any) => typeof entry.email === "string" && entry.email.trim().length > 0,
    ).length;

    if (loading) return null;
    // Year distribution
    const yearDist = [1, 2, 3, 4, 5, 6, 7].map(y => ({
        year: y,
        title: getYearTitle(y),
        count: allProfiles.filter(p => getYearFromProfile(p) === y).length,
    }));
    const maxYearCount = Math.max(...yearDist.map(d => d.count), 1);
    const forumCategoryMap = Object.fromEntries(forumCategories.map(category => [category.id, category.name]));

    return (
        <div className="admin-readable min-h-screen bg-[#08111f] text-white py-12 px-4 md:px-6 font-assistant text-[15px] md:text-base" dir="rtl">
            <style>{`
                .sun-editor { border: 1px solid rgba(245,158,11,0.2) !important; background-color: #020617 !important; border-radius: 1rem !important; }
                .sun-editor .se-container { background-color: #020617 !important; }
                .sun-editor .se-toolbar { background-color: #0f172a !important; border-bottom: 1px solid rgba(255,255,255,0.05) !important; outline: none !important; }
                .sun-editor .se-resizing-bar { background-color: #0f172a !important; border-top: 1px solid rgba(255,255,255,0.05) !important; }
                .sun-editor .se-wrapper .se-wrapper-inner { background-color: #020617 !important; }
                .sun-editor-editable { background-color: #020617 !important; color: white !important; font-family: 'Assistant', sans-serif !important; padding: 20px !important; }
                .sun-editor .se-list-layer { background-color: #1e293b !important; border: 1px solid #334155 !important; }
                .sun-editor .se-btn-list:hover { background-color: #334155 !important; }
                .sun-editor .se-svg { fill: #f59e0b !important; }
                .admin-readable { background:
                    radial-gradient(circle at top, rgba(56,189,248,0.08), transparent 34%),
                    linear-gradient(180deg, #09111f 0%, #0d1728 48%, #08111f 100%);
                }
                .admin-card { background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 18px 45px rgba(2,6,23,0.18); }
                .admin-card:hover { border-color: rgba(255,255,255,0.18); }
                .house-bar { transition: width 1s cubic-bezier(0.4,0,0.2,1); }
                .search-result-item { transition: all 0.15s ease; }
                .search-result-item:hover { background: rgba(245,158,11,0.08); }
                .search-result-item.selected { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); }
                .admin-readable .text-white\\/15 { color: rgba(255,255,255,0.42) !important; }
                .admin-readable .text-white\\/20 { color: rgba(255,255,255,0.5) !important; }
                .admin-readable .text-white\\/25 { color: rgba(255,255,255,0.58) !important; }
                .admin-readable .text-white\\/30 { color: rgba(255,255,255,0.66) !important; }
                .admin-readable .text-white\\/35 { color: rgba(255,255,255,0.72) !important; }
                .admin-readable .text-white\\/40 { color: rgba(255,255,255,0.78) !important; }
                .admin-readable .text-white\\/45 { color: rgba(255,255,255,0.82) !important; }
                .admin-readable .text-white\\/50 { color: rgba(255,255,255,0.86) !important; }
                .admin-readable .text-white\\/60 { color: rgba(255,255,255,0.9) !important; }
                .admin-readable .text-white\\/70 { color: rgba(255,255,255,0.95) !important; }
                .admin-readable input,
                .admin-readable textarea,
                .admin-readable select { font-size: 0.98rem; color: white !important; }
                .admin-readable textarea { line-height: 1.65; }
                .admin-readable table { font-size: 0.97rem; }
            `}</style>

            <div className="max-w-7xl mx-auto space-y-6">

                {/* ── Header ── */}
                <header className="flex items-center justify-between pb-6 border-b border-white/[0.06]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                            <ShieldCheck size={28} className="text-amber-500" />
                        </div>
                        <div>
                            <h1 className="font-cinzel text-2xl font-black text-white tracking-tight">לשכת המנהל</h1>
                            <p className="text-[11px] text-white/25 uppercase tracking-widest font-cinzel">Ministry of Magic — Admin Panel</p>
                        </div>
                    </div>
                    <Link href="/dashboard" className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors border border-white/[0.06] px-4 py-2.5 rounded-xl hover:border-white/10">
                        <ChevronRight size={14} /> חזרה לטירה
                    </Link>
                </header>

                {/* ── Season Reset Banner ── */}
                {isAdmin && (
                    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-l from-amber-900/20 via-amber-900/10 to-transparent p-6 flex items-center justify-between gap-6">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(245,158,11,0.08),transparent)] pointer-events-none" />
                        <div className="relative flex items-center gap-4">
                            <Zap size={24} className="text-amber-500 animate-pulse shrink-0" />
                            <div>
                                <p className="font-cinzel font-black text-amber-400 text-sm">אירוע סיום עונה</p>
                                <p className="text-[11px] text-white/35 mt-0.5">איפוס נקודות הבתים והענקת גביע הבית</p>
                            </div>
                        </div>
                        <button onClick={handleResetSeason} disabled={isResetting}
                            className="relative shrink-0 flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-black px-6 py-3 rounded-xl font-cinzel font-black text-xs uppercase transition-all active:scale-95 disabled:opacity-40">
                            <RotateCcw size={14} className={isResetting ? 'animate-spin' : ''} />
                            {isResetting ? 'מאפס...' : 'הפעל סיום עונה'}
                        </button>
                    </div>
                )}

                {/* ── Tab Navigation ── */}
                <div className="flex gap-2 border-b border-white/[0.06] pb-0 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                    {TAB_CONFIG
                        .filter(tab => isAdmin || ['house-cup', 'health', 'moderation', 'forums', 'logs'].includes(tab.id))
                        .map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-cinzel text-xs font-black uppercase tracking-wide transition-all border-b-2 shrink-0 whitespace-nowrap
                                    ${isActive
                                            ? `${tab.color} border-current bg-white/[0.03]`
                                            : 'text-white/30 border-transparent hover:text-white/60 hover:bg-white/[0.02]'
                                        }`}
                                >
                                    <Icon size={13} />
                                    {tab.label}
                                    {tab.id === "moderation" && reports.length > 0 && (
                                        <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded-full">{reports.length}</span>
                                    )}
                                </button>
                            );
                        })}
                </div>

                {/* ── Main Layout: Content + Broadcast Sidebar ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── TAB CONTENT ── */}
                    <div className="lg:col-span-2 space-y-6">
                        <AdminTabGuide content={TAB_GUIDES[activeTab]} />

                        {/* ── TAB 1: גביע הבית ── */}
                        {activeTab === "house-cup" && (
                            <AdminOverviewTab
                                housePoints={housePoints}
                                houseConfig={HOUSE_CONFIG}
                                reportsCount={reports.length}
                                adminLogsCount={adminLogs.length}
                                activityEvents={activityEvents}
                                allProfiles={allProfiles}
                                siteSettings={siteSettings}
                                newsItems={news}
                                forumItems={forums}
                                onOpenTab={setActiveTab}
                                isAdmin={isAdmin}
                                searchQuery={searchQuery}
                                onSearchChange={handleSearchChange}
                                onSearchSubmit={() => searchUsers(searchQuery)}
                                isSearching={isSearching}
                                users={users}
                                selectedUser={selectedUser}
                                onSelectUser={setSelectedUser}
                                onClearSelectedUser={() => { setSelectedUser(null); setSearchQuery(""); setUsers([]); }}
                                pointsToAdd={pointsToAdd}
                                onPointsChange={setPointsToAdd}
                                galleonsToAdd={galleonsToAdd}
                                onGalleonsChange={setGalleonsToAdd}
                                onSubmitReward={handleUpdateReward}
                                isUpdating={isUpdating}
                            />
                        )}

                        {/* ── TAB 2: נביא היומי ── */}
                        {activeTab === "prophet" && (
                            <>
                                <section className="admin-card rounded-2xl p-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-cinzel text-sm font-black text-blue-400 flex items-center gap-2 uppercase tracking-widest">
                                            <Newspaper size={16} />
                                            {editingId ? 'עריכת כתבה' : 'כתבה חדשה'}
                                        </h3>
                                        {editingId && (
                                            <button onClick={() => { setEditingId(null); setNewArticle(p => ({ ...p, title: "", content: "", image_url: "" })); }}
                                                className="text-[10px] text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all font-black uppercase">
                                                ביטול
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5 text-right">
                                            <label className="text-[10px] text-white/30 font-black uppercase tracking-widest">כותרת</label>
                                            <input value={newArticle.title} onChange={(e) => setNewArticle(p => ({ ...p, title: e.target.value }))}
                                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 outline-none focus:border-blue-500/40 text-white text-sm transition-all"
                                                dir="rtl" />
                                        </div>
                                        <div className="space-y-1.5 text-right">
                                            <label className="text-[10px] text-white/30 font-black uppercase tracking-widest">תמונת נושא (URL)</label>
                                            <input value={newArticle.image_url} onChange={(e) => setNewArticle(p => ({ ...p, image_url: e.target.value }))}
                                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 outline-none focus:border-blue-500/40 text-blue-200/50 text-xs transition-all"
                                                dir="ltr" />
                                        </div>
                                    </div>
                                    <div dir="ltr" className="rounded-xl overflow-hidden">
                                        <SunEditor
                                            setContents={newArticle.content}
                                            onChange={(content) => setNewArticle(p => ({ ...p, content }))}
                                            setOptions={{ buttonList: [['undo', 'redo'], ['formatBlock', 'fontSize'], ['bold', 'underline', 'italic'], ['fontColor', 'hiliteColor'], ['align', 'list', 'link', 'image'], ['fullScreen', 'codeView']], rtl: true, width: '100%', height: 380 } as any}
                                        />
                                    </div>
                                    <button onClick={handleSaveNews} disabled={isPublishing}
                                        className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-cinzel font-black text-sm uppercase tracking-widest transition-all active:scale-[0.99] disabled:opacity-40">
                                        {isPublishing ? 'מפרסם...' : (editingId ? 'שמירת שינויים ✨' : 'פרסום בנביא היומי ✨')}
                                    </button>

                                    {/* ── סקר ── */}
                                    <div className="border border-amber-500/20 rounded-2xl p-5 space-y-4 bg-amber-500/5">
                                        <h3 className="font-cinzel text-xs font-black text-amber-400 flex items-center gap-2 uppercase tracking-widest">
                                            <BarChart3 size={13} /> הוספת סקר לכתבה (אופציונלי)
                                        </h3>
                                        <input
                                            value={pollQuestion}
                                            onChange={e => setPollQuestion(e.target.value)}
                                            placeholder="שאלת הסקר..."
                                            className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-amber-500/30 rounded-xl p-3 text-sm outline-none"
                                            dir="rtl"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            {pollOptions.map((opt, i) => (
                                                <input
                                                    key={i}
                                                    value={opt}
                                                    onChange={e => { const updated = [...pollOptions]; updated[i] = e.target.value; setPollOptions(updated); }}
                                                    placeholder={`אפשרות ${i + 1}`}
                                                    className="bg-white/[0.03] border border-white/[0.06] focus:border-amber-500/30 rounded-xl p-2.5 text-sm outline-none"
                                                    dir="rtl"
                                                />
                                            ))}
                                        </div>
                                        {pollQuestion.trim() && <p className="text-[10px] text-amber-400/60 font-cinzel">✓ הסקר יצורף אוטומטית עם פרסום הכתבה</p>}
                                    </div>
                                </section>

                                <section className="admin-card rounded-2xl p-6 space-y-4">
                                    <h3 className="font-cinzel text-xs font-black text-white/25 flex items-center gap-2 uppercase tracking-widest">
                                        <FileText size={13} /> ארכיון הנביא ({news.length})
                                    </h3>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {news.map(item => (
                                            <div key={item.id} className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all">
                                                <h4 className="text-sm text-white/60 group-hover:text-white/80 transition-colors font-medium truncate text-right">{item.title}</h4>
                                                <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEdit(item)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={13} /></button>
                                                    <button onClick={() => handleDeleteNews(item.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={13} /></button>
                                                </div>

                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}

                        {/* ── TAB 3: מודרציה ── */}
                        {activeTab === "moderation" && (
                            <>
                                <section className="admin-card rounded-2xl p-6 space-y-4">
                                    <h3 className="font-cinzel text-sm font-black text-red-400 flex items-center gap-2 uppercase tracking-widest">
                                        <Flag size={15} /> דיווחים פעילים
                                        {reports.length > 0 && (
                                            <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-black">{reports.length}</span>
                                        )}
                                    </h3>
                                    {reports.length === 0 ? (
                                        <div className="py-10 text-center">
                                            <CheckCircle size={32} className="mx-auto text-white/10 mb-3" />
                                            <p className="text-white/20 text-sm font-crimson italic">השקט נשמר.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-80 overflow-y-auto">
                                            {reports.map(r => (
                                                <div key={r.id} className="bg-white/[0.02] border border-red-500/[0.08] rounded-xl p-4 flex items-center justify-between gap-4">
                                                    <div className="flex-1 text-right min-w-0">
                                                        <span className="text-[9px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-black">{r.reason}</span>
                                                        <span className="text-[9px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full font-black mr-2">{r.target_type || "content"}</span>
                                                        <p className="text-white/60 text-sm italic font-crimson mt-1.5 truncate">"{r.content_preview}"</p>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <button onClick={() => handleDeleteContent(r)} className="p-2.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                                                        <button onClick={() => handleDismissReport(r.id)} className="p-2.5 bg-white/5 text-white/40 rounded-lg hover:bg-white/10 transition-all"><CheckCircle size={14} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <ModerationTab
                                    sendOwl={sendOwl}
                                    onAudit={audit}
                                    profiles={allProfiles}
                                    logs={adminLogs}
                                    onRefresh={fetchData}
                                />
                            </>
                        )}

                        {/* ── TAB 4: מערכת שנים ── */}
                        {activeTab === "logs" && (
                            <AdminLogsTab logs={adminLogs} />
                        )}

                        {activeTab === "year-system" && (
                            <>
                                {/* Year distribution */}
                                <section className="admin-card rounded-2xl p-6 space-y-4">
                                    <h3 className="font-cinzel text-xs font-black text-purple-400 flex items-center gap-2 uppercase tracking-widest">
                                        <GraduationCap size={14} /> התפלגות שנים
                                    </h3>
                                    <div className="space-y-2.5">
                                        {yearDist.map(({ year, title, count }) => (
                                            <div key={year} className="flex items-center gap-3">
                                                <span className="font-cinzel text-[10px] text-white/40 w-16 text-right shrink-0">שנה {year} — {title}</span>
                                                <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full bg-purple-500/60 transition-all duration-700"
                                                        style={{ width: `${Math.round((count / maxYearCount) * 100)}%` }} />
                                                </div>
                                                <span className="font-cinzel font-black text-xs text-purple-400 w-8 text-left shrink-0">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Users table */}
                                <section className="admin-card rounded-2xl p-6 space-y-4">
                                    <h3 className="font-cinzel text-xs font-black text-white/30 flex items-center gap-2 uppercase tracking-widest">
                                        <Users size={13} /> כל הקוסמים ({allProfiles.length})
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-[10px] font-cinzel text-white/25 uppercase tracking-widest border-b border-white/[0.05]">
                                                    <th className="text-right pb-3 pr-1">שם</th>
                                                    <th className="text-right pb-3">בית</th>
                                                    <th className="text-center pb-3">שנה</th>
                                                    <th className="text-center pb-3">ותק (חודשים)</th>
                                                    <th className="text-center pb-3">עריכה</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.03]">
                                                {allProfiles.map(p => {
                                                    const cfg = p.house ? HOUSE_CONFIG[p.house] : null;
                                                    const computedYear = getYearFromProfile(p);
                                                    const months = p.created_at
                                                        ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
                                                        : 0;
                                                    const isEditing = editingYear?.id === p.id;
                                                    return (
                                                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                                            <td className="py-3 pr-1">
                                                                <span className="text-white/70 font-medium">{p.full_name || "—"}</span>
                                                            </td>
                                                            <td className="py-3">
                                                                <span className={`font-cinzel text-[10px] uppercase ${cfg?.color || 'text-white/20'}`}>
                                                                    {cfg?.icon} {p.house || "—"}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 text-center">
                                                                {isEditing ? (
                                                                    <select
                                                                        value={editingYear?.year}
                                                                        onChange={e => setEditingYear({ id: p.id, year: parseInt(e.target.value) })}
                                                                        className="font-cinzel text-xs outline-none rounded-lg px-2 py-1"
                                                                        style={{ backgroundColor: '#0f172a', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)', colorScheme: 'dark' }}
                                                                    >
                                                                        {[1, 2, 3, 4, 5, 6, 7].map(y => (
                                                                            <option key={y} value={y} style={{ backgroundColor: '#0f172a' }}>שנה {y}</option>
                                                                        ))}
                                                                    </select>
                                                                ) : (
                                                                    <span className="font-cinzel font-black text-xs text-purple-300">
                                                                        {p.year ?? computedYear}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-3 text-center">
                                                                <span className="text-white/30 text-xs">{months}</span>
                                                            </td>
                                                            <td className="py-3 text-center">
                                                                {isEditing ? (
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <button onClick={handleSaveYear} disabled={isSavingYear}
                                                                            className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-40">
                                                                            <Save size={12} />
                                                                        </button>
                                                                        <button onClick={() => setEditingYear(null)}
                                                                            className="p-1.5 bg-white/5 text-white/30 rounded-lg hover:bg-white/10 transition-all">
                                                                            <X size={12} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => setEditingYear({ id: p.id, year: p.year ?? computedYear })}
                                                                        className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500 hover:text-white transition-all">
                                                                        <Pencil size={12} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </>
                        )}

                        {activeTab === "users" && (
                            <AdminUsersTab
                                allProfiles={allProfiles}
                                houseConfig={HOUSE_CONFIG}
                                userSearch={userSearch}
                                userFilter={userFilter}
                                onUserSearchChange={setUserSearch}
                                onUserFilterChange={setUserFilter}
                                editingGroup={editingGroup}
                                onEditingGroupChange={setEditingGroup}
                                isSavingGroup={isSavingGroup}
                                onSaveGroup={handleSaveGroup}
                                editingRole={editingRole}
                                onEditingRoleChange={setEditingRole}
                                isSavingRole={isSavingRole}
                                onSaveRole={handleSaveRole}
                                userGroups={userGroups}
                                onToggleBan={handleToggleBan}
                                isAdmin={isAdmin}
                            />
                        )}

                        {activeTab === "forums" && (
                            <AdminForumsTab
                                forums={forums}
                                forumCategories={forumCategories}
                                selectedForum={selectedForum}
                                threads={threads}
                                threadSearch={threadSearch}
                                onThreadSearchChange={setThreadSearch}
                                onSelectForum={(forum) => {
                                    setSelectedForum(forum);
                                    fetchThreads(forum.id);
                                    setThreadSearch("");
                                }}
                                onClearSelectedForum={() => {
                                    setSelectedForum(null);
                                    setThreads([]);
                                }}
                                forumForm={forumForm}
                                onForumFormChange={(updater) => setForumForm(updater)}
                                isAddingForum={isAddingForum}
                                editingForumId={editingForumId}
                                isSavingForum={isSavingForum}
                                onForumNameChange={handleForumNameChange}
                                onCloseForumEditor={closeForumEditor}
                                onSaveForum={handleSaveForum}
                                onCreateForumDraft={handleCreateForumDraft}
                                onEditForumDraft={handleEditForumDraft}
                                onDeleteForum={handleDeleteForum}
                                forumCategoryMap={forumCategoryMap}
                                houseOptions={HOUSE_OPTIONS.filter(Boolean)}
                                onPinThread={handlePinThread}
                                onLockThread={handleLockThread}
                                onDeleteThread={handleDeleteThread}
                            />
                        )}
                        {/* ── TAB 7: חנות ── */}
                        {activeTab === "shop" && (() => {
                            const itemTypes = ["all", "wands", "potions", "companion", "cards", "travel"];
                            const typeLabels: Record<string, string> = { wands: "שרביטים", potions: "שיקויים", companion: "חיות", cards: "קלפים", travel: "נסיעה" };
                            const filtered = shopItems.filter(i => shopFilter === "all" || i.category === shopFilter);
                            const formData = isAddingItem ? newItem : editingItem;
                            const setFormData = isAddingItem
                                ? (v: any) => setNewItem(v)
                                : (v: any) => setEditingItem(v);

                            return (
                                <>
                                    {/* Stats */}
                                    <section className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: "פריטים", value: shopItems.length, color: "text-emerald-400" },
                                            { label: "זמינים", value: shopItems.filter(i => isItemAvailable(i)).length, color: "text-green-400" },
                                            { label: "לא זמינים", value: shopItems.filter(i => !isItemAvailable(i)).length, color: "text-red-400" },
                                        ].map(s => (
                                            <div key={s.label} className="admin-card rounded-2xl p-4 text-center space-y-1">
                                                <div className={`font-cinzel font-black text-xl ${s.color}`}>{s.value}</div>
                                                <div className="font-cinzel text-[9px] text-white/25 uppercase tracking-widest">{s.label}</div>
                                            </div>
                                        ))}
                                    </section>

                                    {/* Add/Edit form */}
                                    {(isAddingItem || editingItem) && formData && (
                                        <section className="admin-card rounded-2xl p-5 space-y-4 border-emerald-500/20 border">
                                            <h3 className="font-cinzel text-xs font-black text-emerald-400 flex items-center gap-2 uppercase">
                                                <Plus size={13} /> {isAddingItem ? "הוסף פריט חדש" : "עריכת פריט"}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { key: "name", label: "שם" },
                                                    { key: "image_url", label: "URL תמונה" },
                                                ].map(f => (
                                                    <div key={f.key} className="space-y-1">
                                                        <label className="text-[9px] font-cinzel text-white/30 uppercase tracking-wider">{f.label}</label>
                                                        <input value={formData[f.key] || ""} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                                            className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-emerald-500/30 rounded-xl p-2.5 text-sm outline-none" dir="rtl" />
                                                    </div>
                                                ))}
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-cinzel text-white/30 uppercase tracking-wider">מחיר (גלאונים)</label>
                                                    <input type="number" value={formData.price || 0} onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                                        className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-emerald-500/30 rounded-xl p-2.5 text-sm outline-none" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-cinzel text-white/30 uppercase tracking-wider">קטגוריה</label>
                                                    <select value={formData.category || "wands"} onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                        className="w-full rounded-xl p-2.5 text-sm outline-none"
                                                        style={{ backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}>
                                                        {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k} style={{ backgroundColor: '#0f172a' }}>{v}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-[9px] font-cinzel text-white/30 uppercase tracking-wider">תיאור</label>
                                                    <textarea value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                        className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-emerald-500/30 rounded-xl p-2.5 text-sm outline-none h-16 resize-none" dir="rtl" />
                                                </div>

                                                {false && (
                                                <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 p-4 space-y-2">
                                                    <p className="font-cinzel text-[11px] font-black text-emerald-300 uppercase tracking-[0.18em]">דוגמה לײ¾Slug בלי כאב ראש</p>
                                                    <p className="text-xs text-emerald-100/85 leading-relaxed">
                                                        אם שם האיוונט הוא <span className="font-black text-white">חג החירות 2026</span>,
                                                        אפשר לתת לו slug כמו <span dir="ltr" className="font-mono text-white">hag-ha-herut-2026</span>.
                                                        הכתובת הציבורית שלו תהיה <span dir="ltr" className="font-mono text-white">/events/hag-ha-herut-2026</span>.
                                                    </p>
                                                    <p className="text-xs text-emerald-100/85 leading-relaxed">
                                                        אין בעיה שיש כמה איוונטים במערכת. האיוונט <span className="font-black text-white">המוביל</span> הוא זה שיופיע בטיזר ובקישורים הראשיים.
                                                        איוונט עתידי עם תאריך פתיחה עתידי לא מתנגש עם איוונט שחי עכשיו.
                                                    </p>
                                                    <p className="text-xs text-emerald-100/85 leading-relaxed">
              מה שלא מומלץ זה שני איוונטים שחופפים בזמן ושניהם live. אם זה קורה, לוח הטירה יעדיף להציג את האיוונט המוביל.
                                                    </p>
                                                </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 pt-2">
                                                <label className="flex items-center gap-2 cursor-pointer text-sm text-white/50 font-cinzel text-[10px]">
                                                    <input type="checkbox" checked={formData.is_available ?? true} onChange={e => setFormData({ ...formData, is_available: e.target.checked })}
                                                        className="rounded" />
                                                    זמין לרכישה
                                                </label>
                                                <div className="flex gap-2 mr-auto">
                                                    <button onClick={() => { setEditingItem(null); setIsAddingItem(false); }}
                                                        className="px-4 py-2 bg-white/5 text-white/40 rounded-xl text-xs font-cinzel hover:bg-white/10 transition-all">ביטול</button>
                                                    <button onClick={handleSaveItem} disabled={isSavingItem}
                                                        className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-cinzel hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-40 flex items-center gap-2">
                                                        <Save size={11} /> שמור
                                                    </button>
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {/* Items list */}
                                    <section className="admin-card rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <h3 className="font-cinzel text-xs font-black text-emerald-400 flex items-center gap-2 uppercase tracking-widest">
                                                <Store size={13} /> פריטי החנות
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <button onClick={async () => {
                                                    if (!confirm("להפוך את כל הפריטים לזמינים?")) return;
                                                    await supabase.from('shop_items').update({ is_available: true }).neq('id', '0');
                                                    fetchData();
                                                    sendOwl("עודכן", "כל הפריטים זמינים כעת.", "success");
                                                }} className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl font-cinzel text-[9px] hover:bg-green-500 hover:text-white transition-all">
                                                    הפעל הכל
                                                </button>
                                                <button onClick={() => { setIsAddingItem(true); setEditingItem(null); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-xl font-cinzel text-[10px] hover:bg-emerald-600 hover:text-white transition-all">
                                                    <Plus size={11} /> הוסף פריט
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 flex-wrap">
                                            {itemTypes.map(t => (
                                                <button key={t} onClick={() => setShopFilter(t)}
                                                    className={`px-3 py-1 rounded-xl font-cinzel text-[9px] uppercase tracking-wide transition-all border
                                                        ${shopFilter === t ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-white/[0.02] border-white/[0.05] text-white/30 hover:text-white/60'}`}>
                                                    {t === "all" ? "הכל" : typeLabels[t]}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="space-y-2 max-h-[420px] overflow-y-auto">
                                            {filtered.map(item => (
                                                <div key={item.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all">
                                                    {item.image_url && <img src={item.image_url} alt={item.name || "פריט"} className="w-10 h-10 rounded-lg object-cover shrink-0 bg-white/5" />}
                                                    {!item.image_url && <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg shrink-0">🛒</div>}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm text-white/80 truncate">{item.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-amber-400 font-cinzel">{item.price} גליאונים</span>
                                                            <span className="text-[9px] text-white/25 font-cinzel uppercase">{typeLabels[item.category] || item.category}</span>
                                                            {item.is_available !== true && <span className="text-[8px] text-red-400 font-cinzel">לא זמין</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button onClick={() => handleToggleAvailable(item)} title={item.is_available ? "הסתר" : "הצג"}
                                                            className={`p-1.5 rounded-lg transition-all ${item.is_available ? 'bg-green-500/15 text-green-400 hover:bg-green-600 hover:text-white' : 'bg-white/5 text-white/30 hover:text-green-400'}`}>
                                                            <Eye size={11} />
                                                        </button>
                                                        <button onClick={() => { setEditingItem({ ...item }); setIsAddingItem(false); }}
                                                            className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                                                            <Pencil size={11} />
                                                        </button>
                                                        <button onClick={() => handleDeleteItem(item.id)}
                                                            className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {filtered.length === 0 && <p className="text-center text-white/20 font-cinzel text-xs py-6">אין פריטים</p>}
                                        </div>
                                    </section>
                                </>
                            );
                        })()}

                        {/* ── TAB 8: בחינות ── */}
                        {activeTab === "exams" && (() => {
                            const filtered = examQuestions.filter(q => q.exam_type === examFilter);
                            const editQ = editingQuestion;
                            const newQ = newQuestion;

                            return (
                                <>
                                    {/* Stats */}
                                    <section className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: "שאלות O.W.L", value: examQuestions.filter(q => q.exam_type === 'owl').length, color: "text-blue-400", type: "owl" as const },
                                            { label: "שאלות N.E.W.T", value: examQuestions.filter(q => q.exam_type === 'newt').length, color: "text-red-400", type: "newt" as const },
                                        ].map(s => (
                                            <button key={s.label} onClick={() => setExamFilter(s.type)}
                                                className={`admin-card rounded-2xl p-4 text-center space-y-1 transition-all border ${examFilter === s.type ? 'border-violet-500/30' : 'border-transparent'}`}>
                                                <div className={`font-cinzel font-black text-2xl ${s.color}`}>{s.value}</div>
                                                <div className="font-cinzel text-[9px] text-white/25 uppercase tracking-widest">{s.label}</div>
                                            </button>
                                        ))}
                                    </section>

                                    {/* Add/Edit form */}
                                    {(isAddingQuestion || editQ) && (
                                        <section className="admin-card rounded-2xl p-5 space-y-3 border-violet-500/20 border">
                                            <h3 className="font-cinzel text-xs font-black text-violet-400 flex items-center gap-2 uppercase">
                                                <Plus size={13} /> {isAddingQuestion ? `שאלה חדשה — ${examFilter.toUpperCase()}` : "עריכת שאלה"}
                                            </h3>
                                            <div className="space-y-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-cinzel text-white/30 uppercase">שאלה</label>
                                                    <textarea
                                                        value={editQ ? editQ.question : newQ.question}
                                                        onChange={e => editQ ? setEditingQuestion({ ...editQ, question: e.target.value }) : setNewQuestion({ ...newQ, question: e.target.value })}
                                                        className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-violet-500/30 rounded-xl p-2.5 text-sm outline-none h-16 resize-none" dir="rtl" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(["a", "b", "c", "d"] as const).map(opt => (
                                                        <div key={opt} className="space-y-1">
                                                            <label className="text-[9px] font-cinzel text-white/30 uppercase">אפשרות {opt.toUpperCase()}</label>
                                                            <input
                                                                value={editQ ? editQ[`option_${opt}`] : newQ[`option_${opt}`]}
                                                                onChange={e => {
                                                                    const key = `option_${opt}`;
                                                                    editQ ? setEditingQuestion({ ...editQ, [key]: e.target.value }) : setNewQuestion({ ...newQ, [key]: e.target.value });
                                                                }}
                                                                className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-violet-500/30 rounded-xl p-2.5 text-sm outline-none" dir="rtl" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-cinzel text-white/30 uppercase">תשובה נכונה</label>
                                                    <select
                                                        value={editQ ? editQ.correct_answer : newQ.correct_answer}
                                                        onChange={e => editQ ? setEditingQuestion({ ...editQ, correct_answer: e.target.value }) : setNewQuestion({ ...newQ, correct_answer: e.target.value })}
                                                        className="w-full rounded-xl p-2.5 text-sm outline-none"
                                                        style={{ backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(139,92,246,0.2)', colorScheme: 'dark' }}>
                                                        {["a", "b", "c", "d"].map(o => <option key={o} value={o} style={{ backgroundColor: '#0f172a' }}>אפשרות {o.toUpperCase()}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-2 justify-end">
                                                <button onClick={() => { setEditingQuestion(null); setIsAddingQuestion(false); }}
                                                    className="px-4 py-2 bg-white/5 text-white/40 rounded-xl text-xs font-cinzel hover:bg-white/10 transition-all">ביטול</button>
                                                <button onClick={handleSaveQuestion} disabled={isSavingQuestion}
                                                    className="px-4 py-2 bg-violet-600/20 text-violet-400 border border-violet-500/30 rounded-xl text-xs font-cinzel hover:bg-violet-600 hover:text-white transition-all disabled:opacity-40 flex items-center gap-2">
                                                    <Save size={11} /> שמור שאלה
                                                </button>
                                            </div>
                                        </section>
                                    )}

                                    {/* Questions list */}
                                    <section className="admin-card rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex gap-2">
                                                {(["owl", "newt"] as const).map(t => (
                                                    <button key={t} onClick={() => setExamFilter(t)}
                                                        className={`px-4 py-1.5 rounded-xl font-cinzel text-[10px] uppercase tracking-wide transition-all border
                                                            ${examFilter === t ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/[0.02] border-white/[0.05] text-white/30 hover:text-white/60'}`}>
                                                        {t.toUpperCase()} {examFilter === t && `(${filtered.length})`}
                                                    </button>
                                                ))}
                                            </div>
                                            <button onClick={() => { setIsAddingQuestion(true); setEditingQuestion(null); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/15 border border-violet-500/25 text-violet-400 rounded-xl font-cinzel text-[10px] hover:bg-violet-600 hover:text-white transition-all">
                                                <Plus size={11} /> שאלה חדשה
                                            </button>
                                        </div>
                                        <div className="space-y-2 max-h-[480px] overflow-y-auto">
                                            {filtered.map((q, idx) => (
                                                <div key={q.id} className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all">
                                                    <div className="flex items-start gap-3">
                                                        <span className="shrink-0 w-6 h-6 rounded-full bg-violet-500/15 text-violet-400 flex items-center justify-center font-cinzel text-[10px]">{idx + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-white/75 leading-snug">{q.question}</p>
                                                            <div className="grid grid-cols-2 gap-1 mt-2">
                                                                {(["a", "b", "c", "d"] as const).map(opt => (
                                                                    <span key={opt} className={`text-[10px] px-2 py-0.5 rounded ${q.correct_answer === opt ? 'bg-green-500/15 text-green-400 font-bold' : 'text-white/30'}`}>
                                                                        {opt.toUpperCase()}. {q[`option_${opt}`]}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button onClick={() => { setEditingQuestion({ ...q }); setIsAddingQuestion(false); }}
                                                                className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg hover:bg-violet-500 hover:text-white transition-all">
                                                                <Pencil size={11} />
                                                            </button>
                                                            <button onClick={() => handleDeleteQuestion(q.id)}
                                                                className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                                                <Trash2 size={11} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {filtered.length === 0 && <p className="text-center text-white/20 font-cinzel text-xs py-6">אין שאלות ל-{examFilter.toUpperCase()} עדיין</p>}
                                        </div>
                                    </section>
                                </>
                            );
                        })()}

                        {/* ── TAB 9: זירת קרבות ── */}
                        {activeTab === "arena" && (
                            <div className="space-y-6">
                                {/* Stats */}
                                <section className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                                    {[
                                        { label: "סה\"כ קרבות", value: arenaStats?.total ?? "—", color: "text-white/60" },
                                        { label: "הסתיימו", value: arenaStats?.finished ?? "—", color: "text-green-400" },
                                        { label: "פעילים", value: arenaStats?.active ?? "—", color: "text-orange-400" },
                                        { label: "ממתינים", value: arenaStats?.pending ?? "—", color: "text-yellow-400" },
                                        { label: "פגי תוקף", value: arenaStats?.stalePending ?? "—", color: "text-rose-400" },
                                        { label: "תיקו", value: arenaStats?.ties ?? "—", color: "text-blue-400" },
                                    ].map(s => (
                                        <div key={s.label} className="admin-card rounded-2xl p-4 text-center space-y-1">
                                            <div className={`font-cinzel font-black text-2xl ${s.color}`}>{s.value}</div>
                                            <div className="font-cinzel text-[9px] text-white/25 uppercase tracking-widest">{s.label}</div>
                                        </div>
                                    ))}
                                </section>

                                <section className="admin-card rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <h3 className="font-cinzel text-xs font-black text-yellow-400 flex items-center gap-2 uppercase tracking-widest">
                                                <Clock size={13} /> אתגרים בהמתנה
                                            </h3>
                                            <p className="text-white/35 text-xs mt-1">
                                                pending = אתגר שנשלח אבל עוד לא אושר. פגי תוקף מתנקים אוטומטית כשנכנסים למסך, ואם נשארו שאריות אפשר לנקות אותן ידנית.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleExpirePendingDuels}
                                            disabled={isCleaningPending || !arenaStats?.stalePending}
                                            className="px-3 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-[10px] font-cinzel font-black disabled:opacity-40"
                                        >
                                            {isCleaningPending ? "מנקה..." : `נקה פגי תוקף (${arenaStats?.stalePending || 0})`}
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-[320px] overflow-y-auto">
                                        {arenaPendingDuels.map((d: any) => {
                                            const ch = d.challenger;
                                            const op = d.opponent;
                                            const expiresAt = d.expires_at ? new Date(d.expires_at).getTime() : null;
                                            const isExpired = Boolean(expiresAt && expiresAt <= Date.now());
                                            const HOUSE_COLORS: Record<string, string> = { Gryffindor: "#dc2626", Slytherin: "#16a34a", Ravenclaw: "#2563eb", Hufflepuff: "#d97706" };

                                            return (
                                                <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isExpired ? "bg-rose-500/5 border-rose-500/15" : "bg-white/[0.02] border-white/[0.04]"}`}>
                                                    <div className="flex-1 min-w-0 flex items-center gap-2 text-xs">
                                                        <span className="font-cinzel truncate max-w-[90px]" style={{ color: HOUSE_COLORS[ch?.house] || "white" }}>
                                                            {ch?.full_name || "—"}
                                                        </span>
                                                        <span className="text-white/20 shrink-0">VS</span>
                                                        <span className="font-cinzel truncate max-w-[90px]" style={{ color: HOUSE_COLORS[op?.house] || "white" }}>
                                                            {op?.full_name || "—"}
                                                        </span>
                                                    </div>
                                                    <div className={`shrink-0 text-[10px] font-cinzel ${isExpired ? "text-rose-400" : "text-yellow-300"}`}>
                                                        {isExpired ? "פג תוקף" : "ממתין לאישור"}
                                                    </div>
                                                    <div className="shrink-0 text-[10px] text-white/25 font-cinzel">
                                                        {d.expires_at ? new Date(d.expires_at).toLocaleString("he-IL") : "—"}
                                                    </div>
                                                    <button
                                                        onClick={() => handleCancelDuel(d.id)}
                                                        className="shrink-0 flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px] font-cinzel"
                                                    >
                                                        <Ban size={10} /> בטל
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {arenaPendingDuels.length === 0 && (
                                            <p className="text-center text-white/20 font-cinzel text-xs py-6">אין אתגרי דו-קרב שממתינים כרגע</p>
                                        )}
                                    </div>
                                </section>

                                {/* Recent duels */}
                                <section className="admin-card rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-cinzel text-xs font-black text-orange-400 flex items-center gap-2 uppercase tracking-widest">
                                            <Swords size={13} /> קרבות אחרונים
                                        </h3>
                                        <button onClick={fetchArenaData}
                                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all">
                                            <RotateCcw size={12} className="text-white/30" />
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                        {arenaRecentDuels.map((d: any) => {
                                            const ch = d.challenger;
                                            const op = d.opponent;
                                            const win = d.winner;
                                            const tie = !d.winner_id;
                                            const HOUSE_COLORS: Record<string, string> = { Gryffindor: "#dc2626", Slytherin: "#16a34a", Ravenclaw: "#2563eb", Hufflepuff: "#d97706" };
                                            return (
                                                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                                    <div className="flex-1 min-w-0 flex items-center gap-2 text-xs">
                                                        <span className="font-cinzel text-white/70 truncate max-w-[80px]"
                                                            style={{ color: HOUSE_COLORS[ch?.house] || "white" }}>
                                                            {ch?.full_name || "—"}
                                                        </span>
                                                        <span className="text-white/20 shrink-0">VS</span>
                                                        <span className="font-cinzel text-white/70 truncate max-w-[80px]"
                                                            style={{ color: HOUSE_COLORS[op?.house] || "white" }}>
                                                            {op?.full_name || "—"}
                                                        </span>
                                                    </div>
                                                    <div className="shrink-0 text-xs">
                                                        {tie
                                                            ? <span className="text-blue-400 font-cinzel">🤝 תיקו</span>
                                                            : <span className="text-green-400 font-cinzel">🏆 {win?.full_name}</span>
                                                        }
                                                    </div>
                                                    <div className="shrink-0 text-[10px] text-white/20 font-cinzel">
                                                        {d.finished_at ? new Date(d.finished_at).toLocaleDateString("he-IL") : "—"}
                                                    </div>
                                                    <button onClick={() => handleCancelDuel(d.id)}
                                                        className="shrink-0 flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px] font-cinzel">
                                                        <Ban size={10} /> בטל
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {arenaRecentDuels.length === 0 && (
                                            <p className="text-center text-white/20 font-cinzel text-xs py-6">אין קרבות עדיין</p>
                                        )}
                                    </div>
                                </section>

                                {/* Suspicious players */}
                                <section className="admin-card rounded-2xl p-5 space-y-3">
                                    <h3 className="font-cinzel text-xs font-black text-red-400 flex items-center gap-2 uppercase tracking-widest">
                                        <AlertCircle size={13} /> שחקנים חשודים ({">"} 5 ניצחונות ביום אחד)
                                    </h3>
                                    {arenaSuspects.length === 0 ? (
                                        <p className="text-center text-white/20 font-cinzel text-xs py-4">אין חשודים ב-7 ימים האחרונים</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {arenaSuspects.map((s: any, i: number) => (
                                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-cinzel text-xs font-black text-white/80">{s.full_name}</p>
                                                        <p className="text-[9px] text-white/30 mt-0.5">{s.house} · {s.day}</p>
                                                    </div>
                                                    <span className="font-cinzel text-sm font-black text-red-400">{s.daily_wins} ניצחונות</span>
                                                    <button onClick={() => handleResetDuelBadge(s.id, s.full_name)}
                                                        className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px] font-cinzel">
                                                        איפוס תואר
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                {/* Grant / reset badge */}
                                <section className="admin-card rounded-2xl p-5 space-y-4">
                                    <h3 className="font-cinzel text-xs font-black text-amber-400 flex items-center gap-2 uppercase tracking-widest">
                                        <Crown size={13} /> הענקת / איפוס תואר ידנית
                                    </h3>
                                    <input
                                        value={badgeGrantSearch}
                                        onChange={e => searchBadgeGrantUsers(e.target.value)}
                                placeholder="חיפוש דמות לפי שם..."
                                        className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-amber-500/30 rounded-xl p-3 text-sm outline-none transition-all"
                                        dir="rtl"
                                    />
                                    {badgeGrantSearch.trim().length > 0 && badgeGrantResults.length === 0 && (
                                        <p className="text-center text-white/20 font-cinzel text-xs py-3">לא נמצאו קוסמים</p>
                                    )}
                                    {badgeGrantResults.length > 0 && (
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                            {badgeGrantResults.map((u: any) => {
                                                const isLoading = badgeGrantLoading === u.id;
                                                const HCFG: Record<string, string> = { Gryffindor: "#dc2626", Slytherin: "#16a34a", Ravenclaw: "#2563eb", Hufflepuff: "#d97706" };
                                                const HEMOJI: Record<string, string> = { Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡" };
                                                return (
                                                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                                        <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center text-lg shrink-0"
                                                            style={{ background: `${HCFG[u.house] || "#f59e0b"}15` }}>
                                                            {u.avatar_url
                                                                ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                                                                : HEMOJI[u.house] || "🧙"}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-cinzel text-xs font-black text-white/80 truncate">{u.full_name}</p>
                                                            {u.duel_badge
                                                                ? <span style={{ fontSize: "9px", fontWeight: 900, fontFamily: "'Cinzel', serif", padding: "1px 6px", borderRadius: "999px", color: "#f97316", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.35)" }}>{u.duel_badge}</span>
                                                                : <span className="text-[9px] text-white/20 font-cinzel">אין תואר</span>
                                                            }
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button onClick={() => handleGrantDuelBadge(u.id, u.full_name)} disabled={isLoading}
                                                                className="px-3 py-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-xl hover:bg-amber-500 hover:text-black transition-all text-[10px] font-cinzel font-black disabled:opacity-40 flex items-center gap-1">
                                                                {isLoading ? <RotateCcw size={10} className="animate-spin" /> : "⚔️"} הענק
                                                            </button>
                                                            {u.duel_badge && (
                                                                <button onClick={() => handleResetDuelBadge(u.id, u.full_name)} disabled={isLoading}
                                                                    className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[10px] font-cinzel disabled:opacity-40">
                                                                    איפוס
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}

                        {activeTab === "settings" && (
                            <AdminSiteSettingsTab />
                        )}

                        {activeTab === "health" && (
                            <AdminSystemHealthPanel
                                reportsCount={reports.length}
                                adminLogsCount={adminLogs.length}
                                activityEvents={activityEvents}
                                unsortedUsersCount={unsortedUsersCount}
                                totalProfiles={allProfiles.length}
                                profilesWithEmailCount={profilesWithEmailCount}
                                siteSettings={siteSettings}
                                newsItems={news}
                                forumItems={forums}
                                onOpenTab={setActiveTab}
                            />
                        )}

                        {activeTab === "presence" && (
                            <AdminPresencePanel />
                        )}

                        {/* ── TAB 10: פעילות ── */}
                        {activeTab === "activity" && (
                            <AdminActivityTab
                                events={activityEvents}
                                isTestingActivity={isTestingActivity}
                                onTestActivity={handleTestActivity}
                                onRefresh={fetchData}
                            />
                        )}

                        {/* ── TAB 8: לוגים (Admin Audit) ── */}
                        {activeTab === "logs" && (
                            <AdminLogsTab logs={adminLogs} onRefresh={fetchData} />
                        )}

                        {/* ── TAB 11: משימות ── */}
                        {activeTab === "quests" && (
                            <AdminQuestCatalogTab sendOwl={sendOwl} onSaved={fetchData} />
                        )}

                        {/* ── TAB 13: טורנירים ── */}
                        {activeTab === "tournaments" && (
                            <div className="space-y-6">
                                <section className="admin-card rounded-2xl p-8 border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent text-center">
                                    <div className="w-20 h-20 rounded-[2.5rem] bg-orange-500/20 flex items-center justify-center mx-auto mb-6 text-orange-400">
                                        <Trophy size={40} />
                                    </div>
                                    <h3 className="font-cinzel text-2xl font-black text-white">מערכת טורנירים</h3>
                                    <p className="hidden text-white/40 mt-2 max-w-md mx-auto font-crimson text-lg">
                                        ניהול טבלאות דירוג (Ladder) ותחרויות שבועיות.
                                    </p>
                                    <div className="mt-6 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5 max-w-3xl mx-auto text-right">
                                        <p className="font-cinzel text-[10px] font-black uppercase tracking-widest text-amber-300">סטטוס אמיתי</p>
                                        <p className="mt-3 text-sm text-white/75 leading-relaxed">
                                            כרגע הלשונית הזו עדיין לא מחוברת לטבלאות טורנירים אמיתיות. מה שהיה כאן קודם התבסס על
                                            <span className="mx-1 font-cinzel text-orange-300">profiles.points_contributed</span>
                                            ולא על מערכת tournaments/ladder אמיתית.
                                        </p>
                                        <p className="mt-3 text-sm text-white/60 leading-relaxed">
                                            נצטרך מודל נתונים ייעודי לטורנירים, משתתפים, סבבים, תוצאות ודירוגים כדי להפוך את זה למערכת עובדת.
                                        </p>
                                    </div>
                                    <div className="hidden mt-8 overflow-x-auto max-w-lg mx-auto bg-white/5 rounded-2xl border border-white/10 p-4">
                                        <h4 className="font-cinzel text-[10px] font-black text-orange-400 uppercase tracking-widest mb-4">מובילי ה-LADDER השבועי</h4>
                                        <div className="space-y-2">
                                            {allProfiles.slice(0, 5).sort((a, b) => (b.points_contributed || 0) - (a.points_contributed || 0)).map((p, i) => (
                                                <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                                                    <span className="text-white/30 font-cinzel w-4">{i + 1}.</span>
                                                    <span className="flex-1 text-right px-3 text-white/70">{p.full_name}</span>
                                                    <span className="font-cinzel text-orange-500 font-bold">{p.points_contributed || 0} ✨</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* ── TAB 14: הספרייה ── */}
                        {activeTab === "library" && (
                            <div className="space-y-6">
                                <section className="admin-card rounded-2xl p-8 border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent text-center">
                                    <div className="w-20 h-20 rounded-[2.5rem] bg-blue-500/20 flex items-center justify-center mx-auto mb-6 text-blue-400">
                                        <BookOpenCheck size={40} />
                                    </div>
                                    <h3 className="font-cinzel text-2xl font-black text-white">ניהול הספרייה וההגיגית</h3>
                                    <p className="text-white/40 mt-2 max-w-md mx-auto font-crimson text-lg">
                                        ניהול פרקי סיפורים וזכרונות משתמשים.
                                    </p>
                                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-right">
                                            <h4 className="font-cinzel text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">סיפורים אחרונים</h4>
                                            <div className="space-y-2">
                                                {stories.slice(0, 3).map(s => (
                                                    <div key={s.id} className="text-[10px] text-white/50 border-r-2 border-blue-500/30 pr-3 py-1">
                                                        <span className="block text-white/80 font-bold truncate">{s.title}</span>
                                                        <span className="italic">{new Date(s.created_at).toLocaleDateString("he-IL")}</span>
                                                    </div>
                                                ))}
                                                {stories.length === 0 && <p className="text-[10px] text-white/20 italic">אין סיפורים עדיין</p>}
                                            </div>
                                        </div>
                                        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-right flex flex-col justify-center items-center gap-3">
                                            <p className="text-[10px] text-white/20 font-cinzel uppercase tracking-widest">Memory Bank</p>
                                            <button className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-black font-cinzel hover:bg-blue-500 hover:text-white transition-all">
                                                פתח את ההגיגית
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}
                        {/* ── TAB 12: איוונטים ── */}
                        {activeTab === "events" && (
                            <div className="space-y-6">
                                {(() => {
                                    const eventCatalog = getEventCatalogFromState(siteSettings);
                                    const selectedEvent = resolveSelectedEvent(siteSettings) || createEventDraft();
                                    const ev = normalizeLiveEventSettings(selectedEvent);
                                    const eventLabel = getLiveEventLabel(ev);
                                    const eventCatalogStatus = getLiveEventCatalogStatus(selectedEvent);
                                    const eventStatusText = eventCatalogStatus === "live"
                                        ? "חי"
                                        : eventCatalogStatus === "upcoming"
                                            ? "מתוזמן"
                                            : eventCatalogStatus === "ended"
                                                ? "הסתיים"
                                                : eventCatalogStatus === "archived"
                                                    ? "בארכיון"
                                                    : "טיוטה";
                                    const eventStatusColor = eventCatalogStatus === "live"
                                        ? "text-emerald-400"
                                        : eventCatalogStatus === "upcoming"
                                            ? "text-sky-300"
                                            : eventCatalogStatus === "ended"
                                                ? "text-amber-300"
                                                : eventCatalogStatus === "archived"
                                                    ? "text-white/40"
                                                    : "text-rose-300";
                                    const groupedEvents = [
                                        { key: "live", label: "איוונטים פעילים" },
                                        { key: "upcoming", label: "איוונטים עתידיים" },
                                        { key: "draft", label: "טיוטות" },
                                        { key: "ended", label: "איוונטים שנגמרו" },
                                        { key: "archived", label: "ארכיון" },
                                    ].map((group) => ({
                                        ...group,
                                        events: eventCatalog.filter((event) => getLiveEventCatalogStatus(event) === group.key),
                                    }));
                                    const rankedParticipants = [...allProfiles]
                                        .filter((profile) => getProfileLiveEventPoints(profile) > 0)
                                        .sort(compareLiveEventParticipants);
                                    const eventLeaderboard = rankedParticipants.slice(0, 10);
                                    const liveLeader = eventLeaderboard[0] || null;
                                    return (
                                        <section className={`admin-card rounded-[2.5rem] p-8 border transition-all duration-700
                                            ${ev.active ? 'border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-transparent' : 'border-white/5 opacity-80'}`}>
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-colors
                                                    ${ev.active ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-white/20'}`}>
                                                    <Sparkles size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="font-cinzel text-2xl font-black text-white">ניהול איוונטים</h3>
                                                    <p className="text-white/40 font-crimson text-lg italic">{eventLabel} ({ev.year})</p>
                                                    <p className={`mt-1 text-[11px] font-black uppercase tracking-[0.24em] ${eventStatusColor}`}>{eventStatusText}</p>
                                                </div>
                                            </div>

                                            <div className="mb-6 rounded-[2rem] border border-sky-400/20 bg-gradient-to-l from-sky-500/10 via-sky-500/5 to-transparent p-6 space-y-5">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-sky-400/15 text-sky-300 flex items-center justify-center shrink-0">
                                                        <Sparkles size={22} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h4 className="font-cinzel text-sm font-black text-sky-200">איך עובדים עם המסך הזה בלי להסתבך</h4>
                                                        <p className="text-sm text-white/65 leading-relaxed">
                                                            הכל פה מסונכרן לאיוונט החי באתר. מה שמגדירים כאן קובע מה המשתמשים רואים,
                                                            מתי האיוונט נפתח ונסגר, אילו משימות באמת נותנות נקודות, ואיך הפרסים יחולקו בסוף.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                                    {[
                                                        {
                                                            title: "1. צור איוונט חדש",
                                                            text: "לוחצים על צור איוונט חדש, נותנים שם, תיאור ותאריכים.",
                                                        },
                                                        {
                                                            title: "2. בוחרים איוונט מוביל",
                                                            text: "האיוונט המוביל הוא זה שמופיע באתר, בדף הבית ובדף האיוונט.",
                                                        },
                                                        {
                                                            title: "3. מחברים משימות לנקודות",
                                                            text: "כדי שמשימה באמת תחלק נקודות, חייבים לבחור לה סוג פעילות מסונכרן.",
                                                        },
                                                        {
                                                            title: "4. מסיימים בלחיצה אחת",
                      text: "בסוף האיוונט לוחצים חלוקת פרסים, ולוח הטירה מדרג את המקומות ומסיים אותו.",
                                                        },
                                                    ].map((tip) => (
                                                        <div key={tip.title} className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-2">
                                                            <p className="font-cinzel text-[11px] font-black text-white/80 uppercase tracking-[0.18em]">{tip.title}</p>
                                                            <p className="text-xs text-white/45 leading-relaxed">{tip.text}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-4 space-y-2">
                                                    <p className="font-cinzel text-[11px] font-black text-amber-300 uppercase tracking-[0.18em]">חשוב לזכור</p>
                                                    <p className="text-xs text-amber-100/80 leading-relaxed">
                                                        משימה בלי סוג פעילות מסונכרן תופיע בדף האיוונט, אבל לא תחלק נקודות בפועל.
                                                        אם הגדרת פרסים רק למקומות מסוימים, רק המקומות האלה יקבלו פרס בסוף.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 p-4 space-y-2 mb-6">
                                                <p className="font-cinzel text-[11px] font-black text-emerald-300 uppercase tracking-[0.18em]">דוגמה לײ¾Slug בלי כאב ראש</p>
                                                <p className="text-xs text-emerald-100/85 leading-relaxed">
                                                    אם שם האיוונט הוא <span className="font-black text-white">חג החירות 2026</span>,
                                                    אפשר לתת לו slug כמו <span dir="ltr" className="font-mono text-white">hag-ha-herut-2026</span>.
                                                    הכתובת הציבורית שלו תהיה <span dir="ltr" className="font-mono text-white">/events/hag-ha-herut-2026</span>.
                                                </p>
                                                <p className="text-xs text-emerald-100/85 leading-relaxed">
                                                    אין בעיה שיש כמה איוונטים במערכת. האיוונט <span className="font-black text-white">המוביל</span> הוא זה שיופיע בטיזר ובקישורים הראשיים.
                                                    איוונט עתידי עם תאריך פתיחה עתידי לא מתנגש עם איוונט שחי עכשיו.
                                                </p>
                                                <p className="text-xs text-emerald-100/85 leading-relaxed">
                מה שלא מומלץ זה שני איוונטים שחופפים בזמן ושניהם live. אם זה קורה, לוח הטירה יעדיף להציג את האיוונט המוביל.
                                                </p>
                                            </div>

                                            <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
                                                <aside className="space-y-4">
                                                    <div className="rounded-[2rem] border border-white/8 bg-black/20 p-5 space-y-4">
                                                        <button
                                                            onClick={handleCreateEventDraft}
                                                            className="w-full px-4 py-3 bg-pink-500/15 text-pink-300 border border-pink-500/25 rounded-xl text-sm font-cinzel font-black hover:bg-pink-500 hover:text-white transition-all"
                                                        >
                                                            <Plus size={14} className="inline ml-2" />
                                                            צור איוונט חדש
                                                        </button>
                                                        <p className="text-xs text-white/35 leading-relaxed">
                                                            המסך הזה שולט עכשיו בקטלוג האיוונטים: טיוטות, עתידיים, פעילים ואירועים שהסתיימו.
                                                        </p>
                                                    </div>

                                                    {groupedEvents.map((group) => (
                                                        <div key={group.key} className="rounded-[2rem] border border-white/8 bg-black/20 p-5 space-y-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <h4 className="font-cinzel text-[11px] font-black text-white/55 uppercase tracking-[0.2em]">
                                                                    {group.label}
                                                                </h4>
                                                                <span className="text-[10px] text-white/30 font-black">{group.events.length}</span>
                                                            </div>

                                                            {group.events.length === 0 ? (
                                                                <p className="text-xs text-white/20">אין איוונטים בקטגוריה הזו כרגע.</p>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {group.events.map((eventItem) => (
                                                                        <div key={eventItem.id} className={`rounded-xl border p-3 transition-all ${selectedEvent.id === eventItem.id ? 'border-pink-500/30 bg-pink-500/10' : 'border-white/8 bg-white/[0.02]'}`}>
                                                                            <button
                                                                                onClick={() => handleSelectEventDraft(eventItem.id)}
                                                                                className="w-full text-right"
                                                                            >
                                                                                <p className="font-cinzel text-sm font-black text-white/80 truncate">
                                                                                    {getLiveEventLabel(eventItem)}
                                                                                </p>
                                                                                <p className="text-[11px] text-white/30 mt-1">
                                                                                    {formatEventDateLabel(eventItem.start_date || eventItem.created_at)}
                                                                                </p>
                                                                            </button>
                                                                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                                                                                <button
                                                                                    onClick={() => handleMarkEventFeatured(eventItem.id)}
                                                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${eventItem.featured ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/40 hover:text-amber-300'}`}
                                                                                >
                                                                                    {eventItem.featured ? "מוביל" : "הפוך למוביל"}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleArchiveEventDraft(eventItem.id)}
                                                                                    className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-white/5 text-white/40 hover:text-white transition-all"
                                                                                >
                                                                                    {eventItem.archived ? "החזר מארכיון" : "העבר לארכיון"}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => { void handleDeleteEventDraft(eventItem.id); }}
                                                                                    className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white transition-all"
                                                                                >
                                                                                    מחק
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </aside>

                                                <div className="space-y-5">
                                                <div className="flex items-center justify-between p-6 bg-white/[0.03] border border-white/[0.06] rounded-[2rem] hover:border-white/10 transition-colors">
                                                    <div>
                                                        <h4 className="font-cinzel text-sm font-black text-white">מצב איוונט</h4>
                                                        <p className="text-xs text-white/25 mt-1">מאפשר הצגת הבאנר והדף הייעודי באתר</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className={`text-[10px] font-black font-cinzel uppercase tracking-widest transition-colors ${eventStatusColor}`}>
                                                            {eventStatusText}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                updateEventSettingsDraft({ active: !ev.active });
                                                                void persistEventCatalog(
                                                                    replaceEventInCatalog(getEventCatalogFromState(siteSettings), buildEventSettings({ active: !ev.active, updated_at: new Date().toISOString() })),
                                                                    buildEventSettings({ active: !ev.active }),
                                                                );
                                                            }}
                                                            className={`w-14 h-8 rounded-full relative border transition-all duration-500 p-1 ${ev.active ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-rose-500/5 border-rose-500/20'}`}>
                                                            <div className={`w-6 h-6 rounded-full shadow-lg transition-all duration-500 flex items-center justify-center ${ev.active ? 'translate-x-6 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]' : 'translate-x-0 bg-white/20'}`}>
                                                                {ev.active ? <ShieldCheck size={12} className="text-emerald-950" /> : <Clock size={12} className="text-white/40" />}
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-white/[0.01] border border-white/[0.03] rounded-[2rem] space-y-5">
                                                    <h4 className="font-cinzel text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <Clock size={12} /> הגדרות זמן (ISO)
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">תאריך פתיחה</label>
                                                            <input
                                                                type="datetime-local"
                                                                value={toDateTimeLocalValue(ev.start_date || "")}
                                                                onChange={(e) => updateEventSettingsDraft({ start_date: fromDateTimeLocalValue(e.target.value) })}
                                                                onBlur={() => { void persistEventCatalog(); }}
                                                                step={60}
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm text-white/70 font-mono outline-none focus:border-pink-500/30 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">תאריך סיום</label>
                                                            <input
                                                                type="datetime-local"
                                                                value={toDateTimeLocalValue(ev.endDate || ev.end_date || "")}
                                                                onChange={(e) => updateEventSettingsDraft({ endDate: fromDateTimeLocalValue(e.target.value), end_date: fromDateTimeLocalValue(e.target.value) })}
                                                                onBlur={() => { void persistEventCatalog(); }}
                                                                step={60}
                                                                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm text-white/70 font-mono outline-none focus:border-pink-500/30 transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-white/40">
                                                        <p>פתיחה: {formatEventDateLabel(ev.start_date)}</p>
                                                        <p>סיום: {formatEventDateLabel(ev.endDate || ev.end_date)}</p>
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-white/[0.01] border border-white/[0.03] rounded-[2rem] space-y-5">
                                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                                        <div>
                                                            <h4 className="font-cinzel text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                                                <Sparkles size={12} /> תוכן איוונט חי
                                                            </h4>
                                                            <p className="text-xs text-white/30 mt-2">
                                                                האיוונט הבא ימשיך להיפתח על אותו דף ייעודי, אבל עם השם, הטקסט, המשימות והפרסים שתגדירי כאן.
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={handleSaveEventContent}
                                                            className="px-4 py-2 bg-pink-500/15 text-pink-300 border border-pink-500/25 rounded-xl text-xs font-cinzel font-black hover:bg-pink-500 hover:text-white transition-all"
                                                        >
                                                            שמור את כל האיוונט
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">כותרת האיוונט</label>
                                                            <input
                                                                type="text"
                                                                value={ev.eventName || ev.title || ""}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    const currentAutoSlug = normalizeForumSlug(ev.eventName || ev.title || "");
                                                                    const shouldSyncSlug = !ev.slug || ev.slug === currentAutoSlug;
                                                                    const nextSlug = shouldSyncSlug
                                                                        ? normalizeForumSlug(value) || ev.slug || `event-${Date.now()}`
                                                                        : ev.slug;

                                                                    updateEventSettingsDraft({ eventName: value, title: value, slug: nextSlug });
                                                                }}
                                                                className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/70 font-cinzel outline-none focus:border-pink-500/30 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">שנה</label>
                                                            <input
                                                                type="number"
                                                                value={ev.year || new Date().getFullYear()}
                                                                onChange={(e) => updateEventSettingsDraft({ year: parseInt(e.target.value, 10) || new Date().getFullYear() })}
                                                                className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/70 font-cinzel outline-none focus:border-pink-500/30 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">Slug / URL</label>
                                                            <input
                                                                type="text"
                                                                value={ev.slug || ""}
                                                                onChange={(e) => updateEventSettingsDraft({ slug: normalizeForumSlug(e.target.value) || ev.slug || `event-${Date.now()}` })}
                                                                placeholder="hag-ha-herut-2026"
                                                                dir="ltr"
                                                                className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/70 font-mono outline-none focus:border-pink-500/30 transition-all"
                                                            />
                                                            <p className="text-[11px] text-white/40 font-mono" dir="ltr">/events/{ev.slug || "event-name"}</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">שורת משנה / טיזר</label>
                                                            <input
                                                                type="text"
                                                                value={ev.tagline || ""}
                                                                onChange={(e) => updateEventSettingsDraft({ tagline: e.target.value })}
                                                                placeholder="איוונט חי, חכם ומתעדכן"
                                                                className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/70 font-cinzel outline-none focus:border-pink-500/30 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">קישור לפורום תמיכה</label>
                                                            <input
                                                                type="text"
                                                                value={ev.support_forum_href || "/forums/feedback-and-suggestions"}
                                                                onChange={(e) => updateEventSettingsDraft({ support_forum_href: e.target.value })}
                                                                placeholder="/forums/feedback-and-suggestions"
                                                                dir="ltr"
                                                                className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/70 font-mono outline-none focus:border-pink-500/30 transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">תיאור מרכזי</label>
                                                        <textarea
                                                            value={ev.description || ""}
                                                            onChange={(e) => updateEventSettingsDraft({ description: e.target.value })}
                                                            placeholder="הטקסט שיופיע בטיזר, בדף האיוונט ובשיתופים."
                                                            className="w-full h-28 resize-none bg-black/20 border border-white/5 rounded-2xl p-4 text-sm text-white/70 font-crimson outline-none focus:border-pink-500/30 transition-all"
                                                            dir="rtl"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">יעד פרוגרס בר (נקודות)</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={ev.progress_target ?? 500}
                                                            onChange={(e) => updateEventSettingsDraft({ progress_target: Math.max(1, Number(e.target.value) || 500) })}
                                                            onBlur={() => { void persistEventCatalog(); }}
                                                            className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-sm text-white/70 font-mono outline-none focus:border-pink-500/30 transition-all"
                                                            dir="ltr"
                                                        />
                                                        <p className="text-[10px] text-white/25">הפרוגרס בר בעמוד האיוונט יציג X/[יעד]. ברירת מחדל: 500.</p>
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-white/[0.01] border border-white/[0.03] rounded-[2rem] space-y-5">
                                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                                        <div>
                                                            <h4 className="font-cinzel text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                                                <FileText size={12} /> משימות האיוונט
                                                            </h4>
                                                            <p className="text-xs text-white/30 mt-2">
                                                                אלו הכרטיסים שיופיעו בעמוד האיוונט. אם תחברי משימה לסוג פעילות, הנקודות כאן יסונכרנו גם עם הניקוד האמיתי.
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={handleAddEventMission}
                                                            className="px-4 py-2 bg-amber-500/15 text-amber-300 border border-amber-500/25 rounded-xl text-xs font-cinzel font-black hover:bg-amber-500 hover:text-black transition-all"
                                                        >
                                                            הוסף משימה
                                                        </button>
                                                    </div>

                                                    {ev.missions.length === 0 ? (
                                                        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-white/35 text-sm">
                                                            עדיין לא הוגדרו משימות. הוסיפי לפחות אחת כדי שהדף יציג אותן אוטומטית.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {ev.missions.map((mission, index) => (
                                                                <div key={`event-mission-${index}`} className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5 space-y-4">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <p className="text-xs font-cinzel font-black uppercase tracking-[0.22em] text-amber-300">
                                                                            משימה {index + 1}
                                                                        </p>
                                                                        <button
                                                                            onClick={() => handleRemoveEventMission(index)}
                                                                            className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">כותרת</label>
                                                                            <input
                                                                                type="text"
                                                                                value={mission.title || ""}
                                                                                onChange={(e) => handleUpdateEventMission(index, { title: e.target.value })}
                                                                                className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm text-white/70 outline-none focus:border-amber-500/30 transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">קישור</label>
                                                                            <input
                                                                                type="text"
                                                                                value={mission.href || ""}
                                                                                onChange={(e) => handleUpdateEventMission(index, { href: e.target.value })}
                                                                                dir="ltr"
                                                                                className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm text-white/70 font-mono outline-none focus:border-amber-500/30 transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">אייקון</label>
                                                                            <select
                                                                                value={mission.icon || "Sparkles"}
                                                                                onChange={(e) => handleUpdateEventMission(index, { icon: e.target.value })}
                                                                                className="w-full rounded-xl p-3 text-sm outline-none"
                                                                                style={{ backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                                                                            >
                                                                                {EVENT_ICON_OPTIONS.map((option) => (
                                                                                    <option key={option.value} value={option.value} style={{ backgroundColor: '#0f172a' }}>
                                                                                        {option.label}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">צבע</label>
                                                                            <select
                                                                                value={mission.color || "amber"}
                                                                                onChange={(e) => handleUpdateEventMission(index, { color: e.target.value })}
                                                                                className="w-full rounded-xl p-3 text-sm outline-none"
                                                                                style={{ backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                                                                            >
                                                                                {EVENT_COLOR_OPTIONS.map((option) => (
                                                                                    <option key={option.value} value={option.value} style={{ backgroundColor: '#0f172a' }}>
                                                                                        {option.label}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">נקודות תצוגה</label>
                                                                            <input
                                                                                type="number"
                                                                                value={mission.points ?? 0}
                                                                                onChange={(e) => handleUpdateEventMission(index, { points: parseInt(e.target.value, 10) || 0 })}
                                                                                className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm text-white/70 outline-none focus:border-amber-500/30 transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">סוג פעילות מסונכרן</label>
                                                                            <select
                                                                                value={mission.event_type || ""}
                                                                                onChange={(e) => handleUpdateEventMission(index, { event_type: e.target.value })}
                                                                                className="w-full rounded-xl p-3 text-sm outline-none"
                                                                                style={{ backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                                                                            >
                                                                                {EVENT_ACTIVITY_OPTIONS.map((option) => (
                                                                                    <option key={option.value} value={option.value} style={{ backgroundColor: '#0f172a' }}>
                                                                                        {option.label}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div className="space-y-2 md:col-span-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">תיאור</label>
                                                                            <textarea
                                                                                value={mission.description || ""}
                                                                                onChange={(e) => handleUpdateEventMission(index, { description: e.target.value })}
                                                                                className="w-full h-24 resize-none bg-black/30 border border-white/5 rounded-2xl p-4 text-sm text-white/70 outline-none focus:border-amber-500/30 transition-all"
                                                                                dir="rtl"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-6 bg-white/[0.01] border border-white/[0.03] rounded-[2rem] space-y-5">
                                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                                        <div>
                                                            <h4 className="font-cinzel text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                                                <Gift size={12} /> פרסים לפי מקום
                                                            </h4>
                                                            <p className="text-xs text-white/30 mt-2">
                                                                חלוקת הפרסים בסיום האיוונט נשענת על הכרטיסים האלו לפי שדה המקום בכל פרס.
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={handleAddEventReward}
                                                            className="px-4 py-2 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-xl text-xs font-cinzel font-black hover:bg-emerald-500 hover:text-white transition-all"
                                                        >
                                                            הוסף פרס
                                                        </button>
                                                    </div>

                                                    {ev.rewards.length === 0 ? (
                                                        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-white/35 text-sm">
                                                            עדיין לא הוגדרו פרסים. אם תשמרי פרסים כאן, כפתור הסיום יחלק אותם מהמסד.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {ev.rewards.map((reward, index) => (
                                                                <div key={`event-reward-${index}`} className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5 space-y-4">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <p className="text-xs font-cinzel font-black uppercase tracking-[0.22em] text-emerald-300">
                                                                            פרס {index + 1}
                                                                        </p>
                                                                        <button
                                                                            onClick={() => handleRemoveEventReward(index)}
                                                                            className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">מקום</label>
                                                                            <input
                                                                                type="number"
                                                                                value={reward.rank ?? index + 1}
                                                                                onChange={(e) => handleUpdateEventReward(index, { rank: parseInt(e.target.value, 10) || index + 1 })}
                                                                                className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm text-white/70 outline-none focus:border-emerald-500/30 transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">כותרת הפרס</label>
                                                                            <input
                                                                                type="text"
                                                                                value={reward.title || ""}
                                                                                onChange={(e) => handleUpdateEventReward(index, { title: e.target.value })}
                                                                                className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm text-white/70 outline-none focus:border-emerald-500/30 transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">גליאונים</label>
                                                                            <input
                                                                                type="number"
                                                                                value={reward.galleons ?? 0}
                                                                                onChange={(e) => handleUpdateEventReward(index, { galleons: parseInt(e.target.value, 10) || 0 })}
                                                                                className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm text-white/70 outline-none focus:border-emerald-500/30 transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">נקודות בית</label>
                                                                            <input
                                                                                type="number"
                                                                                value={reward.points ?? 0}
                                                                                onChange={(e) => handleUpdateEventReward(index, { points: parseInt(e.target.value, 10) || 0 })}
                                                                                className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm text-white/70 outline-none focus:border-emerald-500/30 transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">אייקון</label>
                                                                            <select
                                                                                value={reward.icon || "Gift"}
                                                                                onChange={(e) => handleUpdateEventReward(index, { icon: e.target.value })}
                                                                                className="w-full rounded-xl p-3 text-sm outline-none"
                                                                                style={{ backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                                                                            >
                                                                                {EVENT_ICON_OPTIONS.map((option) => (
                                                                                    <option key={option.value} value={option.value} style={{ backgroundColor: '#0f172a' }}>
                                                                                        {option.label}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">שם דרגה / חותם</label>
                                                                            <input
                                                                                type="text"
                                                                                value={reward.group_name || ""}
                                                                                onChange={(e) => handleUpdateEventReward(index, { group_name: e.target.value })}
                                                                                placeholder='למשל "שומר/ת החירות"'
                                                                                className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm text-white/70 outline-none focus:border-emerald-500/30 transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">צבע דרגה</label>
                                                                            <input
                                                                                type="text"
                                                                                value={reward.group_color || "#fbbf24"}
                                                                                onChange={(e) => handleUpdateEventReward(index, { group_color: e.target.value })}
                                                                                className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm text-white/70 font-mono outline-none focus:border-emerald-500/30 transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2 md:col-span-2">
                                                                            <label className="text-[9px] font-cinzel text-white/20 uppercase tracking-widest">תיאור הפרס</label>
                                                                            <textarea
                                                                                value={reward.description || ""}
                                                                                onChange={(e) => handleUpdateEventReward(index, { description: e.target.value })}
                                                                                className="w-full h-24 resize-none bg-black/30 border border-white/5 rounded-2xl p-4 text-sm text-white/70 outline-none focus:border-emerald-500/30 transition-all"
                                                                                dir="rtl"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            </div>

                                            <div className="mt-8 rounded-[2rem] border border-sky-400/20 bg-gradient-to-l from-sky-500/10 via-sky-500/5 to-transparent p-6 space-y-5">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                                    <div>
                                                        <h4 className="font-cinzel text-lg font-black text-sky-200">{EVENT_ADMIN_LEADERBOARD_COPY.title}</h4>
                                                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
                                                            {EVENT_ADMIN_LEADERBOARD_COPY.explainer}
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
                                                            <div className="font-cinzel text-2xl font-black text-sky-200">{rankedParticipants.length}</div>
                                                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{EVENT_ADMIN_LEADERBOARD_COPY.withPoints}</div>
                                                        </div>
                                                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
                                                            <div className="font-cinzel text-lg font-black text-amber-300 truncate max-w-[160px]">
                                                                {liveLeader?.full_name || "—"}
                                                            </div>
                                                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{EVENT_ADMIN_LEADERBOARD_COPY.firstPlaceNow}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {eventLeaderboard.length === 0 ? (
                                                    <div className="rounded-[1.6rem] border border-dashed border-white/12 bg-white/[0.03] p-6 text-center text-sm text-white/55">
                                                        {EVENT_ADMIN_LEADERBOARD_COPY.empty}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {eventLeaderboard.map((profile, index) => {
                                                            const rewardForRank = ev.rewards.find((reward) => reward.rank === index + 1);
                                                            const profilePoints = getProfileLiveEventPoints(profile);

                                                            return (
                                                                <div key={profile.id || `${profile.full_name}-${index}`} className="flex items-center gap-4 rounded-[1.6rem] border border-white/10 bg-black/20 px-5 py-4">
                                                                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl font-cinzel text-base font-black ${
                                                                        index === 0
                                                                            ? 'bg-amber-500/20 text-amber-300'
                                                                            : index === 1
                                                                                ? 'bg-slate-300/15 text-slate-200'
                                                                                : index === 2
                                                                                    ? 'bg-orange-500/20 text-orange-300'
                                                                                    : 'bg-white/10 text-white/75'
                                                                    }`}>
                                                                        {index + 1}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <p className="truncate font-cinzel text-base font-black text-white/85">{profile.full_name || EVENT_ADMIN_LEADERBOARD_COPY.guest}</p>
                                                                            {profile.house && (
                                                                                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                                                                                    {profile.house}
                                                                                </span>
                                                                            )}
                                                                            {rewardForRank?.title && (
                                                                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black tracking-[0.16em] text-emerald-300">
                                                                                    {rewardForRank.title}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="mt-1 text-xs text-white/45">
                                                                            {index === 0 ? EVENT_ADMIN_LEADERBOARD_COPY.finishNow : `\u05DB\u05E8\u05D2\u05E2 \u05D1\u05DE\u05E7\u05D5\u05DD ${index + 1}.`}
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <div className="font-cinzel text-xl font-black text-amber-300">{profilePoints}</div>
                                                                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{EVENT_ADMIN_LEADERBOARD_COPY.points}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/60">
                                                    {EVENT_ADMIN_LEADERBOARD_COPY.tieBreak}
                                                </div>
                                            </div>

                                            <div className="mt-8 p-6 bg-gradient-to-r from-amber-900/40 to-amber-600/20 border border-amber-500/30 rounded-[2rem] text-center space-y-4 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                                                {(() => {
                                                    const rewardsAlreadyDistributed = Boolean(ev.rewards_distributed || ev.completed_at);

                                                    return (
                                                        <>
                                                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400 mb-2">
                                                    <Trophy size={32} />
                                                </div>
                                                <h4 className="font-cinzel text-xl font-black text-amber-500">סיום איוונט וחלוקת פרסים</h4>
                                                    <p className="text-white/50 text-sm font-crimson max-w-md mx-auto">
                                                        {rewardsAlreadyDistributed
                                                            ? "האיוונט כבר סומן כסגור והפרסים שלו כבר חולקו. אם צריך חלוקה חוזרת, עדיף לבדוק קודם את נתוני האירוע במסד."
                                      : "בעת הלחיצה לוח הטירה מדרג את המשתתפים לפי נקודות האיוונט, מזהה מקום 1, 2, 3 וכן הלאה, ומחלק בדיוק את הפרסים שהוגדרו למעלה במסד."}
                                                    </p>
                                                <button
                                                    onClick={handlePreviewEventRewards}
                                                    disabled={isLoadingPreview}
                                                    className="mt-2 w-full md:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-cinzel text-sm rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
                                                >
                                                    <ScrollText size={15} /> {isLoadingPreview ? "טוען..." : "תצוגה מקדימה — מי יקבל מה"}
                                                </button>
                                                {rewardPreview !== null && (
                                                    <div className="mt-3 text-right space-y-2 max-w-sm mx-auto">
                                                        {rewardPreview.length === 0 ? (
                                                            <p className="text-white/40 text-xs font-crimson">אין משתתפים עם נקודות עדיין.</p>
                                                        ) : rewardPreview.map((r) => (
                                                            <div key={r.rank} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/5 text-xs">
                                                                <span className="font-cinzel text-amber-400/80 w-5 shrink-0">#{r.rank}</span>
                                                                <span className="font-crimson text-white/80 flex-1 truncate">{r.name}</span>
                                                                <span className="text-amber-300/70 shrink-0">{r.galleons} 🪙</span>
                                                                {r.points > 0 && <span className="text-emerald-400/70 shrink-0">{r.points} ⭐</span>}
                                                                {r.group && <span className="text-violet-300/60 truncate max-w-[80px] shrink-0 text-[10px]">{r.group}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <button
                                                    onClick={handleDistributeEventRewards}
                                                    disabled={rewardsAlreadyDistributed}
                                                    className="mt-4 w-full md:w-auto px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black font-cinzel rounded-xl transition-all flex items-center justify-center gap-2 mx-auto shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 active:scale-95 disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-white/35 disabled:shadow-none"
                                                >
                                                    <Gift size={18} /> {rewardsAlreadyDistributed ? "הפרסים כבר חולקו" : "חלוקת פרסים למנצחים וסגירת האיוונט"}
                                                </button>
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            <div className="mt-8 p-6 rounded-[1.5rem] bg-pink-500/5 border border-pink-500/10 flex items-start gap-4">
                                                <ShieldCheck size={20} className="text-pink-400 shrink-0 mt-1" />
                                                <p className="text-pink-300/60 font-crimson text-sm italic leading-relaxed">
                                                    שינויים בהגדרות אלו משפיעים באופן מיידי על כל המשתמשים באתר.
                                                </p>
                                            </div>
                                        </section>
                                    );
                                })()}
                            </div>
                        )}

                    </div>{/* end lg:col-span-2 */}

                    {/* ── RIGHT SIDEBAR — Broadcast (קבועה בכל טאב) ── */}
                    <div className="space-y-6">
                        {isAdmin && (
                            <>
                            <section className="admin-card rounded-2xl p-5 space-y-4">
                                <div className="space-y-2">
                                    <h3 className="font-cinzel text-xs font-black text-purple-400 flex items-center gap-2 uppercase tracking-widest">
                                        <Megaphone size={13} /> שידור בזמן אמת
                                    </h3>
                                    <p className="text-xs leading-6 text-white/35">
                                        הודעה רגעית למשתמשים שמחוברים עכשיו. זה לא מחליף את הבאנרים הקבועים של ראש האתר.
                                    </p>
                                </div>
                                <textarea
                                    value={broadcastMsg}
                                    onChange={(e) => setBroadcastMsg(e.target.value)}
                                    placeholder="הודעה לכל הקוסמים המחוברים…"
                                    className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-purple-500/30 rounded-xl p-3.5 text-sm outline-none h-24 resize-none transition-all"
                                    dir="rtl"
                                />
                                <button onClick={handleBroadcast}
                                    className="w-full bg-purple-600/15 text-purple-400 border border-purple-500/20 hover:bg-purple-600 hover:text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest font-cinzel transition-all">
                                    שלח שידור חי
                                </button>
                            </section>
                            <EmailBroadcastCard />
                            </>
                        )}

                        {/* Stats summary */}
                        <section className="admin-card rounded-2xl p-5 space-y-3">
                            <h3 className="font-cinzel text-xs font-black text-white/20 uppercase tracking-widest">סטטיסטיקות</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "קוסמים", value: allProfiles.length, color: "text-white/60" },
                                    { label: "לוגים", value: adminLogs.length, color: "text-rose-400" },
                                    { label: "דיווחים", value: reports.length, color: "text-red-400" },
                                    { label: "כתבות", value: news.length, color: "text-blue-400" },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="bg-white/[0.02] rounded-xl p-3 text-center">
                                        <p className={`font-cinzel font-black text-xl ${color}`}>{value}</p>
                                        <p className="text-[9px] text-white/20 font-cinzel uppercase mt-0.5">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}





