"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  Coins, Trophy, Wand2, Users, ScrollText, ShoppingBag,
  ChevronLeft, ChevronRight, LogOut, Settings, Mail, Lock, Sparkles, Zap, Home, Bell,
  Trash2, CheckCircle2, Briefcase, Star, BookOpen, ShieldAlert, X, ExternalLink, Clock, Menu, Swords
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import MaraudersMap from "@/components/MaraudersMap";
import { useAuth } from "@/context/AuthContext";
import MagicTraitsCard from "../../components/MagicTraitsCard";
import PatronusQuiz from "@/components/PatronusQuiz";
import { getYearFromProfile, getYearTitle, getYearLabel, getProgressPercentFromProfile, getNextYearRequirements } from "@/lib/yearSystem";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";

const PATRONUS_ANIMALS: Record<string, { emoji: string; nameHe: string }> = {
    stag:      { emoji: "🦌", nameHe: "צבי" },
    otter:     { emoji: "🦦", nameHe: "Otter" },
    wolf:      { emoji: "🐺", nameHe: "זאב" },
    doe:       { emoji: "🦌", nameHe: "צביה" },
    hare:      { emoji: "🐇", nameHe: "ארנב בר" },
    boar:      { emoji: "🐗", nameHe: "חזיר בר" },
    cat:       { emoji: "🐱", nameHe: "חתול" },
    eagle:     { emoji: "🦅", nameHe: "נשר" },
    lion:      { emoji: "🦁", nameHe: "אריה" },
    dolphin:   { emoji: "🐬", nameHe: "דולפין" },
    fox:       { emoji: "🦊", nameHe: "שועל" },
    owl:       { emoji: "🦉", nameHe: "ינשוף" },
    horse:     { emoji: "🐴", nameHe: "סוס" },
    tiger:     { emoji: "🐯", nameHe: "נמר" },
    swan:      { emoji: "🦢", nameHe: "ברבור" },
    bear:      { emoji: "🐻", nameHe: "דוב" },
    dragon:    { emoji: "🐉", nameHe: "דרקון" },
    butterfly: { emoji: "🦋", nameHe: "פרפר" },
    phoenix:   { emoji: "🔥", nameHe: "פיניקס" },
    serpent:   { emoji: "🐍", nameHe: "נחש" },
};

/**
 * LUMOS IL - MASTER DASHBOARD V6
 * ✅ MagicTraitsCard מחובר
 * ✅ מבנה JSX מתוקן
 * ✅ ActionCards כפולות הוסרו
 */

function MobileHeader({ theme, onMenuClick }: any) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={onMenuClick} className="p-2 hover:bg-white/10 rounded-xl transition-all">
          <Menu size={24} className={theme.accentText} />
        </button>
        <h1 className="font-cinzel text-xl font-black tracking-widest text-amber-500">LUMOS IL</h1>
        <div className="w-10" />
      </div>
    </header>
  );
}

function SpellRitual({ spell, onSuccess, onCancel }: any) {
  if (!spell) return null;
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'intro' | 'drawing' | 'success'>('intro');

  const handleDraw = () => {
    if (status !== 'drawing') return;
    const newProgress = Math.min(progress + 0.9, 100);
    setProgress(newProgress);
    if (newProgress >= 99) {
      setProgress(100);
      setStatus('success');
      setTimeout(onSuccess, 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-700 overflow-hidden" dir="rtl">
      <div className="relative w-full max-w-2xl p-6 md:p-12 text-center border border-amber-500/20 rounded-[3rem] md:rounded-[4rem] bg-black/40 shadow-[0_0_100px_rgba(245,158,11,0.1)] mx-4">
        <button onClick={onCancel} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors z-50"><X size={32} /></button>
        {status === 'intro' && (
          <div className="space-y-8 animate-in zoom-in">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20"><BookOpen size={48} className="text-amber-500" /></div>
            <h2 className="font-cinzel text-3xl md:text-5xl font-black text-amber-500 tracking-widest">{spell.name}</h2>
            <p className="font-crimson text-lg md:text-2xl text-white/60 italic leading-relaxed">"עליך להניף את השרביט בריכוז מוחלט כדי לשלוט בכשף."</p>
            <button onClick={() => setStatus('drawing')} className="px-10 py-4 md:px-14 md:py-5 rounded-full bg-amber-600 text-amber-950 font-cinzel font-black text-lg hover:shadow-2xl transition-all active:scale-95">התחל את הריטואל</button>
          </div>
        )}
        {status === 'drawing' && (
          <div className="flex flex-col items-center justify-center py-6 md:py-10" onMouseMove={handleDraw} onTouchMove={handleDraw}>
            <div className="text-amber-500/40 font-cinzel tracking-widest animate-pulse mb-8 text-xs md:text-sm uppercase text-center">הנע את העכבר/אצבע בתנועה סיבובית מעל הקלף</div>
            <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-amber-500/10 animate-[spin_10s_linear_infinite]" />
              <div className="text-5xl md:text-6xl text-amber-500 font-cinzel font-black">{Math.floor(progress)}%</div>
              <Wand2 size={24} className="text-amber-500/40 animate-bounce absolute bottom-6" />
            </div>
          </div>
        )}
        {status === 'success' && (
          <div className="space-y-8 animate-in zoom-in duration-1000 text-center">
            <Sparkles size={100} className="text-amber-500 animate-bounce mx-auto" />
            <h2 className="font-cinzel text-5xl md:text-6xl font-black text-white tracking-widest">תם ונשלם!</h2>
          </div>
        )}
      </div>
    </div>
  );
}

const HOUSE_THEMES: Record<string, any> = {
  Gryffindor: {
    cardBg: "bg-gradient-to-br from-red-950/30 via-red-900/20 to-amber-900/10 backdrop-blur-xl",
    borderColor: "border-red-500/30", textColor: "text-red-50", accentText: "text-red-500", accent: "#ef4444",
    glowColor: "drop-shadow-[0_0_25px_rgba(239,68,68,0.4)]", nameHe: "גריפינדור",
    description: "אומץ, תעוזה ואבירות. כאן נבחנת גדולה.",
    colors: "from-red-600/40 via-red-900/60 to-amber-600/20",
    nebula: "bg-gradient-to-br from-red-900/20 via-amber-900/10 to-transparent",
    heroGradient: "bg-gradient-to-bl from-red-900/80 via-red-950/60 to-amber-900/40",
    glow: "shadow-[0_0_60px_rgba(239,68,68,0.2)]"
  },
  Slytherin: {
    cardBg: "bg-gradient-to-br from-emerald-950/30 via-emerald-900/20 to-slate-900/10 backdrop-blur-xl",
    borderColor: "border-emerald-500/30", textColor: "text-emerald-50", accentText: "text-emerald-500", accent: "#10b981",
    glowColor: "drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]", nameHe: "סלית'רין",
    description: "שאפתנות, פיקחות וטהרת דם. הדרך לפסגה מתחילה פה.",
    colors: "from-emerald-600/40 via-emerald-900/60 to-slate-800/20",
    nebula: "bg-gradient-to-br from-emerald-900/20 via-slate-900/10 to-transparent",
    heroGradient: "bg-gradient-to-bl from-emerald-900/80 via-emerald-950/60 to-slate-900/40",
    glow: "shadow-[0_0_60px_rgba(16,185,129,0.2)]"
  },
  Ravenclaw: {
    cardBg: "bg-gradient-to-br from-blue-950/30 via-blue-900/20 to-indigo-900/10 backdrop-blur-xl",
    borderColor: "border-blue-500/30", textColor: "text-blue-50", accentText: "text-blue-400", accent: "#60a5fa",
    glowColor: "drop-shadow-[0_0_25px_rgba(59,130,246,0.4)]", nameHe: "רייבנקלו",
    description: "חכמה, יצירתיות ולמידה. הראש פתוח לכל תעלומה.",
    colors: "from-blue-600/40 via-blue-900/60 to-indigo-900/20",
    nebula: "bg-gradient-to-br from-blue-900/20 via-indigo-900/10 to-transparent",
    heroGradient: "bg-gradient-to-bl from-blue-900/80 via-blue-950/60 to-indigo-900/40",
    glow: "shadow-[0_0_60px_rgba(59,130,246,0.2)]"
  },
  Hufflepuff: {
    cardBg: "bg-gradient-to-br from-amber-950/30 via-amber-900/20 to-yellow-900/10 backdrop-blur-xl",
    borderColor: "border-amber-500/30", textColor: "text-amber-50", accentText: "text-amber-500", accent: "#f59e0b",
    glowColor: "drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]", nameHe: "הפלפאף",
    description: "טוב לב, נאמנות ועבודה קשה. הבית של כולם.",
    colors: "from-amber-400/40 via-amber-700/60 to-yellow-900/20",
    nebula: "bg-gradient-to-br from-amber-900/30 via-yellow-900/15 to-transparent",
    heroGradient: "bg-gradient-to-bl from-amber-900/80 via-amber-950/60 to-yellow-900/40",
    glow: "shadow-[0_0_60px_rgba(245,158,11,0.2)]"
  }
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());
  const { sendOwl } = useOwlMail();
  const { profile, session, refreshProfile, isLoading: authLoading, profileError } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'notifications' | 'inventory' | 'spells'>('overview');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [spells, setSpells] = useState<any[]>([]);
  const [activeRitual, setActiveRitual] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newSignature, setNewSignature] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const hasAnnounced = useRef(false);
  const prevYearRef = useRef<number | null>(null);
  const [roleColors, setRoleColors] = useState<Record<string, string>>({});
  const [myGroup, setMyGroup] = useState<{ name: string; color: string } | null>(null);
  useEffect(() => { getRoleColorFromDB(supabase).then(setRoleColors); }, [supabase]);
  useEffect(() => {
    if (!profile?.group_id) { setMyGroup(null); return; }
    supabase.from('user_groups').select('name, color').eq('id', profile.group_id).single()
      .then(({ data }) => setMyGroup(data || null));
  }, [profile?.group_id, supabase]);

  const formatNotificationContent = (content: string, type: string) => {
    if (type === 'quote') return content.replace('ציטוט שלך בדיון', 'בתגובה מצוטטת לדיון');
    if (type === 'tag') return content.replace('תיוג שלך בדיון', 'בתיוג בתוך הדיון');
    return content;
  };

  useEffect(() => {
    const header = document.querySelector('header');
    const ticker = document.querySelector('[data-magic-ticker]');
    if (header instanceof HTMLElement) header.style.display = 'none';
    if (ticker instanceof HTMLElement) ticker.style.display = 'none';
    return () => {
      if (header instanceof HTMLElement) header.style.display = '';
      if (ticker instanceof HTMLElement) ticker.style.display = '';
    };
  }, []);

  const getInventory = () => {
    if (!profile?.inventory) return { companions: [], items: [], cards: [], potions_ingredients: [] };
    try {
      const data = typeof profile.inventory === 'string' ? JSON.parse(profile.inventory) : profile.inventory;
      const allItems = [...(data.items || []), ...(data.companions || [])];
      return {
        companions: allItems.filter((i: any) => i.category === 'companion' || i.type === 'goblin'),
        items: allItems.filter((i: any) => !['companion', 'cards', 'potions'].includes(i.category) && !i.type),
        cards: allItems.filter((i: any) => i.category === 'cards'),
        potions_ingredients: allItems.filter((i: any) => i.category === 'potions'),
      };
    } catch (e) { return { companions: [], items: [], cards: [], potions_ingredients: [] }; }
  };

  const fetchNotifications = useCallback(async (userId: string) => {
    const { data } = await supabase.from('notifications').select(`*, actor_profile:actor_id (full_name, house)`).eq('user_id', userId).order('created_at', { ascending: false });
    setNotifications(data || []);
  }, [supabase]);

  const fetchSpells = useCallback(async () => {
    const { data } = await supabase.from('spells').select('*').order('min_year', { ascending: true });
    if (data) setSpells(data);
  }, [supabase]);

  useEffect(() => {
    let profileChannel: any;
    if (session?.user?.id) {
      fetchSpells();
      fetchNotifications(session.user.id);
      profileChannel = supabase
        .channel(`dashboard_updates_${session.user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` }, () => refreshProfile())
        .subscribe();
      if (!hasAnnounced.current && profile) {
        sendOwl("ברוכ׳ הבא׳", `שמחים לראותך שוב בחדר המועדון.`, "info");
        hasAnnounced.current = true;
      }
    }
    return () => { if (profileChannel) supabase.removeChannel(profileChannel); };
  }, [session?.user?.id, profile?.gender, fetchSpells, fetchNotifications, refreshProfile, sendOwl, supabase]);

  useEffect(() => {
    const tab = searchParams.get('tab') as any;
    if (['overview', 'settings', 'notifications', 'inventory', 'spells'].includes(tab)) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    if (profile) {
      setNewName(profile.full_name || "");
      setNewGender(profile.gender || "male");
      setNewSignature(profile.signature || "");
      setNewEmail(session?.user?.email || "");
    }
  }, [profile, session]);

  // Year-up notification
  useEffect(() => {
    if (!profile) return;
    const newYear = getYearFromProfile(profile);
    if (prevYearRef.current !== null && newYear > prevYearRef.current) {
      sendOwl(`עלית לשנה ${newYear}! 🎓`, `ברכות! הגעת לדרגת ${getYearTitle(newYear)}`, "magic");
    }
    prevYearRef.current = newYear;
  }, [profile, sendOwl]);

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    const { error } = await supabase.from('profiles').update({ full_name: newName, gender: newGender, signature: newSignature }).eq('id', profile.id);
    if (!error) { sendOwl("הלחש הצליח!", "פרטי הפרופיל עודכנו.", "success"); refreshProfile(); }
    setIsUpdating(false);
  };

  const handleUpdateAuth = async (type: 'email' | 'password') => {
    setIsUpdating(true);
    const updateData: any = type === 'email' ? { email: newEmail } : { password: newPassword };
    const { error } = await supabase.auth.updateUser(updateData);
    if (!error) {
      sendOwl("אבטחה עודכנה", `${type === 'email' ? 'האימייל' : 'הסיסמה'} עודכנו בהצלחה.`, "success");
      if (type === 'password') setNewPassword("");
    } else { sendOwl("שגיאת קסם", error.message, "error"); }
    setIsUpdating(false);
  };

  const handleResetHouse = async () => {
    if (profile.galleons < 500) { sendOwl("אין מספיק זהב", "עליך לאסוף 500 גליאונים.", "error"); return; }
    if (profile.house_changes_count >= 1) { sendOwl("הגורל נחתם", "כבר ניצלת את המיון החוזר שלך.", "error"); return; }
    const { error } = await supabase.from('profiles').update({ house: 'Unsorted', galleons: profile.galleons - 500, house_changes_count: 1 }).eq('id', profile.id);
    if (!error) { sendOwl("שיקוי החרטה פעל", "המצנפת ממתינה לך...", "magic"); setTimeout(() => router.push('/sorting'), 2000); }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const deleteAllNotifications = async () => {
    if (!session?.user?.id) return;
    await supabase.from('notifications').delete().eq('user_id', session.user.id);
    setNotifications([]);
  };

  if (authLoading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center animate-pulse"><Wand2 className="text-amber-500" size={48} /></div>;

  if (!session) {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center animate-pulse"><Wand2 className="text-amber-500" size={48} /></div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6" dir="rtl">
        <div className="max-w-md w-full rounded-[2rem] border border-amber-500/20 bg-black/30 p-8 text-center space-y-5 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
          <Wand2 className="mx-auto text-amber-500" size={42} />
          <div>
            <h1 className="font-cinzel text-2xl font-black text-white mb-2">החיבור הצליח, אבל הפרופיל עוד לא נטען</h1>
            <p className="font-crimson text-white/55 leading-relaxed">
              {profileError || "אפשר לנסות רענון של הפרופיל בלי לנתק את החשבון."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => refreshProfile()}
              className="px-5 py-3 rounded-xl bg-amber-500 text-amber-950 font-cinzel font-black text-sm tracking-widest uppercase"
            >
              רענון פרופיל
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="px-5 py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 font-cinzel font-black text-sm tracking-widest uppercase transition-all"
            >
              ניתוק בטוח
            </button>
          </div>
        </div>
      </div>
    );
  }

  const theme = HOUSE_THEMES[profile?.house] || HOUSE_THEMES['Gryffindor'];
  const inventory = getInventory();
  const isInventoryEmpty = !inventory.items?.length && !inventory.companions?.length && !inventory.cards?.length;

  return (
    <>
      <MobileHeader theme={theme} onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-20" dir="rtl">
          <div className="p-6 space-y-4">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 w-full p-4 rounded-2xl text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 mb-2 transition-all">
              <ChevronRight size={18} />
              <span className="font-cinzel text-xs font-bold tracking-widest uppercase">חזרה לעמוד הראשי</span>
            </Link>
            <TabButton icon={Home} label="לוח בקרה" active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); router.push('/dashboard?tab=overview'); setMobileMenuOpen(false); }} theme={theme} />
            <TabButton icon={Briefcase} label="מזוודת חפצים" active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); router.push('/dashboard?tab=inventory'); setMobileMenuOpen(false); }} theme={theme} />
            <TabButton icon={BookOpen} label="ספר כשפים" active={activeTab === 'spells'} onClick={() => { setActiveTab('spells'); router.push('/dashboard?tab=spells'); setMobileMenuOpen(false); }} theme={theme} />
            <TabButton icon={Bell} label="תיבת ינשופים" active={activeTab === 'notifications'} onClick={() => { setActiveTab('notifications'); router.push('/dashboard?tab=notifications'); setMobileMenuOpen(false); }} theme={theme} count={notifications.filter(n => !n.is_read).length} />
            <TabButton icon={Settings} label="הגדרות קסם" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); router.push('/dashboard?tab=settings'); setMobileMenuOpen(false); }} theme={theme} />
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="w-full mt-8 py-3 text-xs text-red-400/40 hover:text-red-400 font-cinzel tracking-widest uppercase transition-all flex items-center justify-center gap-2 border border-white/5 rounded-xl hover:border-red-400/20">
              <LogOut size={14} /><span>התנתקות</span>
            </button>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-7xl mx-auto px-4 md:px-6 py-8 lg:py-12 min-h-screen pt-20 lg:pt-8" dir="rtl">

        {activeRitual && (
          <SpellRitual
            spell={activeRitual}
            onSuccess={async () => {
              const newSpells = [...(profile.learned_spells || []), activeRitual.id];
              await supabase.from('profiles').update({ learned_spells: newSpells }).eq('id', profile.id);
              sendOwl("הריטואל הושלם!", `למדת את ${activeRitual.name}!`, "magic");
              refreshProfile();
              setActiveRitual(null);
            }}
            onCancel={() => setActiveRitual(null)}
          />
        )}

        {/* Background */}
        <div className="fixed inset-0 z-[-3] bg-[#0a0e1a]" />
        <div className={`fixed inset-0 z-[-2] pointer-events-none opacity-30 blur-[100px] ${theme.nebula}`} />
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-amber-500/30 rounded-full animate-pulse" />
          <div className="absolute top-1/3 left-1/3 w-1 h-1 bg-amber-400/40 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 right-1/3 w-1.5 h-1.5 bg-amber-500/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block w-full lg:w-80 shrink-0">
            <div className={`glass-panel rounded-[2.5rem] border-t border-l ${theme.borderColor} p-6 md:p-8 sticky top-12 shadow-2xl overflow-hidden ${theme.glow}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none rounded-[2.5rem]" />

              <div className="relative z-10 flex flex-col items-center gap-4 border-b border-white/10 pb-6 text-center">
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br ${theme.colors} p-1 shadow-lg ring-2 ring-white/10`}>
                  <div className="w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center text-3xl md:text-4xl">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      : profile?.house === 'Gryffindor' ? "🦁" : profile?.house === 'Slytherin' ? "🐍" : profile?.house === 'Ravenclaw' ? "🦅" : "🦡"
                    }
                  </div>
                </div>
                <div>
                  <h3 className="font-cinzel text-xl md:text-2xl font-black tracking-tight mb-1"
                    style={{ color: myGroup?.color || getRoleColor(profile?.role, profile?.house, roleColors) }}>
                    {profile?.full_name}
                  </h3>
                  <span className="text-xs text-white/30 font-cinzel tracking-widest block">{getYearTitle(getYearFromProfile(profile))} · שנה {getYearLabel(getYearFromProfile(profile))} · {profile?.gender === 'female' ? 'מכשפה' : 'קוסם'}</span>
                </div>
              </div>

              <nav className="relative z-10 flex flex-col gap-2 pt-6">
                <Link href="/" className="flex items-center gap-4 w-full p-4 rounded-2xl text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 mb-4 transition-all group">
                  <ChevronRight size={18} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="font-cinzel text-xs font-bold tracking-widest uppercase">חזרה לטירה (ראשי)</span>
                </Link>
                {profile?.id && (
                  <Link href={`/wizard/${profile.id}`} className="flex items-center gap-4 w-full p-4 rounded-2xl text-white/50 hover:text-white hover:bg-white/5 border border-white/5 hover:border-white/10 mb-2 transition-all group">
                    <Users size={18} className="shrink-0" />
                    <span className="font-cinzel text-xs font-bold tracking-widest uppercase">הפרופיל שלי</span>
                  </Link>
                )}
                <TabButton icon={Home} label="לוח בקרה" active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); router.push('/dashboard?tab=overview'); }} theme={theme} />
                <TabButton icon={Briefcase} label="מזוודת חפצים" active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); router.push('/dashboard?tab=inventory'); }} theme={theme} />
                <TabButton icon={BookOpen} label="ספר כשפים" active={activeTab === 'spells'} onClick={() => { setActiveTab('spells'); router.push('/dashboard?tab=spells'); }} theme={theme} />
                <TabButton icon={Bell} label="תיבת ינשופים" active={activeTab === 'notifications'} onClick={() => { setActiveTab('notifications'); router.push('/dashboard?tab=notifications'); }} theme={theme} count={notifications.filter(n => !n.is_read).length} />
                <TabButton icon={Settings} label="הגדרות קסם" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); router.push('/dashboard?tab=settings'); }} theme={theme} />
                {profile?.role === 'מנהל' && (
                  <Link href="/admin-panel" className="flex items-center gap-4 w-full p-4 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 mt-4 transition-all">
                    <ShieldAlert size={18} />
                    <span className="font-cinzel text-xs font-bold uppercase tracking-widest">ניהול הטירה</span>
                  </Link>
                )}
              </nav>

              <div className="relative z-10 pt-6 mt-6 border-t border-white/10 space-y-4">
                {(myGroup || profile?.role) && (() => {
                  const badgeColor = myGroup?.color || getRoleColor(profile?.role, profile?.house, roleColors);
                  const badgeLabel = myGroup?.name || profile?.role;
                  return (
                    <div className="flex items-center justify-between">
                      <span style={{
                        fontSize: "9px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                        textTransform: "uppercase", letterSpacing: "0.12em",
                        padding: "2px 10px", borderRadius: "999px",
                        color: badgeColor, background: `${badgeColor}18`, border: `1px solid ${badgeColor}40`,
                      }}>{badgeLabel}</span>
                      <span className="text-[10px] text-white/30 font-cinzel">{getYearTitle(getYearFromProfile(profile))}</span>
                    </div>
                  );
                })()}
                <StatItem icon={Coins} label="גליאונים" value={profile?.galleons || 0} theme={theme} highlight="text-amber-500" />
                <StatItem icon={Trophy} label="נקודות בית" value={profile?.points_contributed || 0} theme={theme} />
                {profile?.wand_type && (
                  <div className="pt-4 border-t border-white/10 text-right">
                    <div className="flex items-center gap-2 text-white/30 text-xs uppercase mb-2">
                      <Wand2 size={12} />
                      <span className="font-bold font-cinzel">השרביט שלך</span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed italic pr-2 border-r border-amber-500/20">{profile.wand_type}</p>
                  </div>
                )}
              </div>

              <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="relative z-10 w-full mt-8 py-3 text-xs text-red-400/40 hover:text-red-400 font-cinzel tracking-widest uppercase transition-all flex items-center justify-center gap-2 border border-white/5 rounded-xl hover:border-red-400/20">
                <LogOut size={14} /><span>התנתקות מהטירה</span>
              </button>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="flex-1 w-full overflow-hidden">

            {/* ── Overview ── */}
            {activeTab === 'overview' && (
              <div className="space-y-10 animate-in fade-in duration-1000">

                {/* Hero */}
                <section className={`relative overflow-hidden p-8 md:p-12 lg:p-16 rounded-[3rem] lg:rounded-[4rem] border-t border-r ${theme.borderColor} ${theme.heroGradient} ${theme.glow}`}>
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/[0.02] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                  <div className="relative z-10 flex flex-col gap-4 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-40 mb-6">
                      <span className="font-cinzel text-[10px] tracking-[0.4em] text-amber-500 uppercase">Room of Requirement</span>
                      <span className="h-[1px] w-10 bg-amber-500" />
                    </div>
                    <div className="space-y-8">
                      <h2 className="font-cinzel text-xl text-white/40 tracking-widest">ברוכ׳ הבא׳ לבית</h2>
                      <h1 className={`font-cinzel text-4xl sm:text-5xl md:text-[7rem] font-black tracking-tighter leading-[1.1] ${theme.accentText} ${theme.glowColor}`}>
                        {theme.nameHe}
                      </h1>
                    </div>
                    <div className={`mt-10 border-r-4 ${theme.borderColor} pr-6 max-w-xl mr-0 ml-auto`}>
                      <p className="font-crimson text-xl md:text-2xl leading-relaxed text-white/70 italic text-right">"{theme.description}"</p>
                    </div>

                    {/* Progress bar — שנת לימודים */}
                    {(() => {
                      const currentYear = getYearFromProfile(profile);
                      const req = getNextYearRequirements(profile);
                      const progress = getProgressPercentFromProfile(profile);
                      return (
                        <div className="mt-8 w-full max-w-xl mr-0 ml-auto">
                          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                            <span className="font-cinzel text-[10px] text-white/30 tracking-widest">
                              {getYearTitle(currentYear)} · שנה {getYearLabel(currentYear)}
                            </span>
                            {req && (
                              <span className="font-cinzel text-[10px] text-white/20">
                                עוד{req.months > 0 ? ` ${req.months} חודשים` : ""}
                                {req.months > 0 && req.posts > 0 ? " + " : ""}
                                {req.posts > 0 ? `${req.posts} פוסטים` : ""}
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000"
                              style={{
                                width: `${progress}%`,
                                background: theme.accent || "#f59e0b",
                                boxShadow: `0 0 6px ${theme.accent}80`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            {[1,2,3,4,5,6,7].map(y => (
                              <span key={y} className="text-[8px] font-cinzel"
                                style={{ color: y <= currentYear ? theme.accent : "rgba(255,255,255,0.1)" }}>
                                {getYearLabel(y)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* בחינות O.W.L / N.E.W.T */}
                    {(() => {
                      const currentYear = getYearFromProfile(profile);
                      const owlPassed = profile.owl_passed === true;
                      const newtPassed = profile.newt_passed === true;
                      const showOwl = currentYear >= 5;
                      const showNewt = currentYear >= 6;
                      if (!showOwl && !showNewt) return null;
                      return (
                        <div className="mt-6 flex flex-wrap gap-3 justify-end">
                          {showOwl && (owlPassed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 font-cinzel text-[11px] text-amber-400">
                              🦉 בכיר O.W.L
                            </span>
                          ) : (
                            <Link href="/exams/owl"
                              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-cinzel font-black text-xs uppercase tracking-wide transition-all active:scale-[0.98] bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-300`}>
                              🦉 גש לבחינת O.W.L
                            </Link>
                          ))}
                          {showNewt && (newtPassed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 font-cinzel text-[11px] text-purple-400">
                              ⚡ בכיר N.E.W.T
                            </span>
                          ) : (
                            <Link href="/exams/newt"
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-cinzel font-black text-xs uppercase tracking-wide transition-all active:scale-[0.98] bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300">
                              ⚡ גש לבחינת N.E.W.T
                            </Link>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </section>

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <ActionCard href="/shop" icon={ShoppingBag} title="דיאגון" desc="חנות קסמים" theme={theme} />
                  <ActionCard href="/forums" icon={Users} title="האולם הגדול" desc="שיחות וקהילה" theme={theme} />
                  <ActionCard href="/library" icon={ScrollText} title="הספרייה" desc="לור וסיפורים" theme={theme} />
                </div>

                {/* 👑 הדרגה שלי */}
                {(myGroup || profile?.role) && (() => {
                  const badgeColor = myGroup?.color || getRoleColor(profile?.role, profile?.house, roleColors);
                  const badgeName = myGroup?.name || profile?.role || "";
                  const currentYear = getYearFromProfile(profile);
                  return (
                    <div className="glass-panel p-6 rounded-2xl border border-white/[0.06] flex items-center gap-5">
                      <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ background: `${badgeColor}15`, border: `1px solid ${badgeColor}30` }}>
                        👑
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-white/30 font-cinzel uppercase tracking-widest mb-1">הדרגה שלי</div>
                        <span style={{
                          fontSize: "11px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                          textTransform: "uppercase", letterSpacing: "0.12em",
                          padding: "2px 12px", borderRadius: "999px",
                          color: badgeColor, background: `${badgeColor}18`, border: `1px solid ${badgeColor}40`,
                        }}>{badgeName}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-cinzel font-black text-sm" style={{ color: badgeColor }}>שנה {getYearLabel(currentYear)}</div>
                        <div className="text-[10px] text-white/30 font-cinzel">{getYearTitle(currentYear)}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* ✨ תכונות קסומות מולדות */}
                <MagicTraitsCard profile={profile} theme={theme} />

                {profile.patronus && (
                  <div className="glass-panel rounded-2xl p-4 border border-white/[0.06] flex items-center gap-4">
                    <span className="text-4xl">{PATRONUS_ANIMALS[profile.patronus]?.emoji || "🔮"}</span>
                    <div>
                      <p className="font-cinzel text-xs text-white/30 uppercase tracking-widest">הפטרונוס שלך</p>
                      <p className={`font-cinzel font-black text-lg ${theme.accentText}`}>
                        {PATRONUS_ANIMALS[profile.patronus]?.nameHe || profile.patronus}
                      </p>
                    </div>
                  </div>
                )}

                {/* מפת הקונדסאים */}
                <div className={`glass-panel rounded-[3rem] p-6 md:p-8 border ${theme.borderColor} shadow-2xl flex flex-col items-start overflow-hidden`}>
                  <div className="w-full flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                    <Zap size={20} className="text-amber-500 animate-pulse" />
                    <h3 className="font-cinzel text-base md:text-lg font-black text-white uppercase tracking-widest">מפת הקונדסאים</h3>
                  </div>
                  <div className="w-full overflow-x-auto custom-scrollbar"><MaraudersMap /></div>
                </div>

              </div>
            )}

            {/* ── Notifications ── */}
            {activeTab === 'notifications' && (
              <div className={`glass-panel rounded-[3rem] border-t border-l ${theme.borderColor} p-6 md:p-12 space-y-8 animate-in fade-in ${theme.glow}`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-cinzel text-2xl md:text-3xl font-black flex items-center gap-4 text-white">
                    <span>תיבת ינשופים</span>
                    <Bell className={theme.accentText} />
                  </h2>
                  {notifications.length > 0 && (
                    <button
                      onClick={deleteAllNotifications}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-cinzel uppercase tracking-widest"
                    >
                      <Trash2 size={14} /> מחק הכל
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {notifications.length > 0 ? notifications.map((n) => (
                    <div key={n.id} className={`p-6 md:p-8 rounded-[2rem] border ${!n.is_read ? 'bg-white/[0.03] border-white/10 shadow-xl' : 'bg-transparent border-white/5 opacity-50'} flex flex-col md:flex-row items-center justify-between gap-6 transition-all`}>
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className={`p-4 rounded-full ${!n.is_read ? 'bg-amber-500/20 text-amber-500' : 'bg-white/5 text-white/20'}`}>
                          <Mail size={24} />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-sm md:text-base text-white/90 font-medium mb-1">
                            {n.actor_profile?.full_name ? (
                              <>
                                <span className={`font-bold ${theme.accentText}`}>{n.actor_profile.full_name}</span>
                                {" "}{formatNotificationContent(n.content?.replace(n.actor_profile.full_name, '').trim(), n.type)}
                              </>
                            ) : (
                              <span>{formatNotificationContent(n.content, n.type)}</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-white/20 font-cinzel tracking-[0.2em] justify-end">
                            <span>{new Date(n.created_at).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            <Clock size={10} />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4 w-full md:w-auto justify-end">
                        {n.target_url && (
                          n.type === 'duel_result' ? (
                            <Link href={n.target_url} onClick={() => markAsRead(n.id)} className="px-5 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-xs font-cinzel tracking-widest flex items-center gap-2 transition-all">
                              <Swords size={14} /><span>תוצאות הקרב</span>
                            </Link>
                          ) : n.type === 'duel_missed' ? (
                            <Link href={n.target_url} onClick={() => markAsRead(n.id)} className="px-5 py-2.5 rounded-full bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 text-xs font-cinzel tracking-widest flex items-center gap-2 transition-all">
                              <Swords size={14} /><span>לזירה</span>
                            </Link>
                          ) : (
                            <Link href={n.target_url} onClick={() => markAsRead(n.id)} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-cinzel tracking-widest flex items-center gap-2 transition-all">
                              <span>עבור לדיון</span><ExternalLink size={14} />
                            </Link>
                          )
                        )}
                        {!n.is_read && <button onClick={() => markAsRead(n.id)} className="p-3 hover:bg-green-500/20 text-green-500 rounded-full transition-all"><CheckCircle2 size={20} /></button>}
                        <button onClick={() => deleteNotification(n.id)} className="p-3 hover:bg-red-500/20 text-red-500 rounded-full transition-all"><Trash2 size={20} /></button>
                      </div>
                    </div>
                  )) : <div className="py-24 opacity-20 font-cinzel italic text-center text-xl">אין מכתבים חדשים בתיבה.</div>}
                </div>
              </div>
            )}

            {/* ── Inventory ── */}
            {activeTab === 'inventory' && (
              <div className="space-y-12 animate-in fade-in">
                <h2 className="font-cinzel text-3xl md:text-4xl font-black border-b border-white/10 pb-6 text-white text-right uppercase tracking-widest">מזוודת חפצים</h2>
                {!isInventoryEmpty ? (
                  <div className="space-y-10">
                    <InventorySection title="מלווים וחיות פלא" items={inventory.companions} icon={Users} theme={theme} />
                    <InventorySection title="חפצים קסומים" items={inventory.items} icon={Sparkles} theme={theme} />
                    <InventorySection title="קלפי אספנות" items={inventory.cards} icon={ScrollText} theme={theme} />
                    <InventorySection title="רכיבי שיקויים" items={inventory.potions_ingredients} icon={Zap} theme={theme} />
                  </div>
                ) : (
                  <div className="glass-panel rounded-[3rem] py-24 text-center border-dashed border-2 border-white/5">
                    <ShoppingBag className="mx-auto text-white/10 mb-6" size={80} />
                    <p className="font-cinzel text-xl text-white/20 italic">המזוודה ריקה. בקר בסמטת דיאגון.</p>
                    <Link href="/shop" className="mt-4 inline-block text-amber-500 hover:underline uppercase tracking-widest text-xs font-bold font-cinzel">למעבר לחנות</Link>
                  </div>
                )}
              </div>
            )}

            {/* ── Settings ── */}
            {activeTab === 'settings' && (
              <div className={`glass-panel rounded-[3rem] border-t border-l ${theme.borderColor} p-6 md:p-12 space-y-12 animate-in fade-in ${theme.glow}`}>
                <h2 className="font-cinzel text-3xl font-black uppercase tracking-widest border-b border-white/10 pb-8 text-white text-right">הגדרות קסם</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <InputField label="שם הקוסם / המכשפה" value={newName} onChange={setNewName} />
                    <div className="space-y-2 text-right">
                      <label className="text-xs text-white/30 uppercase tracking-widest mr-2 block">מגדר</label>
                      <select value={newGender} onChange={(e) => setNewGender(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-amber-500/50 transition-all appearance-none" dir="rtl">
                        <option value="male" className="bg-[#020617]">קוסם</option>
                        <option value="female" className="bg-[#020617]">מכשפה</option>
                      </select>
                    </div>
                    <TextAreaField label="חתימה בפורום" value={newSignature} onChange={setNewSignature} />
                    <button onClick={handleUpdateProfile} disabled={isUpdating} className="w-full py-5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-amber-950 font-black transition-all shadow-lg active:scale-95">שמור שינויים</button>
                  </div>
                  <div className="space-y-8">
                    <div className="p-8 md:p-10 rounded-[3rem] bg-black/20 border border-white/5 shadow-inner space-y-6">
                      <h4 className="font-cinzel text-xs text-amber-500/60 uppercase flex items-center gap-2 border-b border-white/5 pb-4 justify-end"><span>אבטחת גרינגוטס</span><Lock size={16} /></h4>
                      <div className="relative"><InputField label="שינוי אימייל" value={newEmail} onChange={setNewEmail} /><button onClick={() => handleUpdateAuth('email')} className="absolute left-4 top-11 text-xs text-amber-500 uppercase font-black hover:underline">עדכן</button></div>
                      <div className="relative"><InputField label="סיסמה חדשה" value={newPassword} onChange={setNewPassword} type="password" /><button onClick={() => handleUpdateAuth('password')} className="absolute left-4 top-11 text-xs text-amber-500 uppercase font-black hover:underline">עדכן</button></div>
                    </div>
                    <div className="p-8 md:p-10 rounded-[3rem] bg-gradient-to-br from-purple-900/10 to-transparent border border-purple-500/20 flex flex-col items-center gap-6 text-center">
                      <div className={`p-5 rounded-full bg-white/5 ${theme.accentText} animate-pulse`}><Sparkles size={32} /></div>
                      <h4 className="font-cinzel text-xl font-bold uppercase tracking-widest text-purple-400">שיקוי הזדמנות שנייה</h4>
                      <p className="font-crimson text-white/50 text-base italic leading-relaxed">המצנפת מוכנה לשקול שוב את גורלך... תמורת 500 גליאונים.</p>
                      <button onClick={handleResetHouse} disabled={profile?.house_changes_count >= 1 || profile?.galleons < 500} className="px-10 py-3 rounded-full bg-purple-600 hover:bg-purple-500 disabled:bg-white/5 text-white font-black transition-all active:scale-95">מיון מחדש (500 גליאונים)</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Spells ── */}
            {activeTab === 'spells' && (
              <div className="space-y-10 animate-in fade-in">
                <h2 className="font-cinzel text-4xl font-black border-b border-white/10 pb-6 text-white text-right uppercase tracking-widest">ספר הכשפים התקני</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  {spells.map((s) => {
                    const locked = profile?.year < s.min_year;
                    const learned = profile?.learned_spells?.includes(s.id);
                    return (
                      <div key={s.id} className={`group relative p-8 md:p-10 glass-panel rounded-[3rem] border transition-all duration-700 overflow-hidden ${locked ? 'border-red-900/40 bg-black/80 grayscale opacity-70' : learned ? 'border-amber-500/30 bg-amber-500/5 shadow-lg' : 'border-white/10 hover:border-amber-500/40'}`}>
                        {locked && <div className="absolute top-6 left-6 text-red-500/60 flex flex-col items-center animate-pulse z-10"><Lock size={28} /><span className="text-[9px] font-cinzel mt-1 uppercase font-black">שנה {s.min_year}</span></div>}
                        <div className="flex items-start justify-between mb-6">
                          {learned && <CheckCircle2 className="text-amber-500" size={24} />}
                          <div className="flex-1 text-right">
                            <h3 className="font-cinzel text-xl md:text-2xl font-black text-white group-hover:text-amber-500 transition-colors">{s.name}</h3>
                            <span className="text-sm font-crimson text-amber-500/60 italic tracking-widest block">{s.latin_name}</span>
                          </div>
                        </div>
                        <p className="text-sm md:text-base text-white/50 mb-8 italic text-right leading-relaxed">"{s.description}"</p>
                        {!locked && !learned && <button onClick={() => setActiveRitual(s)} className="w-full py-4 bg-amber-600/10 border border-amber-500/30 text-amber-500 rounded-2xl font-cinzel hover:bg-amber-500 hover:text-amber-950 font-black text-xs uppercase transition-all shadow-lg active:scale-95">התחל ריטואל למידה</button>}
                        {learned && <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between" dir="ltr"><code className="text-sm text-amber-200 font-mono font-bold tracking-widest">&gt;{s.terminal_command}</code><span className="text-[10px] text-amber-500/60 font-cinzel uppercase tracking-widest">:פקודה</span></div>}
                      </div>
                    );
                  })}
                </div>

                {profile && (
                  <PatronusQuiz
                    profileId={profile.id}
                    currentYear={profile.year || 1}
                    onComplete={() => refreshProfile()}
                  />
                )}
              </div>
            )}

          </main>
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center animate-pulse"><Wand2 className="text-amber-500" size={48} /></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function InventorySection({ title, items, icon: Icon, theme }: any) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-6 animate-in fade-in">
      <h3 className="font-cinzel text-xs font-bold text-white/40 flex items-center gap-3 uppercase tracking-widest justify-end">
        <span>{title}</span><Icon size={16} />
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {items.map((item: any, idx: number) => (
          <div key={idx} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-4 hover:border-amber-500/30 transition-all group relative overflow-hidden text-center shadow-lg bg-black/20">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {item.image_url
              ? <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-2xl object-cover border border-white/5 group-hover:scale-110 transition-transform" />
              : <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-amber-500/20"><Star size={32} /></div>}
            <div className="text-center relative z-10 w-full">
              <h4 className="font-cinzel text-[10px] font-bold uppercase tracking-widest truncate text-white">{item.name}</h4>
              <span className="text-[9px] text-white/20 tracking-widest mt-1 block uppercase">{item.rarity}</span>
              {item.boosts?.galleons_multiplier && <div className="mt-2 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[9px] font-bold inline-flex items-center gap-1"><Coins size={10} />+{item.boosts.galleons_multiplier * 100}%</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value, theme, highlight }: any) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl bg-white/5 ${theme.accentText} group-hover:scale-110 transition-transform`}><Icon size={16} /></div>
        <span className="text-xs font-crimson text-white/40 tracking-widest uppercase">{label}</span>
      </div>
      <span className={`font-cinzel font-bold text-lg ${highlight || theme.textColor}`}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
  );
}

function TabButton({ icon: Icon, label, active, onClick, theme, count }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-500 ${active ? `bg-white/10 ${theme.accentText} shadow-lg ring-1 ring-white/10` : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
      <Icon size={18} />
      <span className="font-cinzel text-xs font-bold tracking-widest uppercase">{label}</span>
      {count > 0 && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse mr-auto">{count}</span>}
    </button>
  );
}

function ActionCard({ href, icon: Icon, title, desc, theme }: any) {
  return (
    <Link href={href} className="group glass-panel p-10 rounded-[2.5rem] border-t border-r flex flex-col items-center text-center gap-6 hover:border-amber-500/30 transition-all duration-700 relative overflow-hidden shadow-xl" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className={`relative z-10 p-5 rounded-2xl bg-white/5 ${theme.accentText} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}><Icon size={32} /></div>
      <div className="relative z-10">
        <h3 className="font-cinzel text-lg font-bold tracking-widest mb-1">{title}</h3>
        <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-cinzel">{desc}</p>
      </div>
      <ChevronLeft size={16} className="text-white/10 group-hover:text-amber-500 group-hover:-translate-x-2 transition-all mt-1" />
    </Link>
  );
}

function InputField({ label, value, onChange, type = "text" }: any) {
  return (
    <div className="space-y-2 text-right">
      <label className="text-xs text-white/30 uppercase tracking-widest block mr-2">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:border-amber-500/50 transition-all font-crimson outline-none text-right shadow-inner" dir="rtl" />
    </div>
  );
}

function TextAreaField({ label, value, onChange }: any) {
  return (
    <div className="space-y-2 text-right">
      <label className="text-xs text-white/30 uppercase tracking-widest block mr-2">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:border-amber-500/50 transition-all font-crimson resize-none outline-none text-right shadow-inner" dir="rtl" />
    </div>
  );
}
