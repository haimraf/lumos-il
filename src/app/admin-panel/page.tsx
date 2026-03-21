"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    ShieldCheck, Search, Trophy, ChevronRight, Flag, CheckCircle, Radio,
    Trash2, Newspaper, FileText, Edit3, Globe, Megaphone, Image as ImageIcon,
    X, AlertCircle, Clock, Zap, RotateCcw, Crown, Users, Coins,
    TrendingUp, Activity, Eye, Bell, GraduationCap, Pencil, Save,
    UserCog, Shield, ChevronDown as ChevronDownIcon,
    Store, BookOpenCheck, MessageSquare, Lock, Pin, Plus, Hash
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import Link from "next/link";
import dynamic from "next/dynamic";

const SunEditor = dynamic(() => import("suneditor-react"), { ssr: false });
import "suneditor/dist/css/suneditor.min.css";

import { useAuth } from "@/context/AuthContext";
import ModerationTab from "@/components/admin/ModerationTab";
import { getYearFromProfile, getYearTitle } from "@/lib/yearSystem";

const HOUSE_CONFIG: Record<string, { color: string; accent: string; icon: string }> = {
    Gryffindor: { color: "text-red-400", accent: "rgba(220,38,38,0.15)", icon: "🦁" },
    Slytherin: { color: "text-emerald-400", accent: "rgba(5,150,105,0.15)", icon: "🐍" },
    Ravenclaw: { color: "text-blue-400", accent: "rgba(37,99,235,0.15)", icon: "🦅" },
    Hufflepuff: { color: "text-amber-400", accent: "rgba(251,191,36,0.15)", icon: "🦡" },
};

type AdminTab = "house-cup" | "prophet" | "moderation" | "year-system" | "users" | "forums" | "shop" | "exams";

const TAB_CONFIG: { id: AdminTab; label: string; icon: any; color: string }[] = [
    { id: "house-cup",    label: "גביע הבית",   icon: Trophy,        color: "text-amber-400"  },
    { id: "prophet",      label: "נביא היומי",  icon: Newspaper,     color: "text-blue-400"   },
    { id: "moderation",   label: "מודרציה",     icon: Flag,          color: "text-red-400"    },
    { id: "year-system",  label: "מערכת שנים",  icon: GraduationCap, color: "text-purple-400" },
    { id: "users",        label: "משתמשים",     icon: UserCog,       color: "text-teal-400"   },
    { id: "forums",       label: "פורומים",     icon: MessageSquare, color: "text-orange-400" },
    { id: "shop",         label: "חנות",        icon: Store,         color: "text-emerald-400"},
    { id: "exams",        label: "בחינות",      icon: BookOpenCheck, color: "text-violet-400" },
];

export default function AdminPanel() {
    const router = useRouter();
    const supabase = createClient();
    const { sendOwl } = useOwlMail();
    const { profile, isLoading: authLoading } = useAuth();

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
    const [onlineMembers, setOnlineMembers] = useState<any[]>([]);
    const [housePoints, setHousePoints] = useState<any>({});
    const [allProfiles, setAllProfiles] = useState<any[]>([]);

    // News editor
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newArticle, setNewArticle] = useState({
        title: "", content: "", author: "",
        meta_title: "", meta_description: "", image_url: ""
    });
    const [isPublishing, setIsPublishing] = useState(false);

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
    const [userFilter, setUserFilter] = useState<"all" | "מנהל" | "מנחה" | "משתמש">("all");
    const [editingRole, setEditingRole] = useState<{ id: string; role: string } | null>(null);
    const [isSavingRole, setIsSavingRole] = useState(false);

    // Forums management
    const [forums, setForums] = useState<any[]>([]);
    const [threads, setThreads] = useState<any[]>([]);
    const [threadSearch, setThreadSearch] = useState("");
    const [selectedForum, setSelectedForum] = useState<any>(null);

    // Shop management
    const [shopItems, setShopItems] = useState<any[]>([]);
    const [shopFilter, setShopFilter] = useState("all");
    const [editingItem, setEditingItem] = useState<any>(null);
    const [newItem, setNewItem] = useState({ name: "", description: "", price: 0, type: "wand", image_url: "", is_available: true });
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isSavingItem, setIsSavingItem] = useState(false);

    // Exams management
    const [examQuestions, setExamQuestions] = useState<any[]>([]);
    const [examFilter, setExamFilter] = useState<"owl" | "newt">("owl");
    const [editingQuestion, setEditingQuestion] = useState<any>(null);
    const [newQuestion, setNewQuestion] = useState({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "a", exam_type: "owl" });
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [isSavingQuestion, setIsSavingQuestion] = useState(false);

    /* ── Fetch ── */
    const fetchData = useCallback(async () => {
        const [{ data: reportData }, { data: newsData }, { data: profilesData },
               { data: forumsData }, { data: shopData }, { data: examData }] = await Promise.all([
            supabase.from('reports').select('*').order('created_at', { ascending: false }),
            supabase.from('news').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('*, post_count:forum_posts(count)').order('created_at', { ascending: true }),
            supabase.from('forums').select('*, thread_count:threads(count)').order('created_at', { ascending: true }),
            supabase.from('shop_items').select('*').order('created_at', { ascending: false }),
            supabase.from('exam_questions').select('*').order('created_at', { ascending: false }),
        ]);

        setReports(reportData || []);
        setNews(newsData || []);
        setForums(forumsData || []);
        setShopItems(shopData || []);
        setExamQuestions(examData || []);

        const points: Record<string, number> = { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 };
        profilesData?.forEach((row: any) => {
            if (row.house && points[row.house] !== undefined) points[row.house] += row.points_contributed || 0;
        });
        setHousePoints(points);
        setAllProfiles(profilesData || []);
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
        if (!authLoading) {
            if (!profile || profile.role !== 'מנהל') { router.push('/dashboard'); return; }
            setNewArticle(prev => ({ ...prev, author: profile.full_name || "הנהלה" }));
            fetchData();
            setLoading(false);
        }
        const channel = supabase.channel('lumos_global_presence', { config: { presence: { key: 'wizard' } } });
        channel.on('presence', { event: 'sync' }, () => {
            setOnlineMembers(Object.values(channel.presenceState()).flat() as any[]);
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [router, supabase, fetchData, profile, authLoading]);

    /* ── Search ── */
    const searchUsers = useCallback(async (q: string) => {
        if (!q.trim()) { setUsers([]); return; }
        setIsSearching(true);
        const { data } = await supabase.from('profiles').select('*').ilike('full_name', `%${q}%`).limit(6);
        setUsers(data || []);
        setIsSearching(false);
    }, [supabase]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => searchUsers(q), 300);
    };

    /* ── Season Reset ── */
    const handleResetSeason = async () => {
        if (!confirm("⚠️ אזהרה: פעולה זו תאפס את כל נקודות הבתים. להמשיך?")) return;
        setIsResetting(true);
        const { error } = await supabase.rpc('reset_house_cup');
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else {
            window.dispatchEvent(new CustomEvent('play-magic-ding'));
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
            window.dispatchEvent(new CustomEvent('play-magic-ding'));
            sendOwl("המענק הועבר", `${selectedUser.full_name} קיבל/ה את המשאבים.`, "success");
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

    const handleSaveNews = async () => {
        if (!newArticle.title || !newArticle.content) { sendOwl("מידע חסר", "חובה למלא כותרת ותוכן.", "error"); return; }
        setIsPublishing(true);
        const { error } = editingId
            ? await supabase.from('news').update(newArticle).eq('id', editingId)
            : await supabase.from('news').insert([newArticle]);
        if (!error) {
            window.dispatchEvent(new CustomEvent('play-magic-ding'));
            sendOwl(editingId ? "עודכן!" : "פורסם!", "השינויים נשמרו.", "success");
            setNewArticle(prev => ({ ...prev, title: "", content: "", image_url: "" }));
            setEditingId(null); fetchData();
        }
        setIsPublishing(false);
    };

    const handleDeleteNews = async (id: string) => { if (!confirm("למחוק?")) return; const { error } = await supabase.from('news').delete().eq('id', id); if (!error) { sendOwl("נמחק", "", "success"); fetchData(); } };
    const handleDeleteContent = async (cId: string, rId: string) => { const { error } = await supabase.from('comments').delete().eq('id', cId); if (!error) { await supabase.from('reports').delete().eq('id', rId); sendOwl("הוסר", "", "success"); fetchData(); } };
    const handleDismissReport = async (id: string) => { await supabase.from('reports').delete().eq('id', id); sendOwl("בוטל", "", "success"); fetchData(); };

    /* ── Broadcast ── */
    const handleBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        await supabase.channel('lumos_global_presence').send({ type: 'broadcast', event: 'ministry_announcement', payload: { message: broadcastMsg, from: "הנהלת הטירה" } });
        window.dispatchEvent(new CustomEvent('play-magic-ding'));
        sendOwl("שוגר!", "ההכרזה נשלחה.", "magic");
        setBroadcastMsg("");
    };

    /* ── Year system ── */
    const handleSaveYear = async () => {
        if (!editingYear) return;
        const { id, year } = editingYear;
        setIsSavingYear(true);
        const { error } = await supabase.from('profiles').update({ year }).eq('id', id);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else {
            sendOwl("עודכן", "שנת המשתמש עודכנה.", "success");
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
            sendOwl("עודכן", `תפקיד המשתמש שונה ל-${role}.`, "success");
            setAllProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p));
            setEditingRole(null);
        }
        setIsSavingRole(false);
    };

    const handleToggleBan = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
        const label = newStatus === 'banned' ? 'חסום' : 'פעיל';
        if (newStatus === 'banned' && !confirm(`לחסום משתמש זה?`)) return;
        const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else {
            sendOwl("עודכן", `סטטוס המשתמש שונה ל${label}.`, "success");
            setAllProfiles(prev => prev.map(p => p.id === userId ? { ...p, status: newStatus } : p));
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
        const { error } = await supabase.from('forums').delete().eq('id', forumId);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else { sendOwl("נמחק", "הפורום הוסר.", "success"); setForums(prev => prev.filter(f => f.id !== forumId)); setSelectedForum(null); setThreads([]); }
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
            setNewItem({ name: "", description: "", price: 0, type: "wand", image_url: "", is_available: true });
            fetchData();
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
        const { error } = await supabase.from('shop_items').update({ is_available: !item.is_available }).eq('id', item.id);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else { setShopItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i)); }
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
            fetchData();
        }
        setIsSavingQuestion(false);
    };
    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("למחוק שאלה זו?")) return;
        const { error } = await supabase.from('exam_questions').delete().eq('id', id);
        if (error) { sendOwl("שגיאה", error.message, "error"); }
        else { sendOwl("נמחק", "", "success"); setExamQuestions(prev => prev.filter(q => q.id !== id)); }
    };

    if (loading) return null;

    const maxPoints = Math.max(...Object.values(housePoints).map(Number), 1);

    // Year distribution
    const yearDist = [1, 2, 3, 4, 5, 6, 7].map(y => ({
        year: y,
        title: getYearTitle(y),
        count: allProfiles.filter(p => getYearFromProfile(p) === y).length,
    }));
    const maxYearCount = Math.max(...yearDist.map(d => d.count), 1);

    return (
        <div className="min-h-screen bg-[#020617] text-white py-12 px-4 md:px-6 font-assistant" dir="rtl">
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
                .admin-card { background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06); }
                .admin-card:hover { border-color: rgba(255,255,255,0.1); }
                .house-bar { transition: width 1s cubic-bezier(0.4,0,0.2,1); }
                .search-result-item { transition: all 0.15s ease; }
                .search-result-item:hover { background: rgba(245,158,11,0.08); }
                .search-result-item.selected { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); }
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

                {/* ── Tab Navigation ── */}
                <div className="flex gap-2 border-b border-white/[0.06] pb-0">
                    {TAB_CONFIG.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-cinzel text-xs font-black uppercase tracking-wide transition-all border-b-2
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

                        {/* ── TAB 1: גביע הבית ── */}
                        {activeTab === "house-cup" && (
                            <>
                                {/* House Cup */}
                                <section className="admin-card rounded-2xl p-6 space-y-4">
                                    <h3 className="font-cinzel text-xs font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                                        <Trophy size={14} className="text-amber-500" /> גביע הבית — נקודות
                                    </h3>
                                    <div className="space-y-3">
                                        {['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'].map(h => {
                                            const cfg = HOUSE_CONFIG[h];
                                            const pts = housePoints[h] || 0;
                                            const pct = Math.round((pts / maxPoints) * 100);
                                            return (
                                                <div key={h} className="flex items-center gap-4">
                                                    <span className="text-lg shrink-0">{cfg.icon}</span>
                                                    <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                                                        <div className={`house-bar h-full rounded-full ${cfg.color.replace('text-', 'bg-')}`}
                                                            style={{ width: `${pct}%`, opacity: 0.7 }} />
                                                    </div>
                                                    <span className={`font-cinzel font-black text-sm w-14 text-left ${cfg.color}`}>{pts.toLocaleString()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* Online Members */}
                                <section className="admin-card rounded-2xl p-5 space-y-4">
                                    <h3 className="font-cinzel text-xs font-black text-blue-400 flex items-center gap-2 uppercase tracking-widest">
                                        <Activity size={13} className="animate-pulse" />
                                        נוכחים עכשיו ({onlineMembers.length})
                                    </h3>
                                    <div className="space-y-2 max-h-52 overflow-y-auto">
                                        {onlineMembers.length === 0 ? (
                                            <p className="text-white/15 text-xs text-center py-6 font-cinzel">אין משתמשים מחוברים</p>
                                        ) : onlineMembers.map((w, i) => {
                                            const cfg = w.house ? HOUSE_CONFIG[w.house] : null;
                                            return (
                                                <div key={i} className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        <span className="text-xs font-bold text-white/70">{w.user_name}</span>
                                                    </div>
                                                    <span className={`text-[9px] font-cinzel uppercase ${cfg?.color || 'text-white/20'}`}>{w.house}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* Rewards */}
                                <section className="admin-card rounded-2xl p-5 space-y-4">
                                    <h3 className="font-cinzel text-xs font-black text-amber-500 flex items-center gap-2 uppercase tracking-widest">
                                        <Crown size={13} /> מענקי דמויות
                                    </h3>
                                    <div className="relative">
                                        <input
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            onKeyDown={(e) => e.key === 'Enter' && searchUsers(searchQuery)}
                                            placeholder="הקלד שם דמות..."
                                            className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-amber-500/30 rounded-xl p-3 text-sm outline-none transition-all pr-10"
                                            dir="rtl"
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                            {isSearching
                                                ? <div className="w-3.5 h-3.5 border border-amber-500/40 border-t-amber-500 rounded-full animate-spin" />
                                                : <Search size={13} className="text-white/20" />
                                            }
                                        </div>
                                    </div>
                                    {users.length > 0 && (
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                            {users.map(u => {
                                                const cfg = u.house ? HOUSE_CONFIG[u.house] : null;
                                                return (
                                                    <button key={u.id} onClick={() => setSelectedUser(u)}
                                                        className={`search-result-item w-full flex items-center justify-between p-3 rounded-xl border text-right transition-all
                                                            ${selectedUser?.id === u.id ? 'selected border-amber-500/30' : 'border-transparent hover:border-white/[0.06]'}`}>
                                                        <span className="text-sm font-bold text-white/80">{u.full_name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-cinzel uppercase ${cfg?.color || 'text-white/20'}`}>{u.house}</span>
                                                            <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-sm shrink-0"
                                                                style={{ background: cfg ? cfg.accent : "rgba(255,255,255,0.05)" }}>
                                                                {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : cfg?.icon || "🧙"}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {selectedUser && (
                                        <div className="space-y-4 pt-3 border-t border-white/[0.05] animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-white/40">מענק עבור:</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-amber-400 font-cinzel">{selectedUser.full_name}</span>
                                                    <button onClick={() => { setSelectedUser(null); setSearchQuery(""); setUsers([]); }} className="text-white/20 hover:text-white/60 transition-colors">
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] text-white/25 block text-center font-black uppercase tracking-wide">נקודות</label>
                                                    <input type="number" value={pointsToAdd} onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)}
                                                        className="w-full bg-black/40 border border-amber-500/15 focus:border-amber-500/40 rounded-xl p-3 text-center font-cinzel font-black text-amber-400 outline-none transition-all" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] text-white/25 block text-center font-black uppercase tracking-wide">גליאונים</label>
                                                    <input type="number" value={galleonsToAdd} onChange={(e) => setGalleonsToAdd(parseInt(e.target.value) || 0)}
                                                        className="w-full bg-black/40 border border-amber-500/15 focus:border-amber-500/40 rounded-xl p-3 text-center font-cinzel font-black text-amber-400 outline-none transition-all" />
                                                </div>
                                            </div>
                                            <button onClick={handleUpdateReward} disabled={isUpdating}
                                                className="w-full bg-amber-600 hover:bg-amber-500 py-3.5 rounded-xl text-black font-black text-xs uppercase tracking-widest font-cinzel transition-all active:scale-[0.99] disabled:opacity-40">
                                                {isUpdating ? 'מעביר...' : 'שליחת מענק ✨'}
                                            </button>
                                        </div>
                                    )}
                                </section>
                            </>
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
                                                        <p className="text-white/60 text-sm italic font-crimson mt-1.5 truncate">"{r.content_preview}"</p>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <button onClick={() => handleDeleteContent(r.target_id, r.id)} className="p-2.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                                                        <button onClick={() => handleDismissReport(r.id)} className="p-2.5 bg-white/5 text-white/40 rounded-lg hover:bg-white/10 transition-all"><CheckCircle size={14} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <ModerationTab sendOwl={sendOwl} />
                            </>
                        )}

                        {/* ── TAB 4: מערכת שנים ── */}
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
                                        <Users size={13} /> כל המשתמשים ({allProfiles.length})
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
                                                                        className="bg-purple-900/30 border border-purple-500/30 rounded-lg px-2 py-1 text-purple-300 font-cinzel text-xs outline-none"
                                                                    >
                                                                        {[1,2,3,4,5,6,7].map(y => (
                                                                            <option key={y} value={y}>שנה {y}</option>
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

                        {/* ── TAB 5: ניהול משתמשים ── */}
                        {activeTab === "users" && (() => {
                            const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
                                "מנהל":   { label: "מנהל",   color: "text-amber-400",  bg: "bg-amber-500/15 border-amber-500/25" },
                                "מנחה":   { label: "מנחה",   color: "text-teal-400",   bg: "bg-teal-500/15 border-teal-500/25"   },
                                "משתמש":  { label: "משתמש",  color: "text-white/40",   bg: "bg-white/5 border-white/10"           },
                            };
                            const filteredUsers = allProfiles
                                .filter(p => userFilter === "all" || p.role === userFilter)
                                .filter(p => !userSearch || p.full_name?.toLowerCase().includes(userSearch.toLowerCase()));

                            const roleCounts = {
                                מנהל: allProfiles.filter(p => p.role === "מנהל").length,
                                מנחה: allProfiles.filter(p => p.role === "מנחה").length,
                                משתמש: allProfiles.filter(p => !p.role || p.role === "משתמש").length,
                            };

                            return (
                                <>
                                    {/* Stats row */}
                                    <section className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: "מנהלים", count: roleCounts.מנהל, color: "text-amber-400", icon: "👑" },
                                            { label: "מנחים",  count: roleCounts.מנחה,  color: "text-teal-400",  icon: "🛡️" },
                                            { label: "משתמשים", count: roleCounts.משתמש, color: "text-white/50", icon: "🧙" },
                                        ].map(r => (
                                            <div key={r.label} className="admin-card rounded-2xl p-4 text-center space-y-1">
                                                <div className="text-2xl">{r.icon}</div>
                                                <div className={`font-cinzel font-black text-xl ${r.color}`}>{r.count}</div>
                                                <div className="font-cinzel text-[9px] text-white/25 uppercase tracking-widest">{r.label}</div>
                                            </div>
                                        ))}
                                    </section>

                                    {/* Search + filter */}
                                    <section className="admin-card rounded-2xl p-5 space-y-4">
                                        <h3 className="font-cinzel text-xs font-black text-teal-400 flex items-center gap-2 uppercase tracking-widest">
                                            <UserCog size={13} /> ניהול משתמשים ותפקידים
                                        </h3>
                                        <div className="flex gap-3 flex-wrap">
                                            <div className="relative flex-1 min-w-[160px]">
                                                <input
                                                    value={userSearch}
                                                    onChange={e => setUserSearch(e.target.value)}
                                                    placeholder="חיפוש לפי שם..."
                                                    className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-teal-500/30 rounded-xl p-3 pr-10 text-sm outline-none transition-all"
                                                    dir="rtl"
                                                />
                                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                                            </div>
                                            <div className="flex gap-1">
                                                {(["all", "מנהל", "מנחה", "משתמש"] as const).map(f => (
                                                    <button key={f}
                                                        onClick={() => setUserFilter(f)}
                                                        className={`px-3 py-2 rounded-xl font-cinzel text-[10px] uppercase tracking-wide transition-all border
                                                            ${userFilter === f
                                                                ? 'bg-teal-500/20 border-teal-500/30 text-teal-300'
                                                                : 'bg-white/[0.02] border-white/[0.05] text-white/30 hover:text-white/60'
                                                            }`}>
                                                        {f === "all" ? "הכל" : f}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* User list */}
                                        <div className="space-y-2 max-h-[480px] overflow-y-auto">
                                            {filteredUsers.length === 0 && (
                                                <p className="text-center text-white/20 font-cinzel text-xs py-8">לא נמצאו משתמשים</p>
                                            )}
                                            {filteredUsers.map(p => {
                                                const cfg = p.house ? HOUSE_CONFIG[p.house] : null;
                                                const roleCfg = ROLE_CONFIG[p.role] || ROLE_CONFIG["משתמש"];
                                                const isEditingThisRole = editingRole?.id === p.id;
                                                const isBanned = p.status === 'banned';
                                                return (
                                                    <div key={p.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all">
                                                        {/* Avatar */}
                                                        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-base"
                                                            style={{ background: cfg ? cfg.accent : "rgba(255,255,255,0.05)" }}>
                                                            {p.avatar_url
                                                                ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                : cfg?.icon || "🧙"
                                                            }
                                                        </div>

                                                        {/* Name + house */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-sm text-white/80 truncate">{p.full_name || "—"}</span>
                                                                {isBanned && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/20 text-red-400 font-cinzel text-[8px] uppercase">חסום</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`font-cinzel text-[9px] uppercase ${cfg?.color || 'text-white/20'}`}>{p.house || "—"}</span>
                                                                <span className="text-white/10 text-[8px]">·</span>
                                                                <span className="text-white/20 text-[9px] font-cinzel">{p.points || 0} נק׳</span>
                                                            </div>
                                                        </div>

                                                        {/* Role badge / editor */}
                                                        <div className="shrink-0">
                                                            {isEditingThisRole ? (
                                                                <div className="flex items-center gap-1">
                                                                    <select
                                                                        value={editingRole?.role}
                                                                        onChange={e => setEditingRole({ id: p.id, role: e.target.value })}
                                                                        className="bg-teal-900/30 border border-teal-500/30 rounded-lg px-2 py-1 text-teal-300 font-cinzel text-xs outline-none"
                                                                    >
                                                                        <option value="משתמש">משתמש</option>
                                                                        <option value="מנחה">מנחה</option>
                                                                        <option value="מנהל">מנהל</option>
                                                                    </select>
                                                                    <button onClick={handleSaveRole} disabled={isSavingRole}
                                                                        className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-40">
                                                                        <Save size={11} />
                                                                    </button>
                                                                    <button onClick={() => setEditingRole(null)}
                                                                        className="p-1.5 bg-white/5 text-white/30 rounded-lg hover:bg-white/10 transition-all">
                                                                        <X size={11} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-cinzel uppercase tracking-wide ${roleCfg.bg} ${roleCfg.color}`}>
                                                                        {roleCfg.label}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => setEditingRole({ id: p.id, role: p.role || "משתמש" })}
                                                                        title="שנה תפקיד"
                                                                        className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg hover:bg-teal-500 hover:text-white transition-all">
                                                                        <Pencil size={11} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleToggleBan(p.id, p.status || 'active')}
                                                                        title={isBanned ? "בטל חסימה" : "חסום משתמש"}
                                                                        className={`p-1.5 rounded-lg transition-all ${isBanned
                                                                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                                            : 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'
                                                                        }`}>
                                                                        <Shield size={11} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                </>
                            );
                        })()}

                        {/* ── TAB 6: פורומים ── */}
                        {activeTab === "forums" && (
                            <>
                                {/* Forums list */}
                                <section className="admin-card rounded-2xl p-5 space-y-3">
                                    <h3 className="font-cinzel text-xs font-black text-orange-400 flex items-center gap-2 uppercase tracking-widest">
                                        <MessageSquare size={13} /> קטגוריות פורומים ({forums.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {forums.map(f => {
                                            const threadCount = Array.isArray(f.thread_count) ? f.thread_count[0]?.count ?? 0 : f.thread_count ?? 0;
                                            return (
                                                <div key={f.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
                                                    ${selectedForum?.id === f.id ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/[0.02] border-white/[0.05] hover:border-white/10'}`}
                                                    onClick={() => { setSelectedForum(f); fetchThreads(f.id); setThreadSearch(""); }}>
                                                    <span className="text-xl shrink-0">{f.icon || "💬"}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-cinzel text-xs font-black text-white/80 truncate">{f.name}</p>
                                                        <p className="text-[10px] text-white/25">/{f.slug} · {threadCount} שרשורים</p>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteForum(f.id); }}
                                                        className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* Threads management */}
                                {selectedForum && (
                                    <section className="admin-card rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-cinzel text-xs font-black text-orange-400 flex items-center gap-2 uppercase tracking-widest">
                                                <Hash size={13} /> שרשורים — {selectedForum.name}
                                            </h3>
                                            <button onClick={() => { setSelectedForum(null); setThreads([]); }}
                                                className="text-white/20 hover:text-white/50 transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input value={threadSearch} onChange={e => setThreadSearch(e.target.value)}
                                                placeholder="חיפוש שרשור..." dir="rtl"
                                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 pr-10 text-sm outline-none focus:border-orange-500/30 transition-all" />
                                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                                        </div>
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                            {threads
                                                .filter(t => !threadSearch || t.title?.toLowerCase().includes(threadSearch.toLowerCase()))
                                                .map(t => {
                                                    const postCount = Array.isArray(t.post_count) ? t.post_count[0]?.count ?? 0 : t.post_count ?? 0;
                                                    return (
                                                        <div key={t.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    {t.is_pinned && <span className="text-amber-400 text-[8px]">📌</span>}
                                                                    {t.is_locked && <span className="text-red-400 text-[8px]">🔒</span>}
                                                                    <span className="font-bold text-xs text-white/75 truncate">{t.title}</span>
                                                                </div>
                                                                <p className="text-[10px] text-white/25 mt-0.5">{t.profiles?.full_name || "—"} · {postCount} תגובות</p>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button onClick={() => handlePinThread(t)} title={t.is_pinned ? "בטל עיגון" : "עגן שרשור"}
                                                                    className={`p-1.5 rounded-lg transition-all text-xs ${t.is_pinned ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/30 hover:text-amber-400'}`}>
                                                                    <Pin size={11} />
                                                                </button>
                                                                <button onClick={() => handleLockThread(t)} title={t.is_locked ? "פתח" : "נעל"}
                                                                    className={`p-1.5 rounded-lg transition-all ${t.is_locked ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/30 hover:text-red-400'}`}>
                                                                    <Lock size={11} />
                                                                </button>
                                                                <button onClick={() => handleDeleteThread(t.id)}
                                                                    className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                                                    <Trash2 size={11} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            {threads.length === 0 && <p className="text-center text-white/20 font-cinzel text-xs py-6">אין שרשורים בפורום זה</p>}
                                        </div>
                                    </section>
                                )}
                            </>
                        )}

                        {/* ── TAB 7: חנות ── */}
                        {activeTab === "shop" && (() => {
                            const itemTypes = ["all", "wand", "robe", "potion", "companion", "card", "travel"];
                            const typeLabels: Record<string, string> = { wand: "שרביט", robe: "גלימה", potion: "קסם", companion: "חבר", card: "כרטיס", travel: "נסיעה" };
                            const filtered = shopItems.filter(i => shopFilter === "all" || i.type === shopFilter);
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
                                            { label: "זמינים", value: shopItems.filter(i => i.is_available).length, color: "text-green-400" },
                                            { label: "לא זמינים", value: shopItems.filter(i => !i.is_available).length, color: "text-red-400" },
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
                                                    <label className="text-[9px] font-cinzel text-white/30 uppercase tracking-wider">סוג</label>
                                                    <select value={formData.type || "wand"} onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                        className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-emerald-500/30 rounded-xl p-2.5 text-sm outline-none">
                                                        {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-[9px] font-cinzel text-white/30 uppercase tracking-wider">תיאור</label>
                                                    <textarea value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                        className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-emerald-500/30 rounded-xl p-2.5 text-sm outline-none h-16 resize-none" dir="rtl" />
                                                </div>
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
                                            <button onClick={() => { setIsAddingItem(true); setEditingItem(null); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-xl font-cinzel text-[10px] hover:bg-emerald-600 hover:text-white transition-all">
                                                <Plus size={11} /> הוסף פריט
                                            </button>
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
                                                    {item.image_url && <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-white/5" />}
                                                    {!item.image_url && <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg shrink-0">🛒</div>}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm text-white/80 truncate">{item.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-amber-400 font-cinzel">{item.price} 🪙</span>
                                                            <span className="text-[9px] text-white/25 font-cinzel uppercase">{typeLabels[item.type] || item.type}</span>
                                                            {!item.is_available && <span className="text-[8px] text-red-400 font-cinzel">לא זמין</span>}
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
                                                        className="w-full bg-white/[0.03] border border-white/[0.06] focus:border-violet-500/30 rounded-xl p-2.5 text-sm outline-none">
                                                        {["a", "b", "c", "d"].map(o => <option key={o} value={o}>אפשרות {o.toUpperCase()}</option>)}
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
                    </div>

                    {/* ── RIGHT SIDEBAR — Broadcast (קבועה בכל טאב) ── */}
                    <div className="space-y-6">
                        <section className="admin-card rounded-2xl p-5 space-y-4">
                            <h3 className="font-cinzel text-xs font-black text-purple-400 flex items-center gap-2 uppercase tracking-widest">
                                <Megaphone size={13} /> הכרזה גלובלית
                            </h3>
                            <textarea
                                value={broadcastMsg}
                                onChange={(e) => setBroadcastMsg(e.target.value)}
                                placeholder="הודעה לכל המשתמשים המחוברים..."
                                className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-purple-500/30 rounded-xl p-3.5 text-sm outline-none h-24 resize-none transition-all"
                                dir="rtl"
                            />
                            <button onClick={handleBroadcast}
                                className="w-full bg-purple-600/15 text-purple-400 border border-purple-500/20 hover:bg-purple-600 hover:text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest font-cinzel transition-all">
                                שיגור ✨
                            </button>
                        </section>

                        {/* Stats summary */}
                        <section className="admin-card rounded-2xl p-5 space-y-3">
                            <h3 className="font-cinzel text-xs font-black text-white/20 uppercase tracking-widest">סטטיסטיקות</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "משתמשים", value: allProfiles.length, color: "text-white/60" },
                                    { label: "מחוברים", value: onlineMembers.length, color: "text-emerald-400" },
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
