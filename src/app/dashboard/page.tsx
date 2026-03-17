"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  User,
  Coins,
  Trophy,
  Wand2,
  Users,
  ScrollText,
  ShoppingBag,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Mail,
  Lock,
  Sparkles,
  Zap,
  Home
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import MaraudersMap from "@/components/MaraudersMap";

const HOUSE_THEMES: Record<string, any> = {
  Gryffindor: {
    cardBg: "bg-red-950/10 backdrop-blur-3xl",
    borderColor: "border-red-500/30",
    textColor: "text-red-50",
    accentText: "text-red-500",
    glowColor: "drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]",
    nameHe: "גריפינדור",
    description: "אומץ, תעוזה ואבירות. כאן נבחנת גדולה.",
    nebula: "bg-red-900/10"
  },
  Slytherin: {
    cardBg: "bg-emerald-950/10 backdrop-blur-3xl",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-50",
    accentText: "text-emerald-500",
    glowColor: "drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    nameHe: "סלית'רין",
    description: "שאפתנות, פיקחות וטהרת דם. הדרך לפסגה מתחילה פה.",
    nebula: "bg-emerald-900/10"
  },
  Ravenclaw: {
    cardBg: "bg-blue-950/10 backdrop-blur-3xl",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-50",
    accentText: "text-blue-400",
    glowColor: "drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]",
    nameHe: "רייבנקלו",
    description: "חכמה, יצירתיות ולמידה. הראש פתוח לכל תעלומה.",
    nebula: "bg-blue-900/10"
  },
  Hufflepuff: {
    cardBg: "bg-amber-950/10 backdrop-blur-3xl",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-50",
    accentText: "text-amber-500",
    glowColor: "drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]",
    nameHe: "הפלפאף",
    description: "טוב לב, נאמנות ועבודה קשה. הבית של כולם.",
    nebula: "bg-amber-900/10"
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { sendOwl } = useOwlMail();

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const [isUpdating, setIsUpdating] = useState(false);

  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const hasAnnounced = useRef(false);

  const refreshProfileData = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profileData) {
      setProfile((prev: any) => ({ ...prev, ...profileData }));
      setNewName(profileData.full_name || "");
      setNewGender(profileData.gender || "male");
      return profileData;
    }
    return null;
  }, [supabase]);

  useEffect(() => {
    let profileChannel: any;
    const initDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const profileData = await refreshProfileData(session.user.id);
      if (!profileData || !profileData.house || profileData.house === 'Unsorted') {
        router.push('/sorting');
        return;
      }

      setProfile({ ...profileData, email: session.user.email });
      setNewEmail(session.user.email || "");
      setIsLoading(false);

      if (!hasAnnounced.current) {
        const welcomeText = profileData.gender === 'female' ? "ברוכה הבאה" : "ברוכים הבאים";
        sendOwl(welcomeText, `שמחים לראות אותך שוב בחדר המועדון.`, "info");
        hasAnnounced.current = true;
      }

      profileChannel = supabase
        .channel(`dashboard_updates_${session.user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
          (payload) => setProfile((prev: any) => ({ ...prev, ...payload.new })))
        .subscribe();
    };

    initDashboard();
    return () => { if (profileChannel) supabase.removeChannel(profileChannel); };
  }, [router, supabase, sendOwl, refreshProfileData]);

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    const { error } = await supabase.from('profiles').update({ full_name: newName, gender: newGender }).eq('id', profile.id);
    if (!error) {
      sendOwl("הלחש הצליח!", "פרטי הפרופיל שלך עודכנו.", "success");
      refreshProfileData(profile.id);
    }
    setIsUpdating(false);
  };

  const handleUpdateAuth = async (type: 'email' | 'password') => {
    setIsUpdating(true);
    const updateData: any = {};
    if (type === 'email') updateData.email = newEmail;
    if (type === 'password') updateData.password = newPassword;

    const { error } = await supabase.auth.updateUser(updateData);
    if (!error) {
      sendOwl("אבטחה עודכנה", `${type === 'email' ? 'האימייל' : 'הסיסמה'} עודכנו.`, "success");
      if (type === 'password') setNewPassword("");
    } else {
      sendOwl("תקלת קסם", error.message, "error");
    }
    setIsUpdating(false);
  };

  const handleResetHouse = async () => {
    if (profile.galleons < 500) {
      sendOwl("אין מספיק זהב", "עליך לאסוף 500 גליאונים.", "error");
      return;
    }
    if (profile.house_changes_count >= 1) {
      sendOwl("הגורל נחתם", "כבר ניצלת את המיון החוזר שלך.", "error");
      return;
    }

    const { error } = await supabase.from('profiles').update({ house: 'Unsorted', galleons: profile.galleons - 500, house_changes_count: 1 }).eq('id', profile.id);
    if (!error) {
      sendOwl("שיקוי החרטה פעל", "המצנפת ממתינה לך...", "magic");
      setTimeout(() => router.push('/sorting'), 2000);
    }
  };

  if (isLoading) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#020617]"><div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin"></div></div>;

  const theme = HOUSE_THEMES[profile?.house] || HOUSE_THEMES['Gryffindor'];
  const welcomeVerb = profile?.gender === 'female' ? "ברוכה הבאה" : "ברוכים הבאים";

  return (
    <div className="relative w-full max-w-7xl mx-auto px-6 py-8 lg:py-12" dir="rtl">
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full ${theme.nebula} blur-[120px] animate-pulse opacity-60`}></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 order-2 lg:order-1 shrink-0">
          <div className={`rounded-[2.5rem] border ${theme.borderColor} bg-black/40 backdrop-blur-3xl p-8 shadow-2xl flex flex-col gap-8`}>
            <div className="flex flex-col items-center gap-4 border-b border-white/5 pb-6">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${theme.colors} p-1`}>
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                  <User className={theme.accentText} size={32} />
                </div>
              </div>
              <h3 className="font-cinzel text-lg font-bold">{profile?.full_name || "קוסם/ת"}</h3>
              <span className="text-[10px] uppercase tracking-widest text-white/30">{profile?.email}</span>
            </div>

            <nav className="flex flex-col gap-2">
              <TabButton icon={Zap} label="מרכז הפעילות" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} theme={theme} />
              <TabButton icon={Settings} label="הגדרות חשבון" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} theme={theme} />

              {profile?.role === 'מנהל' && (
                <Link href="/admin-panel" className="mt-4 flex items-center gap-4 w-full p-4 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-black transition-all">
                  <ShieldCheck size={18} />
                  <span className="font-cinzel text-xs font-bold uppercase tracking-widest">חדר מנהלים</span>
                </Link>
              )}
            </nav>

            <div className="space-y-6 pt-6 border-t border-white/5">
              <StatItem icon={User} label="דרגה" value={profile?.role || "תלמיד/ה"} theme={theme} />
              <StatItem icon={Coins} label="גליאונים" value={profile?.galleons || 0} theme={theme} highlight="text-amber-500" />
              <StatItem icon={Trophy} label="נקודות" value={profile?.points_contributed || 0} theme={theme} />
            </div>

            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="w-full pt-6 flex items-center justify-center gap-3 text-[10px] text-red-400/50 hover:text-red-400 font-cinzel tracking-widest uppercase transition-all group/out">
              <LogOut size={14} />
              <span>התעתקות מהטירה</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 order-1 lg:order-2 space-y-10 w-full">

          {activeTab === 'overview' ? (
            <>
              {/* Hero Section עם תיקון מרווחים */}
              <section className={`relative overflow-hidden rounded-[3rem] border ${theme.borderColor} ${theme.cardBg} p-10 md:p-16 shadow-2xl ${theme.glowColor}`}>
                <div className="relative z-10 flex flex-col gap-4 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-40 mb-6">
                    <span className="font-cinzel text-[10px] tracking-[0.4em] text-amber-500 uppercase">Room of Requirement</span>
                    <span className="h-[1px] w-10 bg-amber-500"></span>
                  </div>
                  <div className="space-y-8">
                    <h2 className="font-cinzel text-xl text-white/40 tracking-widest block">{welcomeVerb} לבית</h2>
                    <h1 className={`font-cinzel text-5xl md:text-[7rem] font-black tracking-tighter leading-[1.1] ${theme.accentText} mt-4`}>
                      {theme.nameHe}
                    </h1>
                  </div>
                  <div className={`mt-10 border-r-4 ${theme.borderColor} pr-6 max-w-xl mr-0 ml-auto`}>
                    <p className="font-crimson text-xl md:text-2xl leading-relaxed text-white/70 italic">"{theme.description}"</p>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                <ActionCard href="/great-hall" icon={Users} title="האולם הגדול" desc="קהילה ושיחות" theme={theme} />
                <ActionCard href="/ollivanders" icon={ShoppingBag} title="סמטת דיאגון" desc="ציוד ושרביטים" theme={theme} />
                <ActionCard href="/quests" icon={ScrollText} title="לוח משימות" desc="צבירת נקודות" theme={theme} />
              </div>
              <div className="mt-10">
                <MaraudersMap />
              </div>
            </>
          ) : (
            <div className={`rounded-[3rem] border ${theme.borderColor} bg-black/40 backdrop-blur-3xl p-10 md:p-16 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <div className="flex justify-between items-center mb-8">
                <button onClick={() => setActiveTab('overview')} className="flex items-center gap-2 text-white/40 hover:text-white transition-all font-cinzel text-xs font-bold uppercase tracking-widest">
                  <ChevronRight size={18} /> חזרה ללוח הבקרה
                </button>
                <div className="flex items-center gap-4 text-left">
                  <div className={`p-4 rounded-2xl bg-white/5 ${theme.accentText}`}><Settings size={32} /></div>
                  <div className="text-right">
                    <h2 className="font-cinzel text-2xl font-bold italic leading-none mb-2">הגדרות קסם</h2>
                    <p className="font-crimson text-white/40 italic">ניהול הזהות שלך</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-white/5">
                <div className="space-y-6">
                  <h3 className="font-cinzel text-sm text-amber-500 uppercase tracking-widest flex items-center gap-2"><User size={16} /> פרטים אישיים</h3>
                  <div className="space-y-4">
                    <InputField label="שם הקוסם/ת" value={newName} onChange={setNewName} />
                    <div className="space-y-2 text-right">
                      <label className="text-[10px] text-white/30 uppercase tracking-widest block mr-2">מגדר (בשביל השפה באתר)</label>
                      <select value={newGender} onChange={(e) => setNewGender(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none">
                        <option value="male" className="bg-[#020617]">קוסם (זכר)</option>
                        <option value="female" className="bg-[#020617]">מכשפה (נקבה)</option>
                      </select>
                    </div>
                    <button onClick={handleUpdateProfile} disabled={isUpdating} className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold">עדכן פרופיל</button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="font-cinzel text-sm text-amber-500 uppercase tracking-widest flex items-center gap-2"><Lock size={16} /> אבטחה וגישה</h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <InputField label="אימייל חדש" value={newEmail} onChange={setNewEmail} />
                      <button onClick={() => handleUpdateAuth('email')} className="absolute left-3 top-9 text-xs text-amber-500 hover:underline">עדכן</button>
                    </div>
                    <div className="relative">
                      <InputField label="סיסמה חדשה" value={newPassword} onChange={setNewPassword} type="password" />
                      <button onClick={() => handleUpdateAuth('password')} className="absolute left-3 top-9 text-xs text-amber-500 hover:underline">עדכן</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`mt-12 p-8 rounded-[2rem] border-2 border-dashed ${theme.borderColor} bg-white/[0.02] flex flex-col md:flex-row items-center gap-8`}>
                <div className={`p-6 rounded-full bg-white/5 ${theme.accentText} animate-pulse`}><Sparkles size={40} /></div>
                <div className="flex-1 text-center md:text-right">
                  <h4 className="font-cinzel text-xl font-bold mb-2 uppercase tracking-widest">שיקוי הזדמנות שנייה</h4>
                  <p className="font-crimson text-white/50 text-lg">המצנפת מוכנה לשקול שוב את גורלך... תמורת תרומה של 500 גליאונים.</p>
                </div>
                <button onClick={handleResetHouse} disabled={profile?.house_changes_count >= 1 || profile?.galleons < 500} className="px-10 py-5 rounded-full bg-amber-600 hover:bg-amber-500 disabled:bg-white/5 disabled:text-white/20 text-amber-950 font-black text-lg transition-all shadow-xl active:scale-95 flex items-center gap-3">
                  <Coins size={20} />
                  {profile?.house_changes_count >= 1 ? "נוצלה ההזדמנות" : "מיון מחדש (500)"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Components ---
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

function TabButton({ icon: Icon, label, active, onClick, theme }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-300 ${active ? `bg-white/10 ${theme.accentText} shadow-lg` : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
      <Icon size={18} />
      <span className="font-cinzel text-xs font-bold tracking-widest uppercase">{label}</span>
    </button>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <div className="space-y-2 text-right">
      <label className="text-[10px] text-white/30 uppercase tracking-widest block mr-2">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 transition-all font-crimson" />
    </div>
  );
}

function ActionCard({ href, icon: Icon, title, desc, theme }: any) {
  return (
    <Link href={href} className={`group p-10 rounded-[2.5rem] border ${theme.borderColor} bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500 flex flex-col items-center text-center gap-6 shadow-xl relative overflow-hidden`}>
      <div className={`p-5 rounded-2xl bg-white/5 ${theme.accentText} group-hover:bg-white/10 transition-all`}><Icon size={32} /></div>
      <div>
        <h3 className="font-cinzel text-lg font-bold tracking-widest mb-1">{title}</h3>
        <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-cinzel">{desc}</p>
      </div>
      <ChevronLeft size={16} className="text-white/10 group-hover:text-amber-500 group-hover:-translate-x-2 transition-all mt-1" />
    </Link>
  );
}