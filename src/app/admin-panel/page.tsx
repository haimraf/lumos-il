"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    ShieldCheck, Search, Trophy, ChevronRight, Flag, CheckCircle, Radio,
    Trash2, Newspaper, FileText, Edit3, Globe, Megaphone, Image as ImageIcon,
    X, Eraser, AlertCircle, Clock, Zap, RotateCcw, Crown
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import Link from "next/link";
import dynamic from "next/dynamic";

const SunEditor = dynamic(() => import("suneditor-react"), { ssr: false });
import "suneditor/dist/css/suneditor.min.css";

import { useAuth } from "@/context/AuthContext";
import ModerationTab from "@/components/admin/ModerationTab";
/**
 * LUMOS IL - ADMIN PANEL V2.5 (The Ministry Expansion)
 * עדכונים: איפוס עונה, תיקון מענקים, והחשכה מלאה של SunEditor.
 */

export default function AdminPanel() {
    const router = useRouter();
    const supabase = createClient();
    const { sendOwl } = useOwlMail();
    const { profile, isLoading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [news, setNews] = useState<any[]>([]);
    const [onlineMembers, setOnlineMembers] = useState<any[]>([]);
    const [housePoints, setHousePoints] = useState<any>({});

    const [editingId, setEditingId] = useState<string | null>(null);
    const [newArticle, setNewArticle] = useState({
        title: "", content: "", author: "",
        meta_title: "", meta_description: "", image_url: ""
    });

    const [isPublishing, setIsPublishing] = useState(false);
    const [pointsToAdd, setPointsToAdd] = useState(0);
    const [galleonsToAdd, setGalleonsToAdd] = useState(0);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [broadcastMsg, setBroadcastMsg] = useState("");

    // --- שליפת נתונים ---
    const fetchData = useCallback(async () => {
        const { data: reportData } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
        setReports(reportData || []);

        const { data: newsData } = await supabase.from('news').select('*').order('created_at', { ascending: false });
        setNews(newsData || []);

        const { data: profilesData } = await supabase.from('profiles').select('house, points_contributed');
        const points: Record<string, number> = { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 };
        profilesData?.forEach((row: any) => {
            if (row.house && points[row.house] !== undefined) {
                points[row.house] += row.points_contributed || 0;
            }
        });
        setHousePoints(points);
    }, [supabase]);

    useEffect(() => {
        if (!authLoading) {
            if (!profile || profile.role !== 'מנהל') {
                router.push('/dashboard');
                return;
            }
            setNewArticle(prev => ({ ...prev, author: profile.full_name || "חיים" }));
            fetchData();
            setLoading(false);
        }

        const channel = supabase.channel('lumos_global_presence', { config: { presence: { key: 'wizard' } } });
        channel.on('presence', { event: 'sync' }, () => {
            setOnlineMembers(Object.values(channel.presenceState()).flat() as any[]);
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [router, supabase, fetchData, profile, authLoading]);

    // --- לוגיקת איפוס עונה ---
    const handleResetSeason = async () => {
        const confirmReset = confirm("⚠️ אזהרה: פעולה זו תאפס את כל נקודות הבתים ותכריז על מנצחת. להמשיך?");
        if (!confirmReset) return;

        setIsResetting(true);
        const { error } = await supabase.rpc('reset_house_cup');

        if (error) {
            sendOwl("שגיאה במשרד הקסמים", error.message, "error");
        } else {
            window.dispatchEvent(new CustomEvent('play-magic-ding'));
            sendOwl("העונה הסתיימה!", "הנקודות אופסו והגביע הוענק.", "magic");
            fetchData();
        }
        setIsResetting(false);
    };

    // --- לוגיקת חיפוש ומענקים ---
    const searchUsers = async () => {
        if (!searchQuery.trim()) return;
        const { data } = await supabase.from('profiles').select('*').ilike('full_name', `%${searchQuery}%`).limit(5);
        setUsers(data || []);
    };

    const handleUpdateReward = async () => {
        if (!selectedUser) return;
        setIsUpdating(true);

        // תיקון: הבטחת ערכים מספריים תקינים
        const pAdd = parseInt(pointsToAdd.toString()) || 0;
        const gAdd = parseInt(galleonsToAdd.toString()) || 0;

        const { error } = await supabase.rpc('admin_add_reward', {
            target_user_id: selectedUser.id,
            points_to_add: pAdd,
            galleons_to_add: gAdd
        });

        if (error) {
            sendOwl("תקלה בלחש", error.message, "error");
        } else {
            window.dispatchEvent(new CustomEvent('play-magic-ding'));
            sendOwl("המענק הועבר", `הדמות ${selectedUser.full_name} קיבלה את המשאבים.`, "success");
            setPointsToAdd(0);
            setGalleonsToAdd(0);
            setSelectedUser(null);
            fetchData();
        }
        setIsUpdating(false);
    };

    // --- ניהול כתבות (הנביא היומי) ---
    const startEdit = (item: any) => {
        setEditingId(item.id);
        setNewArticle({
            title: item.title || "",
            content: item.content || "",
            author: item.author || "הנהלת הטירה",
            meta_title: item.meta_title || "",
            meta_description: item.meta_description || "",
            image_url: item.image_url || ""
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveNews = async () => {
        if (!newArticle.title || !newArticle.content) {
            sendOwl("מידע חסר", "חובה למלא כותרת ותוכן.", "error");
            return;
        }
        setIsPublishing(true);
        const { error } = editingId
            ? await supabase.from('news').update(newArticle).eq('id', editingId)
            : await supabase.from('news').insert([newArticle]);

        if (!error) {
            window.dispatchEvent(new CustomEvent('play-magic-ding'));
            sendOwl(editingId ? "הכתבה עודכנה!" : "פורסם!", "השינויים נשמרו בהצלחה.", "success");
            setNewArticle(prev => ({ ...prev, title: "", content: "", image_url: "" }));
            setEditingId(null);
            fetchData();
        }
        setIsPublishing(false);
    };

    const handleDeleteNews = async (id: string) => {
        if (!confirm("למחוק את הכתבה?")) return;
        const { error } = await supabase.from('news').delete().eq('id', id);
        if (!error) { sendOwl("נמחק", "הכתבה נמחקה.", "success"); fetchData(); }
    };

    // --- ניהול דיווחים ---
    const handleDeleteContent = async (commentId: string, reportId: string) => {
        const { error } = await supabase.from('comments').delete().eq('id', commentId);
        if (!error) {
            await supabase.from('reports').delete().eq('id', reportId);
            sendOwl("נמחק", "התוכן הוסר והדיווח נסגר.", "success");
            fetchData();
        }
    };

    const handleDismissReport = async (reportId: string) => {
        const { error } = await supabase.from('reports').delete().eq('id', reportId);
        if (!error) { sendOwl("בוטל", "הדיווח נסגר ללא נקיטת צעדים.", "success"); fetchData(); }
    };

    const handleBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        await supabase.channel('lumos_global_presence').send({
            type: 'broadcast', event: 'ministry_announcement',
            payload: { message: broadcastMsg, from: "הנהלת הטירה" }
        });
        window.dispatchEvent(new CustomEvent('play-magic-ding'));
        sendOwl("שוגר!", "ההכרזה שולחה לכל המשתמשים המחוברים.", "magic");
        setBroadcastMsg("");
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-[#020617] text-white py-12 px-6 font-assistant" dir="rtl">
            <style>{`
                /* ✨ דריסה אגרסיבית של SunEditor - החשכה מוחלטת */
                .sun-editor { 
                    border: 1px solid rgba(245, 158, 11, 0.2) !important; 
                    background-color: #020617 !important; 
                    border-radius: 1.5rem !important; 
                }
                .sun-editor .se-container { background-color: #020617 !important; }
                .sun-editor .se-toolbar { background-color: #0f172a !important; border-bottom: 1px solid rgba(255,255,255,0.05) !important; outline: none !important; }
                .sun-editor .se-resizing-bar { background-color: #0f172a !important; border-top: 1px solid rgba(255,255,255,0.05) !important; }
                .sun-editor .se-wrapper .se-wrapper-inner { background-color: #020617 !important; }
                .sun-editor-editable { 
                    background-color: #020617 !important; 
                    color: white !important; 
                    font-family: 'Assistant', sans-serif !important; 
                    padding: 20px !important;
                }
                /* החשכת דרופדאונים ותפריטים בעורך */
                .sun-editor .se-list-layer { background-color: #1e293b !important; border: 1px solid #334155 !important; }
                .sun-editor .se-btn-list:hover { background-color: #334155 !important; }
                .sun-editor .se-btn-module-border { border-right: 1px solid rgba(255,255,255,0.05) !important; }
                .sun-editor .se-svg { fill: #f59e0b !important; }
                
                .glass-panel {
                    background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .season-reset-card {
                    background: radial-gradient(circle at top right, rgba(245, 158, 11, 0.15), transparent);
                    border: 1px solid rgba(245, 158, 11, 0.3);
                }
            `}</style>

            <div className="max-w-7xl mx-auto space-y-8">

                {/* --- SEASON RESET TOP PANEL --- */}
                <div className="season-reset-card p-8 rounded-[3rem] flex flex-col md:flex-row justify-between items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-5 text-right">
                        <div className="p-4 bg-amber-500/20 rounded-2xl text-amber-500">
                            <Zap size={40} className="animate-pulse" />
                        </div>
                        <div>
                            <h2 className="font-cinzel text-2xl font-black text-amber-500">אירוע סיום עונה</h2>
                            <p className="text-white/50 text-sm">איפוס נקודות הבתים, הענקת הגביע והכנת הטירה לעונה חדשה.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleResetSeason}
                        disabled={isResetting}
                        className="group relative overflow-hidden bg-amber-600 hover:bg-amber-500 text-black px-10 py-5 rounded-2xl font-cinzel font-black text-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            {isResetting ? 'מטיל לחש איפוס...' : 'הפעל סיום עונה'} <RotateCcw size={20} />
                        </span>
                    </button>
                </div>

                {/* House Cup Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'].map(h => (
                        <div key={h} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col items-center group hover:border-amber-500/30 transition-all">
                            <span className="text-[10px] uppercase opacity-40 font-cinzel tracking-widest mb-1">{h}</span>
                            <span className="text-3xl font-black text-amber-500 font-cinzel">{housePoints[h] || 0}</span>
                        </div>
                    ))}
                </div>

                <header className="flex justify-between items-center border-b border-white/10 pb-8">
                    <div className="flex items-center gap-4">
                        <ShieldCheck size={40} className="text-amber-500" />
                        <h1 className="font-cinzel text-4xl font-black text-amber-500 tracking-tighter">לשכת המנהל</h1>
                    </div>
                    <Link href="/dashboard" className="bg-white/5 hover:bg-white/10 px-6 py-3 rounded-full text-white/60 hover:text-white transition-all flex items-center gap-2 text-sm font-bold">
                        חזרה לטירה <ChevronRight size={16} />
                    </Link>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">

                        {/* Editor Section */}
                        <section className="glass-panel p-8 rounded-[3rem] space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-cinzel text-xl font-bold text-amber-400 flex items-center gap-3">
                                    <Newspaper size={28} /> {editingId ? 'עריכת כתבת נביא' : 'כתבה חדשה בנביא היומי'}
                                </h3>
                                {editingId && (
                                    <button onClick={() => { setEditingId(null); setNewArticle(prev => ({ ...prev, title: "", content: "", image_url: "" })); }} className="text-[10px] text-red-400 border border-red-500/20 uppercase font-black px-4 py-2 rounded-full hover:bg-red-500/10 transition-all">ביטול עריכה</button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 text-right">
                                    <label className="text-[10px] text-amber-500/80 mr-1 font-black uppercase tracking-widest">כותרת הכתבה</label>
                                    <input value={newArticle.title} onChange={(e) => setNewArticle(prev => ({ ...prev, title: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-amber-500 text-white font-bold" dir="rtl" />
                                </div>
                                <div className="space-y-2 text-right">
                                    <label className="text-[10px] text-amber-500/80 mr-1 font-black uppercase tracking-widest">תמונת נושא (URL)</label>
                                    <input value={newArticle.image_url} onChange={(e) => setNewArticle(prev => ({ ...prev, image_url: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-amber-500 text-amber-200/60 text-sm" dir="ltr" />
                                </div>
                            </div>

                            <div dir="ltr" className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                                <SunEditor
                                    setContents={newArticle.content}
                                    onChange={(content) => setNewArticle(prev => ({ ...prev, content }))}
                                    setOptions={{
                                        buttonList: [['undo', 'redo'], ['formatBlock', 'fontSize'], ['bold', 'underline', 'italic'], ['fontColor', 'hiliteColor'], ['align', 'list', 'link', 'image'], ['fullScreen', 'codeView']],
                                        rtl: true, width: '100%', height: 400
                                    } as any}
                                />
                            </div>

                            <button onClick={handleSaveNews} disabled={isPublishing} className="w-full bg-amber-600 py-6 rounded-[2rem] font-cinzel font-black text-xl shadow-xl hover:bg-amber-500 transition-all active:scale-95 disabled:opacity-50">
                                {isPublishing ? 'רוקח את הכתבה... ✨' : (editingId ? 'שמירת שינויים בנביא ✨' : 'פרסום בנביא היומי ✨')}
                            </button>
                        </section>

                        {/* --- Moderation Section (New!) --- */}
                        <ModerationTab sendOwl={sendOwl} />

                        {/* Reports Section */}
                        <section className="glass-panel p-8 rounded-[3rem] border-red-500/20 bg-red-500/[0.02] space-y-6">
                            <h3 className="font-cinzel text-xl font-bold text-red-500 flex items-center gap-3"><Flag size={28} /> דיווחי קהילה פעילים ({reports.length})</h3>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {reports.length === 0 ? (
                                    <div className="text-center opacity-30 py-12 flex flex-col items-center gap-3">
                                        <CheckCircle size={40} />
                                        <p className="italic font-crimson text-xl">השקט נשמר בין כותלי הטירה.</p>
                                    </div>
                                ) : (
                                    reports.map(report => (
                                        <div key={report.id} className="bg-white/5 border border-red-500/10 p-6 rounded-3xl flex justify-between items-center transition-all hover:bg-white/[0.07]">
                                            <div className="space-y-1 text-right">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[9px] bg-red-500/20 text-red-400 px-3 py-1 rounded-full uppercase font-black">{report.reason}</span>
                                                    <span className="text-[9px] text-white/30 uppercase tracking-tighter">ID: {report.target_id.slice(0, 8)}</span>
                                                </div>
                                                <p className="text-white/80 italic font-crimson text-lg leading-relaxed">"{report.content_preview}"</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleDeleteContent(report.target_id, report.id)} className="p-4 bg-red-600/20 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-lg" title="מחק תוכן"><Trash2 size={22} /></button>
                                                <button onClick={() => handleDismissReport(report.id)} className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all" title="סגור דיווח"><CheckCircle size={22} /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* News Archive */}
                        <section className="glass-panel p-8 rounded-[3rem] border-white/5 space-y-6">
                            <h3 className="font-cinzel text-lg font-bold text-white/30 flex items-center gap-3"><FileText size={20} /> ארכיון הנביא היומי</h3>
                            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {news.map(item => (
                                    <div key={item.id} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
                                        <h4 className="font-bold text-amber-200/80 text-right">{item.title}</h4>
                                        <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-all">
                                            <button onClick={() => startEdit(item)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={16} /></button>
                                            <button onClick={() => handleDeleteNews(item.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* --- Sidebar Tools --- */}
                    <div className="space-y-8">

                        {/* Real-time Presence */}
                        <section className="glass-panel p-6 rounded-[3rem] border-blue-500/20 space-y-4">
                            <h3 className="font-cinzel text-blue-400 flex items-center gap-2 text-sm uppercase tracking-widest"><Radio size={18} className="animate-pulse" /> נוכחים בטירה ({onlineMembers.length})</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                {onlineMembers.map((w, i) => (
                                    <div key={i} className="flex justify-between items-center text-[11px] p-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="font-bold flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                            {w.user_name}
                                        </span>
                                        <span className="opacity-40 uppercase font-cinzel text-[9px]">{w.house}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Character Rewards - FIXED */}
                        <section className="glass-panel p-6 rounded-[3rem] border-amber-500/20 space-y-4">
                            <h3 className="font-cinzel text-amber-500 flex items-center gap-2 text-sm uppercase tracking-widest"><Crown size={18} /> מענקי דמויות</h3>
                            <div className="flex gap-2">
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                                    placeholder="חיפוש שם דמות..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-amber-500/50 transition-all"
                                    dir="rtl"
                                />
                                <button onClick={searchUsers} className="bg-amber-600/20 text-amber-500 p-3 rounded-xl hover:bg-amber-600 hover:text-black transition-all border border-amber-500/10"><Search size={16} /></button>
                            </div>
                            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                {users.map(u => (
                                    <button key={u.id} onClick={() => setSelectedUser(u)} className={`w-full text-right p-3 text-[11px] rounded-xl transition-all border ${selectedUser?.id === u.id ? 'bg-amber-500/20 border-amber-500/40 text-amber-200' : 'hover:bg-white/5 border-transparent'}`}>
                                        {u.full_name} <span className="opacity-30 text-[9px] mr-2">({u.house})</span>
                                    </button>
                                ))}
                            </div>
                            {selectedUser && (
                                <div className="pt-2 space-y-4 animate-in slide-in-from-top-2 border-t border-white/5 mt-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-amber-500/40 block text-center uppercase font-black">נקודות בית</label>
                                            <input type="number" value={pointsToAdd} onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)} className="w-full bg-black/60 border border-amber-500/20 rounded-xl p-3 text-center font-cinzel font-black text-amber-500 outline-none focus:border-amber-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-amber-500/40 block text-center uppercase font-black">גליאונים</label>
                                            <input type="number" value={galleonsToAdd} onChange={(e) => setGalleonsToAdd(parseInt(e.target.value) || 0)} className="w-full bg-black/60 border border-amber-500/20 rounded-xl p-3 text-center font-cinzel font-black text-amber-500 outline-none focus:border-amber-500" />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleUpdateReward}
                                        disabled={isUpdating}
                                        className="w-full bg-amber-600 py-4 rounded-2xl text-black font-black text-xs uppercase shadow-lg hover:bg-amber-500 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isUpdating ? 'מעביר מענק...' : 'אישור ושליחת מענק ✨'}
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* Global Announcements */}
                        <section className="glass-panel p-6 rounded-[3rem] border-purple-500/20 space-y-4">
                            <h3 className="font-cinzel text-purple-400 flex items-center gap-2 text-sm uppercase tracking-widest"><Megaphone size={18} /> הכרזה גלובלית</h3>
                            <textarea
                                value={broadcastMsg}
                                onChange={(e) => setBroadcastMsg(e.target.value)}
                                placeholder="כתוב הודעה שתופיע לכל המשתמשים..."
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-purple-500 h-24 resize-none transition-all"
                                dir="rtl"
                            />
                            <button onClick={handleBroadcast} className="w-full bg-purple-600/20 text-purple-400 border border-purple-500/30 py-4 rounded-2xl font-black text-xs uppercase hover:bg-purple-600 hover:text-white transition-all shadow-md">שיגור ינשופי הכרזה</button>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}