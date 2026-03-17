"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    ShieldCheck, Search, Trophy, ChevronRight, Flag, CheckCircle, Radio,
    Trash2, Newspaper, FileText, Edit3, Globe, Megaphone, Image as ImageIcon, X, Eraser, AlertCircle
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import Link from "next/link";
import dynamic from "next/dynamic";

const SunEditor = dynamic(() => import("suneditor-react"), { ssr: false });
import "suneditor/dist/css/suneditor.min.css";

export default function AdminPanel() {
    const router = useRouter();
    const supabase = createClient();
    const { sendOwl } = useOwlMail();

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [news, setNews] = useState<any[]>([]);
    const [onlineWizards, setOnlineWizards] = useState<any[]>([]);
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
    const [broadcastMsg, setBroadcastMsg] = useState("");

    const fetchData = useCallback(async () => {
        // משיכת דיווחים
        const { data: reportData } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
        setReports(reportData || []);

        const { data: newsData } = await supabase.from('news').select('*').order('created_at', { ascending: false });
        setNews(newsData || []);

        const { data: pointsData } = await supabase.from('profiles').select('house, points_contributed');
        const sums = pointsData?.reduce((acc: any, curr: any) => {
            if (curr.house && curr.house !== 'Unsorted') {
                acc[curr.house] = (acc[curr.house] || 0) + (curr.points_contributed || 0);
            }
            return acc;
        }, {});
        setHousePoints(sums || {});
    }, [supabase]);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/'); return; }
            const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', session.user.id).single();
            if (profile?.role !== 'מנהל') { router.push('/dashboard'); return; }
            setNewArticle(prev => ({ ...prev, author: profile.full_name || "חיים" }));
            await fetchData();
            setLoading(false);
        };
        checkAdmin();

        const channel = supabase.channel('lumos_global_presence', { config: { presence: { key: 'wizard' } } });
        channel.on('presence', { event: 'sync' }, () => {
            setOnlineWizards(Object.values(channel.presenceState()).flat() as any[]);
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [router, supabase, fetchData]);

    const startEdit = (item: any) => {
        setEditingId(item.id);
        setNewArticle({
            title: item.title || "",
            content: item.content || "",
            author: item.author || "חיים",
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
            sendOwl(editingId ? "הכתבה עודכנה!" : "פורסם!", "השינויים נשמרו בהצלחה.", "success");
            setNewArticle(prev => ({ title: "", content: "", author: prev.author, meta_title: "", meta_description: "", image_url: "" }));
            setEditingId(null);
            fetchData();
        }
        setIsPublishing(false);
    };

    const handleBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        await supabase.channel('lumos_global_presence').send({ type: 'broadcast', event: 'ministry_announcement', payload: { message: broadcastMsg, from: "משרד הקסמים" } });
        sendOwl("שוגר!", "ההכרזה באוויר.", "magic");
        setBroadcastMsg("");
    };

    const searchUsers = async () => {
        const { data } = await supabase.from('profiles').select('*').ilike('full_name', `%${searchQuery}%`).limit(5);
        setUsers(data || []);
    };

    const handleUpdateReward = async () => {
        if (!selectedUser) return;
        setIsUpdating(true);
        const { error } = await supabase.rpc('admin_add_reward', { target_user_id: selectedUser.id, points_to_add: pointsToAdd, galleons_to_add: galleonsToAdd });
        if (!error) { sendOwl("הצלחה", "המענק הועבר.", "success"); setPointsToAdd(0); setGalleonsToAdd(0); setSelectedUser(null); fetchData(); }
        setIsUpdating(false);
    };

    const handleDeleteContent = async (commentId: string, reportId: string) => {
        if (!confirm("למחוק את התוכן הפוגעני?")) return;
        const { error } = await supabase.from('comments').delete().eq('id', commentId);
        if (!error) {
            await supabase.from('reports').delete().eq('id', reportId);
            sendOwl("נמחק", "התוכן הוסר והדיווח נסגר.", "success");
            fetchData();
        }
    };

    const handleDismissReport = async (reportId: string) => {
        const { error } = await supabase.from('reports').delete().eq('id', reportId);
        if (!error) {
            sendOwl("בוטל", "הדיווח בוטל ללא מחיקת תוכן.", "success");
            fetchData();
        }
    }

    if (loading) return null;

    return (
        <div className="min-h-screen bg-[#020617] text-white py-12 px-6 font-assistant" dir="rtl">
            <style>{`
                .sun-editor { border: 1px solid rgba(245, 158, 11, 0.3) !important; background-color: #0f172a !important; border-radius: 1rem !important; }
                .sun-editor .se-toolbar { background-color: #1e293b !important; }
                .sun-editor .se-wrapper .se-wrapper-inner { min-height: 400px; background-color: #020617 !important; color: white !important; }
                .sun-editor-editable { color: white !important; font-family: 'Crimson Text', serif !important; font-size: 1.3rem !important; }
                .sun-editor .se-svg { fill: #f59e0b !important; }
            `}</style>

            <div className="max-w-7xl mx-auto space-y-10">
                {/* House Cup */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'].map(h => (
                        <div key={h} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center">
                            <span className="text-[10px] uppercase opacity-40 font-cinzel">{h}</span>
                            <span className="text-2xl font-black text-amber-500">{housePoints[h] || 0}</span>
                        </div>
                    ))}
                </div>

                <header className="flex justify-between items-center border-b border-white/10 pb-8">
                    <h1 className="font-cinzel text-4xl font-black text-amber-500">חדר המנהלים</h1>
                    <Link href="/dashboard" className="text-white/40 hover:text-white flex items-center gap-2">חזרה לטירה <ChevronRight size={16} /></Link>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* סקשן כתיבת כתבה */}
                        <section className="glass-panel p-8 rounded-[2.5rem] border-2 border-white/10 bg-white/[0.02] space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-cinzel text-xl font-bold text-amber-400 flex items-center gap-3">
                                    <Newspaper size={28} /> {editingId ? 'עריכת כתבה' : 'כתיבת כתבה חדשה'}
                                </h3>
                                {editingId && (
                                    <button onClick={() => { setEditingId(null); setNewArticle(prev => ({ ...prev, title: "", content: "", image_url: "" })); }} className="text-xs text-red-500 font-bold hover:underline bg-red-500/10 px-3 py-1 rounded-full">ביטול עריכה</button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs text-amber-500/80 mr-1 font-bold uppercase tracking-widest">כותרת הכתבה</label>
                                    <input
                                        value={newArticle.title || ""}
                                        onChange={(e) => setNewArticle(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="הכותרת שתופיע בנביא היומי..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-amber-500 text-xl font-bold text-white shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-amber-500/80 mr-1 font-bold uppercase tracking-widest">תמונת נושא (URL)</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={newArticle.image_url || ""}
                                            onChange={(e) => setNewArticle(prev => ({ ...prev, image_url: e.target.value }))}
                                            placeholder="https://..."
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-amber-500 text-amber-200 text-sm"
                                        />
                                        {newArticle.image_url && (
                                            <button onClick={() => setNewArticle(prev => ({ ...prev, image_url: "" }))} className="bg-red-500/20 text-red-400 p-4 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Eraser size={20} /></button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div dir="ltr" className="rounded-xl overflow-hidden shadow-2xl border border-white/10">
                                <SunEditor
                                    setContents={newArticle.content || ""}
                                    onChange={(content) => setNewArticle(prev => ({ ...prev, content }))}
                                    setOptions={{
                                        buttonList: [['undo', 'redo'], ['formatBlock', 'font', 'fontSize'], ['bold', 'underline', 'italic', 'strike'], ['fontColor', 'hiliteColor'], ['align', 'list', 'horizontalRule'], ['link', 'image', 'video'], ['fullScreen', 'codeView']],
                                        rtl: true,
                                        width: '100%',
                                        height: '400px'
                                    }}
                                />
                            </div>

                            <button onClick={handleSaveNews} disabled={isPublishing} className="w-full bg-amber-600 py-6 rounded-3xl font-cinzel font-black text-2xl shadow-2xl hover:bg-amber-500 transition-all active:scale-95">
                                {isPublishing ? 'מטיל לחש...' : (editingId ? 'שמירת שינויים ✨' : 'פרסום בנביא היומי ✨')}
                            </button>
                        </section>

                        {/* --- סקשן דיווחים (כאן הם היו חסרים!) --- */}
                        <section className="glass-panel p-8 rounded-[2.5rem] border-red-500/20 bg-red-500/[0.02] space-y-6">
                            <h3 className="font-cinzel text-xl font-bold text-red-500 flex items-center gap-3">
                                <Flag size={28} /> דיווחים ממשרד הקסמים ({reports.length})
                            </h3>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {reports.length === 0 ? (
                                    <p className="text-center opacity-30 py-10 italic font-crimson text-2xl">אין דיווחים כרגע. השקט נשמר בקהילה.</p>
                                ) : (
                                    reports.map(report => (
                                        <div key={report.id} className="bg-white/5 border border-red-500/10 p-6 rounded-2xl space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded uppercase font-bold">{report.reason}</span>
                                                    <p className="text-white/80 italic font-crimson text-xl line-clamp-2">"{report.content_preview}"</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleDeleteContent(report.target_id, report.id)} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all shadow-lg" title="מחק תוכן"><Trash2 size={20} /></button>
                                                    <button onClick={() => handleDismissReport(report.id)} className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all" title="בטל דיווח"><CheckCircle size={20} /></button>
                                                </div>
                                            </div>
                                            <p className="text-[10px] opacity-40 uppercase tracking-widest font-cinzel">נשלח ב-{new Date(report.created_at).toLocaleDateString("he-IL")}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* ארכיון */}
                        <section className="glass-panel p-8 rounded-[2.5rem] border-white/5 space-y-6">
                            <h3 className="font-cinzel text-lg font-bold text-white/30 flex items-center gap-3"><FileText size={20} /> ארכיון הנביא</h3>
                            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {news.map(item => (
                                    <div key={item.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center group hover:bg-white/10 transition-all">
                                        <h4 className="font-bold text-amber-200">{item.title}</h4>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(item)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={16} /></button>
                                            <button onClick={async () => { if (confirm("למחוק?")) { await supabase.from('news').delete().eq('id', item.id); fetchData(); } }} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* סידבר כלים */}
                    <div className="space-y-8">
                        <section className="glass-panel p-6 rounded-[2.5rem] border-blue-500/20 space-y-4">
                            <h3 className="font-cinzel text-blue-400 flex items-center gap-2"><Radio size={20} className="animate-pulse" /> מחוברים ({onlineWizards.length})</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">{onlineWizards.map((w, i) => (<div key={i} className="flex justify-between text-xs p-2 bg-white/5 rounded-lg"><span>{w.user_name}</span><span className="opacity-40 uppercase">{w.house}</span></div>))}</div>
                        </section>

                        <section className="glass-panel p-6 rounded-[2.5rem] border-amber-500/20 space-y-4">
                            <h3 className="font-cinzel text-amber-500 flex items-center gap-2"><Trophy size={20} /> מענקים</h3>
                            <div className="flex gap-2"><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchUsers()} placeholder="חיפוש קוסם..." className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm outline-none" /><button onClick={searchUsers} className="bg-amber-600 p-2 rounded-lg text-black"><Search size={16} /></button></div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">{users.map(u => (<button key={u.id} onClick={() => setSelectedUser(u)} className={`w-full text-right p-2 text-xs rounded-lg ${selectedUser?.id === u.id ? 'bg-amber-500/20 border-amber-500' : ''}`}>{u.full_name}</button>))}</div>
                            {selectedUser && (
                                <div className="pt-2 space-y-4 bg-white/5 p-4 rounded-xl border border-amber-500/20">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><label className="text-[9px] text-amber-400 block text-center uppercase">נקודות</label><input type="number" value={pointsToAdd} onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)} className="w-full bg-black border border-amber-500/30 rounded-lg p-2 text-center font-bold" /></div>
                                        <div className="space-y-1"><label className="text-[9px] text-amber-400 block text-center uppercase">גליאונים</label><input type="number" value={galleonsToAdd} onChange={(e) => setGalleonsToAdd(parseInt(e.target.value) || 0)} className="w-full bg-black border border-amber-500/30 rounded-lg p-2 text-center font-bold" /></div>
                                    </div>
                                    <button onClick={handleUpdateReward} disabled={isUpdating} className="w-full bg-amber-600 py-3 rounded-xl text-black font-black text-xs uppercase">אישור מענק</button>
                                </div>
                            )}
                        </section>

                        <section className="glass-panel p-6 rounded-[2.5rem] border-purple-500/20 bg-purple-500/[0.02] space-y-4">
                            <h3 className="font-cinzel text-purple-400 flex items-center gap-2"><Megaphone size={20} /> הכרזה גלובלית</h3>
                            <textarea value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} placeholder="הודעה לכולם..." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-purple-500 h-20 resize-none" />
                            <button onClick={handleBroadcast} className="w-full bg-purple-600 py-2 rounded-lg font-bold text-white text-xs">שיגור ינשופים</button>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}