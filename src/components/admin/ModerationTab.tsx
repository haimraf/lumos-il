"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ShieldX, Snowflake, UserCheck, Search, ShieldAlert, X } from "lucide-react";

const HOUSE_COLORS: Record<string, string> = {
    Gryffindor: "#ef4444", Slytherin: "#34d399", Ravenclaw: "#60a5fa", Hufflepuff: "#fbbf24",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    active:  { label: "פעיל",       color: "#34d399" },
    cooling: { label: "חדר קירור", color: "#60a5fa" },
    banned:  { label: "מורחק",      color: "#ef4444" },
    ghost:   { label: "שאדו באן",    color: "#a855f7" },
};

type ActionType = 'cooling' | 'banned' | 'ghost' | null;

export default function ModerationTab({ sendOwl }: { sendOwl: any }) {
    const supabase = createClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionUser, setActionUser] = useState<any | null>(null);
    const [actionType, setActionType] = useState<ActionType>(null);
    const [reason, setReason] = useState("");
    const [days, setDays] = useState("1");

    const searchUsers = async () => {
        if (!searchTerm.trim()) return;
        setLoading(true);
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email, status, ban_reason, ban_expires_at, house, role, is_ghost')
            .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
            .limit(8);
        setUsers(data || []);
        setLoading(false);
    };

    const openAction = (user: any, type: ActionType) => {
        setActionUser(user);
        setActionType(type);
        let defaultReason = "הפרה של כללי הטירה";
        if (type === 'cooling') defaultReason = "התנהגות שאינה הולמת את רוח הטירה";
        if (type === 'banned') defaultReason = "הפרה חמורה של כללי הטירה";
        if (type === 'ghost') defaultReason = "חשד להספמה או הטרדה";
        setReason(defaultReason);
        setDays("1");
    };

    const closeAction = () => { setActionUser(null); setActionType(null); };

    const applyAction = async () => {
        if (!actionUser || !actionType) return;
        const daysNum = actionType === 'cooling' ? parseInt(days) || 1 : 0;
        const expiresAt = daysNum > 0 ? new Date(Date.now() + daysNum * 86_400_000).toISOString() : null;

        const updateData: any = { ban_reason: reason, ban_expires_at: expiresAt };
        
        if (actionType === 'ghost') {
            updateData.is_ghost = true;
        } else {
            updateData.status = actionType;
            if (actionType === 'banned') {
                updateData.role = 'אסיר אזקבאן';
            }
        }

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', actionUser.id);

        if (!error) {
            sendOwl("הוגוורטס עודכנה", `${actionUser.full_name} — ${STATUS_LABELS[actionType].label}`, "success");
            closeAction();
            searchUsers();
        } else {
            sendOwl("תקלה בלחש", "לא ניתן היה לעדכן את הסטטוס", "error");
        }
    };

    const release = async (userId: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ 
                status: 'active', 
                role: 'קוסמ׳', // Default role on release
                is_ghost: false,
                ban_reason: null, 
                ban_expires_at: null 
            })
            .eq('id', userId);
        if (!error) {
            sendOwl("שוחרר", "המשתמש שוחרר בהצלחה", "success");
            searchUsers();
        }
    };

    return (
        <section className="glass-panel p-8 rounded-[3rem] space-y-6" style={{ position: "relative" }}>
            <h3 className="font-cinzel text-xl font-bold text-red-500 flex items-center gap-3">
                <ShieldAlert size={28} /> ניהול משמעת
            </h3>

            <div className="flex gap-2">
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                    placeholder="חפש קוסם/מכשפה לפי שם או אימייל..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-red-500/50 transition-all"
                />
                <button
                    onClick={searchUsers}
                    disabled={loading}
                    className="bg-red-600/20 text-red-500 p-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all border border-red-500/20"
                >
                    <Search size={20} />
                </button>
            </div>

            <div className="space-y-3">
                {users.map(u => {
                    const st = STATUS_LABELS[u.status] || STATUS_LABELS.active;
                    const houseColor = HOUSE_COLORS[u.house] || "rgba(255,255,255,0.3)";
                    return (
                        <div
                            key={u.id}
                            className="p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
                        >
                            <div>
                                <div className="flex items-center gap-2.5 mb-1">
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: houseColor, boxShadow: `0 0 6px ${houseColor}` }}
                                    />
                                    <span className="font-cinzel font-black text-base text-white">{u.full_name}</span>
                                    <span
                                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                        style={{ background: `${st.color}15`, color: st.color, border: `1px solid ${st.color}30` }}
                                    >
                                        {st.label}
                                    </span>
                                    {u.is_ghost && (
                                        <span
                                            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mr-2"
                                            style={{ background: `#a855f715`, color: "#a855f7", border: `1px solid #a855f730` }}
                                        >
                                            רוח רפאים 👻
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-white/25 mr-4">{u.email}</p>
                                {u.ban_reason && u.status !== 'active' && (
                                    <p className="text-[10px] text-white/40 italic mr-4 mt-1">
                                        סיבה: {u.ban_reason}
                                        {u.ban_expires_at && ` | עד ${new Date(u.ban_expires_at).toLocaleDateString("he-IL")}`}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2 shrink-0">
                                {u.status !== 'active' && (
                                    <button
                                        onClick={() => release(u.id)}
                                        className="p-2.5 rounded-xl transition-all border text-xs font-cinzel font-black"
                                        style={{ background: "rgba(52,211,153,0.08)", color: "#34d399", borderColor: "rgba(52,211,153,0.2)" }}
                                        title="שחרר חסימה"
                                    >
                                        <UserCheck size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => openAction(u, 'cooling')}
                                    className="p-2.5 rounded-xl transition-all border"
                                    style={{ background: "rgba(96,165,250,0.08)", color: "#60a5fa", borderColor: "rgba(96,165,250,0.2)" }}
                                    title="חדר קירור"
                                >
                                    <Snowflake size={16} />
                                </button>
                                <button
                                    onClick={() => openAction(u, 'ghost')}
                                    className="p-2.5 rounded-xl transition-all border"
                                    style={{ background: "rgba(168,85,247,0.08)", color: "#a855f7", borderColor: "rgba(168,85,247,0.2)" }}
                                    title="שאדו באן (Ghost)"
                                >
                                    <div className="flex items-center justify-center rotate-12">🕯️</div>
                                </button>
                                <button
                                    onClick={() => openAction(u, 'banned')}
                                    className="p-2.5 rounded-xl transition-all border"
                                    style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}
                                    title="הרחקה קבועה"
                                >
                                    <ShieldX size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Action modal ── */}
            {actionUser && actionType && (
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
                    onClick={(e) => e.target === e.currentTarget && closeAction()}
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
                        {/* Close */}
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

                        {/* Header */}
                        <div style={{ marginBottom: "28px" }}>
                            <div style={{ fontSize: "28px", marginBottom: "12px" }}>
                                {actionType === 'cooling' ? "❄️" : "🔒"}
                            </div>
                            <h2 style={{
                                fontFamily: "'Cinzel', serif",
                                fontSize: "1.1rem",
                                fontWeight: 900,
                                color: actionType === 'cooling' ? "#60a5fa" : actionType === 'ghost' ? "#a855f7" : "#ef4444",
                                marginBottom: "4px",
                            }}>
                                {actionType === 'cooling' ? "חדר קירור" : actionType === 'ghost' ? "שאדו באן (Ghosting)" : "הרחקה קבועה"}
                            </h2>
                            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
                                {actionUser.full_name}
                            </p>
                        </div>

                        {/* Reason */}
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{
                                display: "block",
                                fontFamily: "'Cinzel', serif",
                                fontSize: "9px",
                                fontWeight: 900,
                                textTransform: "uppercase",
                                letterSpacing: "0.15em",
                                color: "rgba(255,255,255,0.35)",
                                marginBottom: "8px",
                            }}>
                                סיבת ההרחקה
                            </label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                rows={3}
                                placeholder="תאר את הסיבה להרחקה..."
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

                        {/* Days (cooling only) */}
                        {actionType === 'cooling' && (
                            <div style={{ marginBottom: "24px" }}>
                                <label style={{
                                    display: "block",
                                    fontFamily: "'Cinzel', serif",
                                    fontSize: "9px",
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.15em",
                                    color: "rgba(255,255,255,0.35)",
                                    marginBottom: "8px",
                                }}>
                                    משך (ימים)
                                </label>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    {["1", "3", "7", "14", "30"].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDays(d)}
                                            style={{
                                                padding: "6px 16px",
                                                borderRadius: "10px",
                                                border: `1px solid ${days === d ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.08)"}`,
                                                background: days === d ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.03)",
                                                color: days === d ? "#60a5fa" : "rgba(255,255,255,0.4)",
                                                fontFamily: "'Cinzel', serif",
                                                fontWeight: 700,
                                                fontSize: "12px",
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            {d}י
                                        </button>
                                    ))}
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={days}
                                        onChange={e => setDays(e.target.value)}
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

                        {/* Confirm */}
                        <button
                            onClick={applyAction}
                            style={{
                                width: "100%",
                                padding: "14px",
                                borderRadius: "14px",
                                border: "none",
                                background: actionType === 'cooling'
                                    ? "linear-gradient(135deg, #1d4ed8, #3b82f6)"
                                    : actionType === 'ghost'
                                    ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                                    : "linear-gradient(135deg, #991b1b, #ef4444)",
                                color: "#fff",
                                fontFamily: "'Cinzel', serif",
                                fontWeight: 900,
                                fontSize: "13px",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                cursor: "pointer",
                                boxShadow: actionType === 'cooling'
                                    ? "0 0 30px rgba(59,130,246,0.3)"
                                    : "0 0 30px rgba(239,68,68,0.3)",
                            }}
                        >
                            {actionType === 'cooling'
                                ? `שלח לחדר קירור — ${days} ימים`
                                : actionType === 'ghost'
                                ? "הפוך לרוח רפאים"
                                : "הרחק לצמיתות"}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
