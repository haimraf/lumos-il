"use client";

import { useMemo, useState } from "react";
import { Search, ShieldAlert, ShieldX, Snowflake, UserCheck, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { AdminAuditInput } from "@/lib/adminAudit";

const HOUSE_COLORS: Record<string, string> = {
    Gryffindor: "#ef4444",
    Slytherin: "#34d399",
    Ravenclaw: "#60a5fa",
    Hufflepuff: "#fbbf24",
    Unsorted: "rgba(255,255,255,0.4)",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    active: { label: "פעיל", color: "#34d399" },
    cooling: { label: "חדר קירור", color: "#60a5fa" },
    banned: { label: "מורחק", color: "#ef4444" },
    ghost: { label: "שאדו באן", color: "#a855f7" },
};

const LEGACY_BANNED_ROLE = "אסיר אזקבאן";

type ActionType = "cooling" | "banned" | "ghost" | null;
type ModerationStatusKey = "active" | "cooling" | "banned" | "ghost";

const MODERATION_ACTIONS = new Set([
    "set_user_cooling",
    "set_user_banned",
    "set_user_ghost",
    "release_user_moderation",
]);

const ACTIVE_MODERATION_ACTIONS = new Set([
    "set_user_cooling",
    "set_user_banned",
    "set_user_ghost",
]);

type ModerationUser = {
    id: string;
    full_name: string | null;
    email: string | null;
    status: string | null;
    ban_reason: string | null;
    ban_expires_at: string | null;
    house: string | null;
    role: string | null;
    is_ghost: boolean | null;
};

type SendOwl = (
    title: string,
    message: string,
    tone?: "success" | "magic" | "error" | "info" | "system",
    isGlobal?: boolean
) => void;

type AuditEntry = Omit<AdminAuditInput, "actorId" | "actorName" | "actorRole">;
type AdminLog = {
    id: string;
    actor_name: string;
    actor_role: string | null;
    action: string;
    target_type: string | null;
    target_id: string | null;
    target_label: string | null;
    details: Record<string, unknown> | null;
    created_at: string;
};

type ModerationSnapshot = {
    user: ModerationUser;
    statusKey: ModerationStatusKey;
    latestSetLog: AdminLog | null;
    latestReleaseLog: AdminLog | null;
};

type ModerationResidueSnapshot = {
    user: ModerationUser;
    flags: string[];
};

function getStatusKey(user: ModerationUser): ModerationStatusKey {
    const normalizedStatus = typeof user.status === "string" ? user.status.trim().toLowerCase() : null;

    if (user.is_ghost) return "ghost";
    if (normalizedStatus === "cooling") return "cooling";
    if (normalizedStatus === "banned") return "banned";
    if (!normalizedStatus && user.role === LEGACY_BANNED_ROLE) return "banned";
    return "active";
}

function isCurrentlyModerated(user: ModerationUser) {
    return getStatusKey(user) !== "active";
}

function getModerationResidueFlags(user: ModerationUser) {
    const flags: string[] = [];

    if (user.role === LEGACY_BANNED_ROLE && getStatusKey(user) === "active") {
        flags.push("legacy-role");
    }

    if (user.ban_reason !== null) {
        flags.push("ban_reason");
    }

    if (user.ban_expires_at !== null) {
        flags.push("ban_expires_at");
    }

    return flags;
}

function hasModerationResidue(user: ModerationUser) {
    if (isCurrentlyModerated(user)) return false;
    return getModerationResidueFlags(user).length > 0;
}

function getDetailValue(details: Record<string, unknown> | null | undefined, key: string) {
    if (!details || typeof details !== "object") return null;
    return details[key];
}

function getDetailString(details: Record<string, unknown> | null | undefined, key: string) {
    const value = getDetailValue(details, key);
    return typeof value === "string" && value.trim() ? value : null;
}

function formatDateTime(dateString: string | null | undefined) {
    if (!dateString) return null;
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString("he-IL", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function prettifyModerationAction(action: string) {
    switch (action) {
        case "set_user_cooling":
            return "שלח לקולינג רום";
        case "set_user_banned":
            return "הרחיק לצמיתות";
        case "set_user_ghost":
            return "הפעיל שאדו באן";
        case "release_user_moderation":
            return "שחרר מהגבלה";
        default:
            return action;
    }
}

export default function ModerationTab({
    sendOwl,
    onAudit,
    profiles = [],
    logs = [],
    onRefresh,
}: {
    sendOwl: SendOwl;
    onAudit?: (entry: AuditEntry) => void | Promise<void>;
    profiles?: ModerationUser[];
    logs?: AdminLog[];
    onRefresh?: () => void | Promise<void>;
}) {
    const [supabase] = useState(() => createClient());
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<ModerationUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionUser, setActionUser] = useState<ModerationUser | null>(null);
    const [actionType, setActionType] = useState<ActionType>(null);
    const [reason, setReason] = useState("");
    const [days, setDays] = useState("1");

    const actionMeta = useMemo(() => {
        if (actionType === "cooling") {
            return {
                title: "חדר קירור",
                icon: "❄️",
                color: "#60a5fa",
                submit: `שלח לחדר קירור ל-${days} ימים`,
                defaultReason: "התנהגות שאינה הולמת את רוח הטירה",
            };
        }
        if (actionType === "ghost") {
            return {
                title: "שאדו באן",
                icon: "👻",
                color: "#a855f7",
                submit: "הפעל שאדו באן",
                defaultReason: "חשד להספמה או הטרדה",
            };
        }
        if (actionType === "banned") {
            return {
                title: "הרחקה קבועה",
                icon: "🔒",
                color: "#ef4444",
                submit: "הרחק לצמיתות",
                defaultReason: "הפרה חמורה של כללי הטירה",
            };
        }
        return null;
    }, [actionType, days]);

    const moderationStats = useMemo(() => ({
        cooling: profiles.filter((user) => getStatusKey(user) === "cooling").length,
        banned: profiles.filter((user) => getStatusKey(user) === "banned").length,
        ghost: profiles.filter((user) => getStatusKey(user) === "ghost").length,
    }), [profiles]);

    const moderatedUsers = useMemo<ModerationSnapshot[]>(() => {
        const statusWeight: Record<ModerationStatusKey, number> = {
            banned: 0,
            cooling: 1,
            ghost: 2,
            active: 3,
        };

        return profiles
            .filter(isCurrentlyModerated)
            .map((user) => {
                const userLogs = logs
                    .filter((log) => log.target_id === user.id && MODERATION_ACTIONS.has(log.action));

                return {
                    user,
                    statusKey: getStatusKey(user),
                    latestSetLog: userLogs.find((log) => ACTIVE_MODERATION_ACTIONS.has(log.action)) || null,
                    latestReleaseLog: userLogs.find((log) => log.action === "release_user_moderation") || null,
                };
            })
            .sort((a, b) => {
                const statusDiff = statusWeight[a.statusKey] - statusWeight[b.statusKey];
                if (statusDiff !== 0) return statusDiff;

                const aTime = a.latestSetLog ? new Date(a.latestSetLog.created_at).getTime() : 0;
                const bTime = b.latestSetLog ? new Date(b.latestSetLog.created_at).getTime() : 0;
                return bTime - aTime;
            });
    }, [logs, profiles]);

    const recentModerationLogs = useMemo(() => (
        logs
            .filter((log) => MODERATION_ACTIONS.has(log.action))
            .slice(0, 12)
    ), [logs]);

    const moderationResidueUsers = useMemo<ModerationResidueSnapshot[]>(() => (
        profiles
            .filter(hasModerationResidue)
            .map((user) => ({
                user,
                flags: getModerationResidueFlags(user),
            }))
            .sort((a, b) => {
                const aTime = a.user.ban_expires_at ? new Date(a.user.ban_expires_at).getTime() : 0;
                const bTime = b.user.ban_expires_at ? new Date(b.user.ban_expires_at).getTime() : 0;
                return bTime - aTime;
            })
    ), [profiles]);

    const searchUsers = async () => {
        if (!searchTerm.trim()) return;

        setLoading(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, email, status, ban_reason, ban_expires_at, house, role, is_ghost")
            .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
            .limit(8);

        if (error) {
            sendOwl("תקלה בחיפוש", "לא הצלחתי להביא את תוצאות החיפוש כרגע.", "error");
            setUsers([]);
        } else {
            setUsers((data || []) as ModerationUser[]);
        }

        setLoading(false);
    };

    const openAction = (user: ModerationUser, type: ActionType) => {
        setActionUser(user);
        setActionType(type);
        setReason(
            type === "cooling"
                ? "התנהגות שאינה הולמת את רוח הטירה"
                : type === "ghost"
                    ? "חשד להספמה או הטרדה"
                    : "הפרה חמורה של כללי הטירה"
        );
        setDays("1");
    };

    const closeAction = () => {
        setActionUser(null);
        setActionType(null);
        setReason("");
        setDays("1");
    };

    const applyAction = async () => {
        if (!actionUser || !actionType) return;

        const daysNum = actionType === "cooling" ? Math.max(1, parseInt(days, 10) || 1) : 0;
        const expiresAt = actionType === "cooling"
            ? new Date(Date.now() + daysNum * 86_400_000).toISOString()
            : null;

        const updateData: Record<string, unknown> = {
            ban_reason: reason.trim() || null,
        };

        if (actionType === "ghost") {
            updateData.is_ghost = true;
            updateData.ban_expires_at = null;
        } else {
            updateData.status = actionType;
            updateData.is_ghost = false;
            updateData.ban_expires_at = expiresAt;
        }

        const { error } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", actionUser.id);

        if (error) {
            sendOwl("עדכון נכשל", "לא הצלחתי לעדכן את מצב המשמעת של המשתמש.", "error");
            return;
        }

        sendOwl("עודכן בהצלחה", `${actionUser.full_name || actionUser.email || "המשתמש"} עודכן.`, "success");
        await onAudit?.({
            action:
                actionType === "cooling"
                    ? "set_user_cooling"
                    : actionType === "ghost"
                        ? "set_user_ghost"
                        : "set_user_banned",
            targetType: "profile",
            targetId: actionUser.id,
            targetLabel: actionUser.full_name || actionUser.email || null,
            details: {
                reason: reason.trim() || null,
                days: actionType === "cooling" ? daysNum : null,
                expiresAt,
            },
        });
        closeAction();
        await onRefresh?.();
        if (searchTerm.trim()) {
            await searchUsers();
        }
    };

    const releaseUser = async (user: ModerationUser) => {
        const updateData: Record<string, unknown> = {
            is_ghost: false,
            ban_reason: null,
            ban_expires_at: null,
        };

        if (user.status !== "active") {
            updateData.status = "active";
        }

        const { error } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", user.id);

        if (error) {
            sendOwl("שחרור נכשל", "לא הצלחתי לשחרר את המשתמש כרגע.", "error");
            return;
        }

        sendOwl("החסימה הוסרה", `החסימה הוסרה עבור ${user.full_name || user.email || "החשבון שנבחר"}.`, "success");
        await onAudit?.({
            action: "release_user_moderation",
            targetType: "profile",
            targetId: user.id,
            targetLabel: user.full_name || user.email || null,
            details: {
                previousStatus: user.status,
                wasGhost: Boolean(user.is_ghost),
            },
        });
        await onRefresh?.();
        if (searchTerm.trim()) {
            await searchUsers();
        }
    };

    return (
        <section className="glass-panel p-8 rounded-[3rem] space-y-6" style={{ position: "relative" }}>
            <h3 className="font-cinzel text-xl font-bold text-red-500 flex items-center gap-3">
                <ShieldAlert size={28} /> ניהול משמעת
            </h3>

            <div className="grid gap-3 md:grid-cols-3">
                {([
                    { key: "banned", label: "מורחקים", value: moderationStats.banned, color: "#ef4444" },
                    { key: "cooling", label: "בקולינג רום", value: moderationStats.cooling, color: "#60a5fa" },
                    { key: "ghost", label: "בשאדו באן", value: moderationStats.ghost, color: "#a855f7" },
                ] as const).map((item) => (
                    <div
                        key={item.key}
                        className="rounded-2xl border p-4"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            borderColor: `${item.color}30`,
                            boxShadow: `inset 0 0 0 1px ${item.color}12`,
                        }}
                    >
                        <div className="text-[10px] font-cinzel font-black uppercase tracking-[0.18em]" style={{ color: `${item.color}cc` }}>
                            {item.label}
                        </div>
                        <div className="mt-2 font-cinzel text-3xl font-black text-white">
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>

            {moderationResidueUsers.length > 0 && (
                <section className="rounded-[2rem] border border-amber-400/15 bg-amber-500/[0.05] p-5 space-y-4">
                    <div>
                        <h4 className="font-cinzel text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                            נתוני מודרציה לא עקביים
                        </h4>
                        <p className="mt-1 text-xs text-amber-100/70">
                            אלה לא חסימות פעילות, אלא שדות ישנים שנשארו על החשבון ולכן קל לחשוב בטעות שיש עדיין באן או קולינג רום.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {moderationResidueUsers.map(({ user, flags }) => (
                            <div
                                key={user.id}
                                className="rounded-2xl border border-amber-300/15 bg-black/20 p-4"
                            >
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="font-cinzel text-sm font-black text-white">
                                            {user.full_name || user.email || "חשבון ללא שם"}
                                        </div>
                                        <div className="mt-1 text-xs text-amber-100/70">
                                            status: {user.status || "null"} | role: {user.role || "null"} | ghost: {String(Boolean(user.is_ghost))}
                                        </div>
                                        <div className="mt-2 text-xs text-white/60">
                                            ban_reason: {user.ban_reason === null ? "null" : user.ban_reason === "" ? '""' : user.ban_reason}
                                            {user.ban_expires_at ? ` | ban_expires_at: ${formatDateTime(user.ban_expires_at) || user.ban_expires_at}` : ""}
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/70">
                                        {flags.join(" · ")}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h4 className="font-cinzel text-xs font-black uppercase tracking-[0.18em] text-white/75">
                            סטטוסים פעילים
                        </h4>
                        <p className="mt-1 text-xs text-white/35">
                            מי כרגע בבאן, בקולינג רום או בשאדו באן, ולפי מי ולמה.
                        </p>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                        {moderatedUsers.length} חשבונות פעילים במודרציה
                    </div>
                </div>

                {moderatedUsers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/35">
                        אין כרגע חשבונות תחת הגבלה פעילה.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {moderatedUsers.map(({ user, statusKey, latestSetLog, latestReleaseLog }) => {
                            const statusMeta = STATUS_LABELS[statusKey];
                            const houseColor = HOUSE_COLORS[user.house || "Unsorted"] || "rgba(255,255,255,0.3)";
                            const latestReason = user.ban_reason || getDetailString(latestSetLog?.details, "reason");
                            const expiresLabel = formatDateTime(user.ban_expires_at);
                            const appliedAtLabel = formatDateTime(latestSetLog?.created_at);
                            const releasedAtLabel = formatDateTime(latestReleaseLog?.created_at);

                            return (
                                <div
                                    key={user.id}
                                    className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4 space-y-3"
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{ background: houseColor, boxShadow: `0 0 10px ${houseColor}` }}
                                                />
                                                <span className="font-cinzel text-base font-black text-white">
                                                    {user.full_name || "ללא שם"}
                                                </span>
                                                {user.email && (
                                                    <span className="text-[11px] text-white/25">{user.email}</span>
                                                )}
                                                <span
                                                    className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                                                    style={{
                                                        background: `${statusMeta.color}15`,
                                                        border: `1px solid ${statusMeta.color}30`,
                                                        color: statusMeta.color,
                                                    }}
                                                >
                                                    {statusMeta.label}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2 text-[11px] text-white/45">
                                                <span>בית: {user.house || "טרם שובץ"}</span>
                                                {expiresLabel && <span>עד: {expiresLabel}</span>}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={() => void releaseUser(user)}
                                                className="rounded-xl border px-3 py-2 text-xs font-cinzel font-black transition-all"
                                                style={{
                                                    background: "rgba(52,211,153,0.08)",
                                                    color: "#34d399",
                                                    borderColor: "rgba(52,211,153,0.2)",
                                                }}
                                            >
                                                שחרור
                                            </button>
                                            <button
                                                onClick={() => openAction(user, "cooling")}
                                                className="rounded-xl border px-3 py-2 text-xs font-cinzel font-black transition-all"
                                                style={{
                                                    background: "rgba(96,165,250,0.08)",
                                                    color: "#60a5fa",
                                                    borderColor: "rgba(96,165,250,0.2)",
                                                }}
                                            >
                                                קולינג
                                            </button>
                                            <button
                                                onClick={() => openAction(user, "ghost")}
                                                className="rounded-xl border px-3 py-2 text-xs font-cinzel font-black transition-all"
                                                style={{
                                                    background: "rgba(168,85,247,0.08)",
                                                    color: "#a855f7",
                                                    borderColor: "rgba(168,85,247,0.2)",
                                                }}
                                            >
                                                שאדו
                                            </button>
                                            <button
                                                onClick={() => openAction(user, "banned")}
                                                className="rounded-xl border px-3 py-2 text-xs font-cinzel font-black transition-all"
                                                style={{
                                                    background: "rgba(239,68,68,0.08)",
                                                    color: "#ef4444",
                                                    borderColor: "rgba(239,68,68,0.2)",
                                                }}
                                            >
                                                באן
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                                            <div className="text-[10px] font-cinzel font-black uppercase tracking-[0.18em] text-white/25">
                                                מי נתן ולמה
                                            </div>
                                            <div className="mt-2 text-sm text-white/75 leading-relaxed">
                                                {latestSetLog ? (
                                                    <>
                                                        <div>
                                                            <span className="font-black text-white">{latestSetLog.actor_name}</span>
                                                            {latestSetLog.actor_role ? <span className="text-white/30"> · {latestSetLog.actor_role}</span> : null}
                                                        </div>
                                                        <div className="mt-1 text-white/45">
                                                            {prettifyModerationAction(latestSetLog.action)}
                                                            {appliedAtLabel ? ` · ${appliedAtLabel}` : ""}
                                                        </div>
                                                        <div className="mt-2 text-white/60">
                                                            {latestReason || "לא תועדה סיבה מפורשת."}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-white/35">אין עדיין רישום מנהל זמין עבור ההגבלה הזו.</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                                            <div className="text-[10px] font-cinzel font-black uppercase tracking-[0.18em] text-white/25">
                                                הורדת באן אחרונה
                                            </div>
                                            <div className="mt-2 text-sm text-white/75 leading-relaxed">
                                                {latestReleaseLog ? (
                                                    <>
                                                        <div>
                                                            <span className="font-black text-white">{latestReleaseLog.actor_name}</span>
                                                            {latestReleaseLog.actor_role ? <span className="text-white/30"> · {latestReleaseLog.actor_role}</span> : null}
                                                        </div>
                                                        <div className="mt-1 text-white/45">
                                                            {prettifyModerationAction(latestReleaseLog.action)}
                                                            {releasedAtLabel ? ` · ${releasedAtLabel}` : ""}
                                                        </div>
                                                        <div className="mt-2 text-white/60">
                                                            מצב קודם: {getDetailString(latestReleaseLog.details, "previousStatus") || "לא תועד"}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-white/35">לא נמצא שחרור מתועד עבור החשבון הזה.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 space-y-4">
                <div>
                    <h4 className="font-cinzel text-xs font-black uppercase tracking-[0.18em] text-white/75">
                        רצף פעולות מודרציה
                    </h4>
                    <p className="mt-1 text-xs text-white/35">
                        כולל מי נתן, למי, למה ומתי גם במקרה של שחרור.
                    </p>
                </div>

                {recentModerationLogs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/35">
                        עדיין אין לוגי מודרציה מתועדים.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentModerationLogs.map((log) => {
                            const reasonLabel = getDetailString(log.details, "reason");
                            const previousStatus = getDetailString(log.details, "previousStatus");
                            const daysValue = getDetailValue(log.details, "days");
                            const expiresAt = formatDateTime(getDetailString(log.details, "expiresAt"));

                            return (
                                <div key={log.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0">
                                            <div className="text-sm text-white/85 leading-relaxed">
                                                <span className="font-black text-red-300">{log.actor_name}</span>
                                                {log.actor_role ? <span className="text-white/30"> · {log.actor_role}</span> : null}
                                                <span className="text-white/25"> · </span>
                                                <span>{prettifyModerationAction(log.action)}</span>
                                                {log.target_label ? <span className="text-white/35"> · {log.target_label}</span> : null}
                                            </div>
                                            <div className="mt-2 text-xs text-white/50 leading-relaxed">
                                                {reasonLabel || "ללא סיבה כתובה"}
                                                {typeof daysValue === "number" ? ` · ${daysValue} ימים` : ""}
                                                {expiresAt ? ` · עד ${expiresAt}` : ""}
                                                {previousStatus ? ` · מצב קודם: ${previousStatus}` : ""}
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25 whitespace-nowrap">
                                            {formatDateTime(log.created_at) || "ללא זמן"}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <div className="flex gap-2">
                <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && void searchUsers()}
                    placeholder="חיפוש לפי שם או אימייל..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-red-500/50 transition-all"
                />
                <button
                    onClick={() => void searchUsers()}
                    disabled={loading}
                    className="bg-red-600/20 text-red-500 p-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all border border-red-500/20 disabled:opacity-50"
                >
                    <Search size={20} />
                </button>
            </div>

            <div className="space-y-3">
                {users.map((user) => {
                    const statusMeta =
                        user.is_ghost && user.status === "active"
                            ? STATUS_LABELS.ghost
                            : STATUS_LABELS[user.status || "active"] || STATUS_LABELS.active;
                    const houseColor = HOUSE_COLORS[user.house || "Unsorted"] || "rgba(255,255,255,0.3)";
                    const canRelease = user.status !== "active" || Boolean(user.is_ghost);

                    return (
                        <div
                            key={user.id}
                            className="p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
                        >
                            <div>
                                <div className="flex items-center gap-2.5 mb-1">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: houseColor, boxShadow: `0 0 6px ${houseColor}` }}
                                    />
                                    <span className="font-cinzel font-black text-base text-white">
                                        {user.full_name || "ללא שם"}
                                    </span>
                                    <span
                                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                        style={{
                                            background: `${statusMeta.color}15`,
                                            color: statusMeta.color,
                                            border: `1px solid ${statusMeta.color}30`,
                                        }}
                                    >
                                        {statusMeta.label}
                                    </span>
                                    {user.is_ghost && (
                                        <span
                                            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                            style={{
                                                background: "#a855f715",
                                                color: "#a855f7",
                                                border: "1px solid #a855f730",
                                            }}
                                        >
                                            Ghost
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-white/25 mr-4">{user.email}</p>
                                {user.ban_reason && (user.status !== "active" || user.is_ghost) && (
                                    <p className="text-[10px] text-white/40 italic mr-4 mt-1">
                                        סיבה: {user.ban_reason}
                                        {user.ban_expires_at && ` | עד ${new Date(user.ban_expires_at).toLocaleDateString("he-IL")}`}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2 shrink-0">
                                {canRelease && (
                                    <button
                                        onClick={() => void releaseUser(user)}
                                        className="p-2.5 rounded-xl transition-all border text-xs font-cinzel font-black"
                                        style={{
                                            background: "rgba(52,211,153,0.08)",
                                            color: "#34d399",
                                            borderColor: "rgba(52,211,153,0.2)",
                                        }}
                                        title="שחרר חסימה"
                                    >
                                        <UserCheck size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => openAction(user, "cooling")}
                                    className="p-2.5 rounded-xl transition-all border"
                                    style={{
                                        background: "rgba(96,165,250,0.08)",
                                        color: "#60a5fa",
                                        borderColor: "rgba(96,165,250,0.2)",
                                    }}
                                    title="חדר קירור"
                                >
                                    <Snowflake size={16} />
                                </button>
                                <button
                                    onClick={() => openAction(user, "ghost")}
                                    className="p-2.5 rounded-xl transition-all border"
                                    style={{
                                        background: "rgba(168,85,247,0.08)",
                                        color: "#a855f7",
                                        borderColor: "rgba(168,85,247,0.2)",
                                    }}
                                    title="שאדו באן"
                                >
                                    👻
                                </button>
                                <button
                                    onClick={() => openAction(user, "banned")}
                                    className="p-2.5 rounded-xl transition-all border"
                                    style={{
                                        background: "rgba(239,68,68,0.08)",
                                        color: "#ef4444",
                                        borderColor: "rgba(239,68,68,0.2)",
                                    }}
                                    title="הרחקה קבועה"
                                >
                                    <ShieldX size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {actionUser && actionType && actionMeta && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 99999,
                        background: "rgba(0,0,0,0.75)",
                        backdropFilter: "blur(8px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "24px",
                    }}
                    onClick={(event) => event.target === event.currentTarget && closeAction()}
                >
                    <div
                        dir="rtl"
                        style={{
                            background: "linear-gradient(145deg, #0d1117, #111827)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "28px",
                            padding: "36px",
                            maxWidth: "460px",
                            width: "100%",
                            boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
                            position: "relative",
                        }}
                    >
                        <button
                            onClick={closeAction}
                            style={{
                                position: "absolute",
                                top: "16px",
                                left: "16px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "10px",
                                padding: "6px",
                                cursor: "pointer",
                                color: "rgba(255,255,255,0.4)",
                                display: "flex",
                            }}
                        >
                            <X size={16} />
                        </button>

                        <div style={{ marginBottom: "28px" }}>
                            <div style={{ fontSize: "28px", marginBottom: "12px" }}>{actionMeta.icon}</div>
                            <h2
                                style={{
                                    fontFamily: "'Cinzel', serif",
                                    fontSize: "1.1rem",
                                    fontWeight: 900,
                                    color: actionMeta.color,
                                    marginBottom: "4px",
                                }}
                            >
                                {actionMeta.title}
                            </h2>
                            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
                                {actionUser.full_name || actionUser.email}
                            </p>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label
                                style={{
                                    display: "block",
                                    fontFamily: "'Cinzel', serif",
                                    fontSize: "9px",
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.15em",
                                    color: "rgba(255,255,255,0.35)",
                                    marginBottom: "8px",
                                }}
                            >
                                סיבת הפעולה
                            </label>
                            <textarea
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                rows={3}
                                placeholder={actionMeta.defaultReason}
                                style={{
                                    width: "100%",
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "14px",
                                    padding: "12px 14px",
                                    color: "rgba(255,255,255,0.85)",
                                    fontSize: "13px",
                                    fontFamily: "'Assistant', sans-serif",
                                    outline: "none",
                                    resize: "none",
                                    boxSizing: "border-box",
                                    direction: "rtl",
                                }}
                            />
                        </div>

                        {actionType === "cooling" && (
                            <div style={{ marginBottom: "24px" }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontFamily: "'Cinzel', serif",
                                        fontSize: "9px",
                                        fontWeight: 900,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.15em",
                                        color: "rgba(255,255,255,0.35)",
                                        marginBottom: "8px",
                                    }}
                                >
                                    משך בימים
                                </label>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    {["1", "3", "7", "14", "30"].map((value) => (
                                        <button
                                            key={value}
                                            onClick={() => setDays(value)}
                                            style={{
                                                padding: "6px 16px",
                                                borderRadius: "10px",
                                                border: `1px solid ${days === value ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.08)"}`,
                                                background: days === value ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.03)",
                                                color: days === value ? "#60a5fa" : "rgba(255,255,255,0.4)",
                                                fontFamily: "'Cinzel', serif",
                                                fontWeight: 700,
                                                fontSize: "12px",
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            {value}י
                                        </button>
                                    ))}
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={days}
                                        onChange={(event) => setDays(event.target.value)}
                                        style={{
                                            width: "64px",
                                            padding: "6px 10px",
                                            borderRadius: "10px",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            background: "rgba(255,255,255,0.04)",
                                            color: "rgba(255,255,255,0.7)",
                                            fontFamily: "'Cinzel', serif",
                                            fontSize: "12px",
                                            outline: "none",
                                            textAlign: "center",
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => void applyAction()}
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: "14px",
                                border: "none",
                                background:
                                    actionType === "cooling"
                                        ? "linear-gradient(135deg, #1d4ed8, #3b82f6)"
                                        : actionType === "ghost"
                                            ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                                            : "linear-gradient(135deg, #991b1b, #ef4444)",
                                color: "#fff",
                                fontFamily: "'Cinzel', serif",
                                fontWeight: 900,
                                fontSize: "13px",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                cursor: "pointer",
                                boxShadow:
                                    actionType === "cooling"
                                        ? "0 0 30px rgba(59,130,246,0.3)"
                                        : actionType === "ghost"
                                            ? "0 0 30px rgba(168,85,247,0.3)"
                                            : "0 0 30px rgba(239,68,68,0.3)",
                            }}
                        >
                            {actionMeta.submit}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
