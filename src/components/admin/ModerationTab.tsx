"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ShieldX, Snowflake, UserCheck, Search, ShieldAlert, Clock } from "lucide-react";

export default function ModerationTab({ sendOwl }: { sendOwl: any }) {
    const supabase = createClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const searchUsers = async () => {
        if (!searchTerm.trim()) return;
        setLoading(true);
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email, status, ban_reason, house')
            .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
            .limit(5);
        setUsers(data || []);
        setLoading(false);
    };

    const updateStatus = async (userId: string, status: string, reason: string = "", days: number = 0) => {
        const expiresAt = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;

        const { error } = await supabase
            .from('profiles')
            .update({ status, ban_reason: reason, ban_expires_at: expiresAt })
            .eq('id', userId);

        if (!error) {
            sendOwl("הוגוורטס עודכנה", `סטטוס המשתמש שונה ל-${status}`, "success");
            searchUsers();
        } else {
            sendOwl("תקלה בלחש", "לא ניתן היה לעדכן את הסטטוס", "error");
        }
    };

    return (
        <section className="glass-panel p-8 rounded-[3rem] space-y-6">
            <h3 className="font-cinzel text-xl font-bold text-red-500 flex items-center gap-3">
                <ShieldAlert size={28} /> ניהול משמעת (חדר הקירור)
            </h3>

            <div className="flex gap-2">
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                    placeholder="חפש קוסם/מכשפה לפי שם או אימייל..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-red-500/50 transition-all"
                />
                <button onClick={searchUsers} className="bg-red-600/20 text-red-500 p-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all border border-red-500/20">
                    <Search size={20} />
                </button>
            </div>

            <div className="space-y-4">
                {users.map(u => (
                    <div key={u.id} className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-right">
                            <h4 className="font-bold text-lg">{u.full_name}</h4>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">{u.email} | {u.house}</p>
                            <div className="mt-2">
                                <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase ${u.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    סטטוס: {u.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {u.status !== 'active' && (
                                <button onClick={() => updateStatus(u.id, 'active')} className="p-3 bg-green-600/10 text-green-500 rounded-xl hover:bg-green-600 hover:text-white transition-all" title="שחרר חסימה"><UserCheck size={18} /></button>
                            )}
                            <button onClick={() => updateStatus(u.id, 'cooling', 'ספאם/התנהגות לא הולמת', 1)} className="p-3 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all" title="חדר קירור (24ש)"><Snowflake size={18} /></button>
                            <button onClick={() => updateStatus(u.id, 'banned', 'הפרה חמורה של כללי הטירה')} className="p-3 bg-red-600/20 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all" title="חסום לצמיתות"><ShieldX size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}