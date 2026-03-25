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

type ActionType = "cooling" | "banned" | "ghost" | null;

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

export default function ModerationTab({
    sendOwl,
    onAudit,
}: {
    sendOwl: SendOwl;
    onAudit?: (entry: AuditEntry) => void | Promise<void>;
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
        void onAudit?.({
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
        void searchUsers();
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
        void onAudit?.({
            action: "release_user_moderation",
            targetType: "profile",
            targetId: user.id,
            targetLabel: user.full_name || user.email || null,
            details: {
                previousStatus: user.status,
                wasGhost: Boolean(user.is_ghost),
            },
        });
        void searchUsers();
    };

    return (
        <section className="glass-panel p-8 rounded-[3rem] space-y-6" style={{ position: "relative" }}>
            <h3 className="font-cinzel text-xl font-bold text-red-500 flex items-center gap-3">
                <ShieldAlert size={28} /> ניהול משמעת
            </h3>

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
