"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Trash2, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";
import { useAuth } from "@/context/AuthContext";

export default function NotificationDropdown() {
    const { session } = useAuth();
    const [supabase] = useState(() => createClient());
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [roleColors, setRoleColors] = useState<Record<string, string>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);

    const userId = session?.user?.id ?? null;

    useEffect(() => {
        void getRoleColorFromDB(supabase).then(setRoleColors);
    }, [supabase]);

    const formatContent = (content: string, type: string) => {
        if (type === "quote") return content.replace("ציטוט שלך בדיון", "ציטט/ה אותך בדיון");
        if (type === "tag") return content.replace("תיוג שלך בדיון", "תייג/ה אותך בדיון");
        if (type === "duel_challenge") return "מאתגר אותך לקרב בזירה";
        return content;
    };

    const fetchNotifications = useCallback(async (uid: string) => {
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) {
            console.error("[NotificationDropdown] fetch failed:", error.message);
            return;
        }

        const notifs = data || [];
        const actorIds = [...new Set(notifs.map((notification) => notification.actor_id))].filter(Boolean);

        if (actorIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, house, role, user_groups(name, color)")
                .in("id", actorIds);

            if (profiles) {
                const profileMap = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
                notifs.forEach((notification) => {
                    notification.actor_profile = profileMap[notification.actor_id];
                });
            }
        }

        setNotifications(notifs);
        setUnreadCount(notifs.filter((notification) => !notification.is_read).length);
    }, [supabase]);

    useEffect(() => {
        if (!userId) return;

        queueMicrotask(() => {
            void fetchNotifications(userId);
        });
    }, [fetchNotifications, userId]);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`user-notifs-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                () => {
                    void fetchNotifications(userId);
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [fetchNotifications, supabase, userId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const deleteNotification = async (id: string) => {
        const { error } = await supabase.from("notifications").delete().eq("id", id);
        if (error) {
            console.error("[NotificationDropdown] delete failed:", error.message);
            return;
        }

        setNotifications((previous) => {
            const updated = previous.filter((notification) => notification.id !== id);
            setUnreadCount(updated.filter((notification) => !notification.is_read).length);
            return updated;
        });
    };

    const deleteAll = async () => {
        if (!userId) return;

        const { error } = await supabase.from("notifications").delete().eq("user_id", userId);
        if (error) {
            console.error("[NotificationDropdown] delete all failed:", error.message);
            return;
        }

        setNotifications([]);
        setUnreadCount(0);
    };

    const markAsRead = async (id: string) => {
        await supabase.from("notifications").update({ is_read: true }).eq("id", id);

        setNotifications((previous) => {
            const updated = previous.map((notification) =>
                notification.id === id ? { ...notification, is_read: true } : notification
            );
            setUnreadCount(updated.filter((notification) => !notification.is_read).length);
            return updated;
        });
    };

    const markAllAsReadInDB = async () => {
        if (!userId || unreadCount === 0) return;

        setUnreadCount(0);
        await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    };

    return (
        <div className="relative flex items-center justify-center" ref={dropdownRef}>
            <button
                onClick={() => {
                    if (!isOpen) {
                        setIsOpen(true);
                        void markAllAsReadInDB();
                    } else {
                        setIsOpen(false);
                    }
                }}
                aria-label={`התראות${unreadCount > 0 ? ` - ${unreadCount} לא נקראו` : ""}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
                className="p-2 text-white/40 hover:text-amber-400 relative group outline-none transition-all active:scale-90 flex items-center justify-center"
            >
                <Bell size={20} className={unreadCount > 0 ? "animate-bounce text-amber-500" : ""} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-gradient-to-br from-red-500 to-rose-700 text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-[0_0_12px_rgba(225,29,72,0.8)] border-[1.5px] border-[#0a0f1a] transform scale-100 animate-in zoom-in">
                        {unreadCount > 9 ? "+9" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] md:hidden" onClick={() => setIsOpen(false)} />

                    <div
                        className="fixed md:absolute top-[70px] md:top-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-[#0a0f1a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[1000] animate-in fade-in slide-in-from-top-2 duration-200"
                        dir="rtl"
                        role="dialog"
                        aria-label="התראות"
                        style={{ width: "90vw", maxWidth: "320px", minWidth: "300px" }}
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-2">
                            <h3 className="font-cinzel text-xs text-white uppercase tracking-widest font-black">התראות אחרונות</h3>
                            <div className="flex items-center gap-1">
                                {notifications.length > 0 && (
                                    <button
                                        onClick={deleteAll}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                        title="מחק את כל ההתראות"
                                    >
                                        <Trash2 size={11} /> מחק הכל
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="md:hidden text-white/40 hover:text-white p-1">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[60vh] md:max-h-[350px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`flex items-start gap-2 border-b border-white/[0.03] group ${!notification.is_read ? "bg-amber-500/[0.05]" : ""}`}
                                    >
                                        <Link
                                            href={notification.target_url}
                                            onClick={() => {
                                                if (!notification.is_read) {
                                                    void markAsRead(notification.id);
                                                }
                                                setIsOpen(false);
                                            }}
                                            className="flex items-start gap-3 p-4 flex-1 min-w-0 hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0 text-right">
                                                <p className="text-sm md:text-xs text-white/80 leading-relaxed">
                                                    {(() => {
                                                        const actorProfile = Array.isArray(notification.actor_profile)
                                                            ? notification.actor_profile[0]
                                                            : notification.actor_profile;
                                                        const nameToShow = actorProfile?.full_name || actorProfile?.username;
                                                        const profileColor =
                                                            actorProfile?.user_groups?.color ||
                                                            getRoleColor(actorProfile?.role, actorProfile?.house, roleColors);

                                                        if (!nameToShow) {
                                                            return <span>{formatContent(notification.content, notification.type)}</span>;
                                                        }

                                                        return (
                                                            <>
                                                                <span className="font-bold" style={{ color: profileColor || "#f59e0b" }}>
                                                                    {nameToShow}
                                                                </span>{" "}
                                                                {formatContent(notification.content?.replace(nameToShow, "").trim(), notification.type)}
                                                            </>
                                                        );
                                                    })()}
                                                </p>
                                                <span className="text-[10px] md:text-[9px] text-white/20 mt-1 block uppercase tracking-tighter">
                                                    {new Date(notification.created_at).toLocaleTimeString("he-IL", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                            {!notification.is_read && (
                                                <div className="w-2 h-2 bg-amber-500 rounded-full mt-1 shrink-0 shadow-[0_0_8px_#f59e0b]" />
                                            )}
                                        </Link>
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                void deleteNotification(notification.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-2 mt-2 ml-1 shrink-0 text-white/20 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10"
                                            title="מחק התראה"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center text-white/20 text-[10px] font-cinzel tracking-widest uppercase">
                                    אין מכתבים חדשים בנמצא
                                </div>
                            )}
                        </div>

                        <Link
                            href="/dashboard?tab=notifications"
                            onClick={() => setIsOpen(false)}
                            className="p-4 bg-white/5 text-center block text-[10px] font-black uppercase text-white/30 hover:text-white hover:bg-amber-500/10 transition-all rounded-b-2xl border-t border-white/5"
                        >
                            לכל ההתראות בטירה
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
