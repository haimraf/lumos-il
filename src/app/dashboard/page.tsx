"use client";

import imageCompression from "browser-image-compression";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import {
  Coins, Trophy, Wand2, Users, ScrollText, ShoppingBag,
  ChevronRight, LogOut, Settings, Mail, Lock, Sparkles, Zap, Home, Bell,
  Trash2, CheckCircle2, Briefcase, Star, BookOpen, ShieldAlert, X, ExternalLink, Clock, Swords, Camera, Loader2, type LucideIcon
} from "lucide-react";
import { useOwlMail } from "@/components/OwlMail";
import MaraudersMap from "@/components/MaraudersMap";
import HouseCupLeaderboard from "@/components/HouseCupLeaderboard";
import { useAuth } from "@/context/AuthContext";
import MagicTraitsCard from "../../components/MagicTraitsCard";
import PatronusQuiz from "@/components/PatronusQuiz";
import MagicAvatar from "@/components/MagicAvatar";
import SpellRitual from "@/components/SpellRitual";
import CanonBadge from "@/components/CanonBadge";
import { renderAvatarFrameBlob } from "@/lib/mediaFraming";
import { computeNextActions, type NextActionRecommendation } from "@/lib/gameplay/nextActionEngine";
import {
  computeQuestProgress,
  fetchQuestActivitySummary,
  type ComputedQuest,
  type ProfileQuestSnapshot,
} from "@/lib/gameplay/questProgress";
import { fetchQuestCatalog, subscribeToQuestCatalogChanges } from "@/lib/gameplay/questCatalog";
import { getYearFromProfile, getYearTitle, getYearLabel, getNextYearRequirements } from "@/lib/yearSystem";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";
import { fetchUserNotifications, type NotificationItem } from "@/lib/userNotifications";
import { getSpellCanonMeta } from "@/lib/wizardingCanon";

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

function isAlmostDoneQuest(quest: Pick<ComputedQuest, "progress" | "target" | "status">) {
  if (quest.status === "completed" || quest.progress <= 0 || quest.target <= 0) return false;
  const percent = (quest.progress / quest.target) * 100;
  return (quest.target - quest.progress) <= 1 || percent >= 80;
}

function missionUrgencyMeta(urgency: NextActionRecommendation["urgency"]) {
  if (urgency === "high") {
    return {
      label: "דחוף להיום",
      badge: "border-rose-400/30 bg-rose-500/10 text-rose-100",
      accent: "text-rose-200",
    };
  }

  if (urgency === "medium") {
    return {
      label: "חלון טוב להתקדם",
      badge: "border-amber-400/30 bg-amber-500/10 text-amber-100",
      accent: "text-amber-200",
    };
  }

  return {
    label: "קצב חופשי",
    badge: "border-sky-400/30 bg-sky-500/10 text-sky-100",
    accent: "text-sky-200",
  };
}

function questTypeLabel(type: ComputedQuest["type"]) {
  if (type === "daily") return "יעד יומי";
  if (type === "weekly") return "קשת שבועית";
  if (type === "main") return "מסע ראשי";
  if (type === "house") return "שליחות בית";
  return "חקירה";
}

function MissionActionGlyph({ href, size }: { href: string; size: number }) {
  if (href === "/arena") return <Swords size={size} />;
  if (href === "/map") return <Home size={size} />;
  if (href === "/quests") return <Sparkles size={size} />;
  return <Zap size={size} />;
}

type MissionTheme = {
  accentText: string;
  accent?: string;
};

type QuickRoute = {
  href: string;
  label: string;
  meta: string;
  icon: LucideIcon;
  highlight?: boolean;
};

function dailyCapHint(dailyPointsEarned: number) {
  const remaining = Math.max(0, 50 - dailyPointsEarned);
  if (remaining === 0) return "מכסת הנקודות של היום נסגרה, אבל עדיין פתוחים גליאונים, התקדמות סיפור ונוכחות ברחבי הטירה.";
  return `צברת ${dailyPointsEarned}/50. פתוחות בפניך עוד ${remaining} נקודות למסע של היום!`;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());
  const { sendOwl } = useOwlMail();
  const { profile, session, refreshProfile, isLoading: authLoading, profileError } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'notifications' | 'inventory' | 'spells'>('overview');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [spells, setSpells] = useState<any[]>([]);
  const [activeRitual, setActiveRitual] = useState<any | null>(null);
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newSignature, setNewSignature] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [missionActions, setMissionActions] = useState<NextActionRecommendation[]>([]);
  const [missionQuests, setMissionQuests] = useState<ComputedQuest[]>([]);
  const [missionLoading, setMissionLoading] = useState(true);
  const hasAnnounced = useRef(false);
  const prevYearRef = useRef<number | null>(null);
  const [roleColors, setRoleColors] = useState<Record<string, string>>({});
  const [myGroup, setMyGroup] = useState<{ name: string; color: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { getRoleColorFromDB(supabase).then(setRoleColors); }, [supabase]);
  useEffect(() => {
    if (!profile?.group_id) { setMyGroup(null); return; }
    supabase.from('user_groups').select('name, color').eq('id', profile.group_id).single()
      .then(({ data }: { data: { name: string; color: string } | null }) => setMyGroup(data || null));
  }, [profile?.group_id, supabase]);

  const formatNotificationContent = (content: string, type: string) => {
    if (type === 'quote') return content.replace('ציטוט שלך בדיון', 'בתגובה מצוטטת לדיון');
    if (type === 'tag') return content.replace('תיוג שלך בדיון', 'בתיוג בתוך הדיון');
    return content;
  };

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

  const handleAvatarUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const userId = session?.user?.id;
    if (!file || !userId) return;

    setUploadingAvatar(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/webp",
      });
      const sourcePath = `${userId}/avatar-source.webp`;
      const { error: sourceError } = await supabase.storage.from("avatars").upload(sourcePath, compressed, { upsert: true });
      if (sourceError) throw sourceError;
      const framedAvatar = await renderAvatarFrameBlob(compressed, {
        position: "50% 50%",
        zoom: 1,
      });

      const path = `${userId}/avatar.webp`;
      const { error } = await supabase.storage.from("avatars").upload(path, framedAvatar, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      await refreshProfile();
      sendOwl("הדיוקן עודכן", "התמונה החדשה נשמרה בדף הקוסם שלך.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "לא הצלחנו לעדכן את האווטאר.";
      sendOwl("שגיאת אווטאר", message, "error");
    } finally {
      event.target.value = "";
      setUploadingAvatar(false);
    }
  }, [refreshProfile, sendOwl, session?.user?.id, supabase]);

  const fetchNotifications = useCallback(async (userId: string) => {
    const { notifications: nextNotifications, error } = await fetchUserNotifications(supabase, userId);
    if (error) {
      console.error("[Dashboard] fetch notifications failed:", error);
      return;
    }

    setNotifications(nextNotifications);
  }, [supabase]);

  const fetchSpells = useCallback(async () => {
    const { data } = await supabase.from('spells').select('*').order('min_year', { ascending: true });
    if (data) setSpells(data);
  }, [supabase]);

  const loadMissionFocus = useCallback(async () => {
    if (!profile?.id) {
      setMissionActions([]);
      setMissionQuests([]);
      setMissionLoading(false);
      return;
    }

    setMissionLoading(true);

    const profileSnapshot: ProfileQuestSnapshot = {
      id: profile.id,
      house: profile.house,
      points_contributed: profile.points_contributed,
      daily_points_earned: profile.daily_points_earned,
      last_reward_date: profile.last_reward_date,
      last_trivia_date: profile.last_trivia_date,
      last_niffler_date: profile.last_niffler_date,
      last_snitch_date: profile.last_snitch_date,
    };

    try {
      const [activity, questCatalog] = await Promise.all([
        fetchQuestActivitySummary(supabase, profile.id),
        fetchQuestCatalog(supabase),
      ]);
      const questProgress = computeQuestProgress(profileSnapshot, activity, questCatalog);

      setMissionQuests(questProgress.quests);
      setMissionActions(
        computeNextActions({
          profile: profileSnapshot,
          questProgress,
        }),
      );
    } finally {
      setMissionLoading(false);
    }
  }, [
    profile?.daily_points_earned,
    profile?.house,
    profile?.id,
    profile?.last_niffler_date,
    profile?.last_reward_date,
    profile?.last_snitch_date,
    profile?.last_trivia_date,
    profile?.points_contributed,
    supabase,
  ]);

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
        sendOwl("חזרה נעימה לטירה", "שמחים לראותך שוב בחדר המועדון.", "info");
        hasAnnounced.current = true;
      }
    }
    return () => { if (profileChannel) supabase.removeChannel(profileChannel); };
  }, [session?.user?.id, profile?.gender, fetchSpells, fetchNotifications, refreshProfile, sendOwl, supabase]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const notificationChannel = supabase
      .channel(`dashboard_notifications_${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        () => {
          void fetchNotifications(session.user.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(notificationChannel);
    };
  }, [fetchNotifications, session?.user?.id, supabase]);

  useEffect(() => {
    void loadMissionFocus();
  }, [loadMissionFocus]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const missionChannel = supabase
      .channel(`dashboard_mission_focus_${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_events', filter: `actor_id=eq.${session.user.id}` },
        () => {
          void loadMissionFocus();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(missionChannel);
    };
  }, [loadMissionFocus, session?.user?.id, supabase]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const questCatalogChannel = subscribeToQuestCatalogChanges(
      supabase,
      `dashboard-${session.user.id}`,
      loadMissionFocus,
    );

    return () => {
      supabase.removeChannel(questCatalogChannel);
    };
  }, [loadMissionFocus, session?.user?.id, supabase]);

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
    if (!error) { sendOwl("הלחש הצליח!", "דף הקוסם שלך עודכן.", "success"); refreshProfile(); }
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
    const { error } = await supabase.rpc('reset_house_secure');
    if (!error) { sendOwl("שיקוי החרטה פעל", "המצנפת ממתינה לך...", "magic"); setTimeout(() => router.push('/sorting'), 2000); }
    else { sendOwl("שיקוי החרטה נכשל", error.message, "error"); }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((current) => current.map((notification) => (
      notification.id === id ? { ...notification, is_read: true } : notification
    )));
  };

  const markAllNotificationsAsRead = async () => {
    if (!session?.user?.id || notifications.every((notification) => notification.is_read)) return;

    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);

    if (error) {
      console.error("[Dashboard] mark all as read failed:", error.message);
      void fetchNotifications(session.user.id);
    }
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  };

  const deleteAllNotifications = async () => {
    if (!session?.user?.id) return;
    await supabase.from('notifications').delete().eq('user_id', session.user.id);
    setNotifications([]);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center" dir="rtl">
      <div className="text-center space-y-4">
        <Wand2 className="mx-auto text-amber-500 animate-pulse" size={48} />
        <p className="font-crimson text-white/40 text-sm">טוען את הדף האישי...</p>
      </div>
    </div>
  );

  if (!session) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6" dir="rtl">
        <div className="max-w-lg w-full rounded-[2rem] border border-amber-500/20 bg-black/30 p-8 text-center space-y-5 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
            <Lock className="text-amber-400" size={28} />
          </div>
          <div>
            <h1 className="font-cinzel text-2xl font-black text-white mb-2">הדאשבורד האישי פתוח רק לקוסמים מחוברים</h1>
            <p className="font-crimson text-white/55 leading-relaxed">
              כדי לראות התקדמות, משימות, התראות והגדרות אישיות, צריך קודם להתחבר לחשבון שלך בטירה.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-cinzel font-black uppercase tracking-widest text-amber-950"
            >
              כניסה לטירה
              <ChevronRight size={15} />
            </Link>
            <Link
              href="/home"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-cinzel font-black uppercase tracking-widest text-white/70 transition-all hover:border-white/20 hover:text-white"
            >
              להמשיך כאורח
              <Home size={15} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6" dir="rtl">
        <div className="max-w-md w-full rounded-[2rem] border border-amber-500/20 bg-black/30 p-8 text-center space-y-5 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
          <Wand2 className="mx-auto text-amber-500" size={42} />
          <div>
            <h1 className="font-cinzel text-2xl font-black text-white mb-2">הכניסה נפתחה, אבל דף הקוסם עוד מתארגן</h1>
            <p className="font-crimson text-white/55 leading-relaxed">
              {profileError || "אפשר לנסות לרענן את הדף האישי בלי לנתק את החשבון."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => refreshProfile()}
              className="px-5 py-3 rounded-xl bg-amber-500 text-amber-950 font-cinzel font-black text-sm tracking-widest uppercase"
            >
              רענון הדף האישי
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
  const primaryMission = missionActions[0] ?? null;
  const secondaryMissions = missionActions.slice(1);
  const activeMissionQuests = missionQuests.filter((quest) => quest.status === "active");
  const completedDailyMissions = missionQuests.filter((quest) => quest.type === "daily" && quest.status === "completed").length;
  const totalDailyMissions = missionQuests.filter((quest) => quest.type === "daily").length;
  const almostDoneMissions = activeMissionQuests.filter((quest) => isAlmostDoneQuest(quest));
  const trackedMissionQuests = [...activeMissionQuests]
    .sort((a, b) => {
      const aScore = (isAlmostDoneQuest(a) ? 100 : 0) + (a.target > 0 ? (a.progress / a.target) * 100 : 0);
      const bScore = (isAlmostDoneQuest(b) ? 100 : 0) + (b.target > 0 ? (b.progress / b.target) * 100 : 0);
      return bScore - aScore;
    })
    .slice(0, 2);
  const dailyPointCap = 50;
  const dailyPointsEarned = Math.max(0, Math.min(profile?.daily_points_earned || 0, dailyPointCap));
  const dailyPointsPercent = (dailyPointsEarned / dailyPointCap) * 100;
  const unreadNotificationsCount = notifications.filter((notification) => !notification.is_read).length;
  const duelAlertsCount = notifications.filter((notification) => !notification.is_read && (notification.type === "duel_result" || notification.type === "duel_missed")).length;
  const discussionAlertsCount = notifications.filter((notification) => !notification.is_read && notification.target_url && notification.type !== "duel_result" && notification.type !== "duel_missed").length;
  const currentYear = getYearFromProfile(profile);
  const badgeColor = myGroup?.color || getRoleColor(profile?.role, profile?.house, roleColors);
  const badgeLabel = myGroup?.name || profile?.role || "";
  const identitySummary = `${getYearTitle(currentYear)} · שנה ${getYearLabel(currentYear)} · מסלול קסם פעיל`;

  return (
    <>
      {/* Mobile tab strip */}
      <div className="lg:hidden sticky top-0 z-30 bg-[#0a0e1a]/90 backdrop-blur-md border-b border-white/[0.06] px-2 py-1.5" dir="rtl">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {([
            { tab: 'overview',      icon: Home,      label: 'לוח בקרה' },
            { tab: 'inventory',     icon: Briefcase, label: 'חפצים' },
            { tab: 'spells',        icon: BookOpen,  label: 'כשפים' },
            { tab: 'notifications', icon: Bell,      label: 'התראות', count: notifications.filter(n => !n.is_read).length },
            { tab: 'settings',      icon: Settings,  label: 'הגדרות' },
          ] as const).map(({ tab, icon: Icon, label, count }: any) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); router.push(`/dashboard?tab=${tab}`); }}
              className={`shrink-0 relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-[10px] font-cinzel font-bold tracking-wide ${
                activeTab === tab
                  ? `text-white bg-white/[0.08] border border-white/10`
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-black flex items-center justify-center text-white">{count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 md:px-6 py-8 lg:py-12 min-h-screen" dir="rtl">

        {activeRitual && (
          <SpellRitual
            spell={activeRitual}
            onSuccess={async () => {
              await supabase.rpc('learn_spell_secure', { p_spell_id: activeRitual.id });
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
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br ${theme.colors} p-1 shadow-lg ring-2 ring-white/10`}>
                    <MagicAvatar
                      avatarUrl={profile?.avatar_url}
                      name={profile?.full_name}
                      house={profile?.house}
                      className="w-full h-full"
                      roundedClassName="rounded-full"
                      fallbackClassName="text-3xl md:text-4xl"
                    />
                  </div>
                  <div>
                    <h3 className="font-cinzel text-xl md:text-2xl font-black tracking-tight mb-1"
                    style={{ color: badgeColor }}>
                      {profile?.full_name}
                    </h3>
                    <span className="text-xs text-white/30 font-cinzel tracking-widest block">{identitySummary}</span>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      {badgeLabel && (
                        <span style={{
                          fontSize: "9px", fontWeight: 900, fontFamily: "'Cinzel', serif",
                          textTransform: "uppercase", letterSpacing: "0.12em",
                          padding: "4px 12px", borderRadius: "999px",
                          color: badgeColor, background: `${badgeColor}18`, border: `1px solid ${badgeColor}40`,
                        }}>
                          {badgeLabel}
                        </span>
                      )}
                      {profile?.patronus && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-[0.16em] text-white/55">
                          <span className="text-sm leading-none">{PATRONUS_ANIMALS[profile.patronus]?.emoji || "🔮"}</span>
                          {PATRONUS_ANIMALS[profile.patronus]?.nameHe || profile.patronus}
                        </span>
                      )}
                      {profile?.wand_type && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-[0.16em] text-white/55">
                          <Wand2 size={11} className="text-amber-400/70" />
                          {profile.wand_type}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[10px] font-cinzel font-black uppercase tracking-[0.18em] text-amber-100 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploadingAvatar ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                      {uploadingAvatar ? "מעלה..." : "שנה אווטאר"}
                    </button>
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
                    <span className="font-cinzel text-xs font-bold tracking-widest uppercase">הדף האישי שלי</span>
                  </Link>
                )}
                <TabButton icon={Home} label="לוח בקרה" active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); router.push('/dashboard?tab=overview'); }} theme={theme} />
                <TabButton icon={Briefcase} label="מזוודת חפצים" active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); router.push('/dashboard?tab=inventory'); }} theme={theme} />
                <TabButton icon={BookOpen} label="ספר כשפים" active={activeTab === 'spells'} onClick={() => { setActiveTab('spells'); router.push('/dashboard?tab=spells'); }} theme={theme} />
                <TabButton icon={Bell} label="התראות" active={activeTab === 'notifications'} onClick={() => { setActiveTab('notifications'); router.push('/dashboard?tab=notifications'); }} theme={theme} count={notifications.filter(n => !n.is_read).length} />
                <TabButton icon={Settings} label="הגדרות קסם" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); router.push('/dashboard?tab=settings'); }} theme={theme} />
                {profile?.role === 'מנהל' && (
                  <Link href="/admin-panel" className="flex items-center gap-4 w-full p-4 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 mt-4 transition-all">
                    <ShieldAlert size={18} />
                    <span className="font-cinzel text-xs font-bold uppercase tracking-widest">ניהול הטירה</span>
                  </Link>
                )}
              </nav>

              <div className="relative z-10 pt-6 mt-6 border-t border-white/10 space-y-4">
                <StatItem icon={Coins} label="גליאונים" value={profile?.galleons || 0} theme={theme} highlight="text-amber-500" />
                <StatItem icon={Trophy} label="נקודות בית" value={profile?.points_contributed || 0} theme={theme} />
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
              <div className="space-y-8 md:space-y-10 animate-in fade-in duration-1000">

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
                      <h2 className="font-cinzel text-xl text-white/40 tracking-widest">חדר המועדון של הבית</h2>
                      <h1 className={`font-cinzel text-4xl sm:text-5xl md:text-[7rem] font-black tracking-tighter leading-[1.1] ${theme.accentText} ${theme.glowColor}`}>
                        {theme.nameHe}
                      </h1>
                    </div>
                    <div className={`mt-10 border-r-4 ${theme.borderColor} pr-6 max-w-xl mr-0 ml-auto`}>
                      <p className="font-crimson text-xl md:text-2xl leading-relaxed text-white/70 italic text-right">"{theme.description}"</p>
                    </div>

                    {/* Progress — שנת לימודים */}
                    {(() => {
                      const currentYear = getYearFromProfile(profile);
                      const req = getNextYearRequirements(profile);
                      const MONTH_THRESHOLDS = [0, 3, 6, 12, 18, 24, 36];
                      const POST_THRESHOLDS  = [0, 5, 15, 30, 60, 100, 150];
                      const monthsOld = profile?.created_at
                        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
                        : 0;
                      const postCount = profile?.post_count || 0;
                      const prevM = MONTH_THRESHOLDS[currentYear - 1];
                      const nextM = MONTH_THRESHOLDS[Math.min(currentYear, 6)];
                      const prevP = POST_THRESHOLDS[currentYear - 1];
                      const nextP = POST_THRESHOLDS[Math.min(currentYear, 6)];
                      const monthPct = currentYear >= 7 ? 100 : nextM === prevM ? 100 : Math.min(100, Math.round(((monthsOld - prevM) / (nextM - prevM)) * 100));
                      const postPct  = currentYear >= 7 ? 100 : nextP === prevP ? 100 : Math.min(100, Math.round(((postCount - prevP) / (nextP - prevP)) * 100));
                      const accent = theme.accent || "#f59e0b";
                      return (
                        <div className="mt-8 w-full max-w-xl mr-0 ml-auto">
                          {/* Year milestone track */}
                          <div className="relative mb-3">
                            <div className="flex justify-between items-end mb-1">
                              {[1,2,3,4,5,6,7].map(y => {
                                const done = y < currentYear;
                                const active = y === currentYear;
                                return (
                                  <div key={y} className="flex flex-col items-center gap-0.5">
                                    <span className="font-cinzel text-[8px]" style={{ color: active ? accent : done ? `${accent}80` : "rgba(255,255,255,0.12)" }}>
                                      {getYearLabel(y)}
                                    </span>
                                    <div className={`w-2 h-2 rounded-full border transition-all ${active ? "scale-125" : ""}`}
                                      style={{
                                        background: done || active ? accent : "transparent",
                                        borderColor: done || active ? accent : "rgba(255,255,255,0.15)",
                                        boxShadow: active ? `0 0 6px ${accent}` : undefined,
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            {/* connecting line */}
                            <div className="absolute bottom-[7px] left-[5px] right-[5px] h-px bg-white/[0.07]" />
                            <div className="absolute bottom-[7px] left-[5px] h-px transition-all duration-1000"
                              style={{
                                width: `${((currentYear - 1) / 6) * 100}%`,
                                background: `linear-gradient(to left, ${accent}, ${accent}60)`,
                              }}
                            />
                          </div>

                          {/* dual bars */}
                          {currentYear < 7 && (
                            <div className="space-y-2 mt-1">
                              {/* months bar */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-cinzel text-[9px] text-white/30 tracking-wider">חודשי פעילות</span>
                                  <span className="font-cinzel text-[9px]" style={{ color: monthPct >= 100 ? accent : "rgba(255,255,255,0.25)" }}>
                                    {monthsOld} / {nextM} {req && req.months > 0 ? `(עוד ${req.months})` : "✓"}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${monthPct}%`, background: accent, boxShadow: `0 0 5px ${accent}60` }}
                                  />
                                </div>
                              </div>
                              {/* posts bar */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-cinzel text-[9px] text-white/30 tracking-wider">פוסטים בפורום</span>
                                  <span className="font-cinzel text-[9px]" style={{ color: postPct >= 100 ? accent : "rgba(255,255,255,0.25)" }}>
                                    {postCount} / {nextP} {req && req.posts > 0 ? `(עוד ${req.posts})` : "✓"}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${postPct}%`, background: accent, boxShadow: `0 0 5px ${accent}60` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          {currentYear >= 7 && (
                            <p className="text-center font-cinzel text-[10px] mt-1" style={{ color: accent }}>בוגר הוגוורטס — הושלם! 🎓</p>
                          )}
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

                <MissionFocusStrip
                  theme={theme}
                  loading={missionLoading}
                  primaryAction={primaryMission}
                  secondaryActions={secondaryMissions}
                  trackedQuests={trackedMissionQuests}
                  activeQuestCount={activeMissionQuests.length}
                  almostDoneCount={almostDoneMissions.length}
                  completedDailyCount={completedDailyMissions}
                  totalDailyCount={totalDailyMissions}
                  dailyPointsEarned={dailyPointsEarned}
                  dailyPointsPercent={dailyPointsPercent}
                  unreadNotifications={unreadNotificationsCount}
                />

                <OverviewSectionLead
                  eyebrow="מירוץ חי"
                  title="הבית שלך לא רץ לבד"
                  description="גביע הבתים יושב עכשיו בתוך מסך הכניסה, כדי שהשפעת כל פעולה תורגש גם מחוץ ללוח המשימות."
                />
                <HouseCupLeaderboard />

                {/* ✨ תכונות קסומות מולדות */}
                <MagicTraitsCard profile={profile} theme={theme} />

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
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="w-full space-y-2 text-right md:flex-1">
                    <h2 className="w-full font-cinzel text-2xl md:text-3xl font-black flex flex-row-reverse items-center justify-start gap-4 text-white">
                      <Bell className={theme.accentText} />
                      <span>התראות ועדכונים</span>
                    </h2>
                    <p className="text-sm text-white/45">
                      כאן נשמרות כל ההודעות שהטירה שלחה אליך. הדרופדאון למעלה מציג את האחרונות, והסיכום כאן מתייחס רק למה שעדיין מחכה לעין שלך.
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 md:shrink-0">
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-300/70 hover:text-emerald-200 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all font-cinzel uppercase tracking-widest"
                      >
                        <CheckCircle2 size={14} /> סמן הכול כנקרא
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={deleteAllNotifications}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-cinzel uppercase tracking-widest"
                      >
                        <Trash2 size={14} /> מחק הכל
                      </button>
                    )}
                  </div>
                </div>
                <NotificationsPulseStrip
                  totalCount={notifications.length}
                  unreadCount={unreadNotificationsCount}
                  duelAlertsCount={duelAlertsCount}
                  discussionAlertsCount={discussionAlertsCount}
                />
                <div className="space-y-4">
                  {notifications.length > 0 ? notifications.map((n) => (
                    <div key={n.id} className={`p-6 md:p-8 rounded-[2rem] border ${!n.is_read ? 'bg-white/[0.03] border-white/10 shadow-xl' : 'bg-transparent border-white/5 opacity-50'} flex flex-col md:flex-row items-center justify-between gap-6 transition-all`}>
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className={`p-4 rounded-full ${!n.is_read ? 'bg-amber-500/20 text-amber-500' : 'bg-white/5 text-white/20'}`}>
                          <Mail size={24} />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-sm md:text-base text-white/90 font-medium mb-1">
                            {(() => {
                              const actorProfile = Array.isArray(n.actor_profile) ? n.actor_profile[0] : n.actor_profile;

                              if (!actorProfile?.full_name) {
                                return <span>{formatNotificationContent(n.content, n.type)}</span>;
                              }

                              return (
                                <>
                                  <span className={`font-bold ${theme.accentText}`}>{actorProfile.full_name}</span>
                                  {" "}{formatNotificationContent(n.content?.replace(actorProfile.full_name, '').trim(), n.type)}
                                </>
                              );
                            })()}
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
                  )) : <div className="py-24 opacity-30 font-cinzel italic text-center text-xl">אין התראות כרגע.</div>}
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
                    <InputField label="השם שיישמע בטירה" value={newName} onChange={setNewName} />
                    <div className="space-y-2 text-right">
                      <label className="text-xs text-white/30 uppercase tracking-widest mr-2 block">צורת פנייה</label>
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
                <div className="space-y-5 border-b border-white/10 pb-6 text-right">
                  <h2 className="font-cinzel text-4xl font-black text-white uppercase tracking-widest">ספר הכשפים התקני</h2>
                  <p className="max-w-3xl text-sm leading-7 text-white/60">
                    כאן תראה מה נשען ישירות על הספרים והסרטים, ומהו טקס לימוד משחקי של הטירה. הלחש עצמו
                    מגיע מן הסאגה; אופן התרגול כאן הוא הדרך של LUMOS להפוך את הלמידה למוחשית יותר.
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <CanonBadge source="both" />
                    <CanonBadge source="site" />
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  {spells.map((s) => {
                    const locked = profile?.year < s.min_year;
                    const learned = profile?.learned_spells?.includes(s.id);
                    const canonMeta = getSpellCanonMeta(s);
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
                        {canonMeta && (
                          <div className="mb-7 rounded-[2rem] border border-white/10 bg-black/20 p-4 text-right">
                            <div className="mb-3 flex flex-wrap justify-end gap-2">
                              <CanonBadge source={canonMeta.source} />
                            </div>
                            <div className="grid gap-3 text-sm text-white/68 sm:grid-cols-3">
                              <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3">
                                <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.2em] text-white/30">תוכנית לימודים</p>
                                <p className="mt-2 leading-6 text-white/82">{canonMeta.curriculum}</p>
                              </div>
                              <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3">
                                <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.2em] text-white/30">מזוהה עם</p>
                                <p className="mt-2 leading-6 text-white/82">{canonMeta.knownWith}</p>
                              </div>
                              <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3">
                                <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.2em] text-white/30">מופיע ב־</p>
                                <p className="mt-2 leading-6 text-white/82">{canonMeta.appearsIn}</p>
                              </div>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-white/55">{canonMeta.note}</p>
                          </div>
                        )}
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

function MissionFocusStrip({
  theme,
  loading,
  primaryAction,
  secondaryActions,
  trackedQuests,
  activeQuestCount,
  almostDoneCount,
  completedDailyCount,
  totalDailyCount,
  dailyPointsEarned,
  dailyPointsPercent,
  unreadNotifications,
}: {
  theme: MissionTheme;
  loading: boolean;
  primaryAction: NextActionRecommendation | null;
  secondaryActions: NextActionRecommendation[];
  trackedQuests: ComputedQuest[];
  activeQuestCount: number;
  almostDoneCount: number;
  completedDailyCount: number;
  totalDailyCount: number;
  dailyPointsEarned: number;
  dailyPointsPercent: number;
  unreadNotifications: number;
}) {
  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 md:p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-bl from-white/[0.04] via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="h-3 w-36 rounded-full bg-white/10" />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6 space-y-4">
              <div className="h-4 w-28 rounded-full bg-white/10" />
              <div className="h-10 w-3/4 rounded-2xl bg-white/10" />
              <div className="h-4 w-full rounded-full bg-white/10" />
              <div className="h-4 w-4/5 rounded-full bg-white/10" />
            </div>
            <div className="space-y-4">
              <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
                <div className="h-4 w-24 rounded-full bg-white/10 mb-4" />
                <div className="h-2 w-full rounded-full bg-white/10" />
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
                <div className="h-4 w-32 rounded-full bg-white/10 mb-3" />
                <div className="h-10 w-full rounded-2xl bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!primaryAction) {
    return (
      <section className="relative overflow-hidden rounded-[2.5rem] border border-emerald-400/20 bg-emerald-500/[0.05] p-6 md:p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(74,222,128,0.14),transparent_45%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="text-right">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-cinzel font-black uppercase tracking-[0.24em] text-emerald-100">
              <Sparkles size={12} />
              המשמרת שקטה כרגע
            </div>
            <h3 className="font-cinzel text-2xl font-black text-white">השלמת את כל המשימות הפעילות בלוח הזה</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
              אפשר לנצל את השקט כדי לעבור על לוח המשימות המלא, לבדוק אם נפתחו פעילויות חדשות, או פשוט לשמור מומנטום דרך הבית והקהילה.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/quests"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 font-cinzel text-xs font-black uppercase tracking-[0.24em] text-emerald-950 transition-all hover:scale-[1.02]"
            >
              <Sparkles size={14} />
              ללוח המשימות
            </Link>
            <Link
              href="/forums"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/20 px-6 py-3 font-cinzel text-xs font-black uppercase tracking-[0.24em] text-white/75 transition-all hover:border-white/20 hover:text-white"
            >
              <Users size={14} />
              להיכנס לקהילה
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const urgency = missionUrgencyMeta(primaryAction.urgency);
  const quickRoutes: QuickRoute[] = [
    {
      href: "/quests",
      label: "לוח המשימות",
      meta: `${activeQuestCount} פתוחות.`,
      icon: ScrollText,
      highlight: true,
    },
    {
      href: "/dashboard?tab=notifications",
      label: "התראות",
      meta: unreadNotifications > 0 ? `${unreadNotifications} חדשות.` : "אין חדשות כרגע.",
      icon: Bell,
      highlight: unreadNotifications > 0,
    },
    {
      href: "/arena",
      label: "הזירה",
      meta: "דו-קרב אחד יכול להפוך את המומנטום!",
      icon: Swords,
    },
    {
      href: "/map",
      label: "המפה",
      meta: "חזרה מהירה למסלולי החקירה.",
      icon: Home,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 md:p-8 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_38%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/[0.03] blur-[90px] pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="order-2 text-right md:order-1">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-cinzel font-black uppercase tracking-[0.24em] text-amber-200">
              <Zap size={12} />
              במוקד
            </div>
            <h3 className="font-cinzel text-2xl font-black text-white md:text-3xl">מה כדאי לעשות עכשיו?</h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">
              הלוח מושך קדימה את ההמלצות החמות ביותר, כדי שלא תצטרך לנחש מאיפה נכון להתחיל.
            </p>
          </div>

          <div className="order-1 flex flex-wrap items-center justify-end gap-3 md:order-2">
            <MissionMetric label="משימות פתוחות" value={activeQuestCount.toString()} accent={theme.accentText} />
            <MissionMetric label="כמעט סגור" value={almostDoneCount.toString()} accent="text-amber-300" />
            <MissionMetric
              label="יומיות"
              value={totalDailyCount > 0 ? `${completedDailyCount}/${totalDailyCount}` : "0/0"}
              accent="text-emerald-300"
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-[0_0_30px_rgba(15,23,42,0.2)]">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-cinzel font-black uppercase tracking-[0.24em] ${urgency.badge}`}>
                <Clock size={12} />
                {urgency.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-cinzel font-black uppercase tracking-[0.2em] text-white/80">
                <Trophy size={12} />
                {primaryAction.progressLabel}
              </span>
            </div>

            <div className="mt-6 flex items-start justify-between gap-4">
              <div className={`shrink-0 rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4 ${theme.accentText}`}>
                <MissionActionGlyph href={primaryAction.href} size={26} />
              </div>
              <div className="flex-1 text-right">
                <h4 className="font-cinzel text-2xl font-black text-white">{primaryAction.title}</h4>
                <p className="mt-3 text-sm leading-7 text-white/65">{primaryAction.reason}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 text-right">
                <div className="text-[10px] font-cinzel uppercase tracking-[0.24em] text-white/30">תגמול</div>
                <div className="mt-2 text-sm font-bold text-amber-100">{primaryAction.gainLabel}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 text-right">
                <div className="text-[10px] font-cinzel uppercase tracking-[0.24em] text-white/30">השפעת בית</div>
                <div className="mt-2 text-sm font-bold text-white/90">{primaryAction.houseImpactLabel}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 text-right">
                <div className="text-[10px] font-cinzel uppercase tracking-[0.24em] text-white/30">קצב</div>
                <div className={`mt-2 text-sm font-bold ${urgency.accent}`}>{questTypeLabel(primaryAction.questType)}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href={primaryAction.href}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-6 py-3 font-cinzel text-xs font-black uppercase tracking-[0.24em] text-amber-950 transition-all hover:scale-[1.02]"
              >
                <MissionActionGlyph href={primaryAction.href} size={14} />
                לצעד הבא
              </Link>
              <Link
                href="/quests"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/20 px-6 py-3 font-cinzel text-xs font-black uppercase tracking-[0.24em] text-white/75 transition-all hover:border-white/20 hover:text-white"
              >
                <ScrollText size={14} />
                לכל היעדים
              </Link>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/15 p-4">
              <div className="mb-3 text-right">
                <div className="text-[10px] font-cinzel uppercase tracking-[0.24em] text-white/30">קיצורי דרך חכמים</div>
                <div className="mt-1 text-sm text-white/60">גישה מהירה ליעדים הבאים שלך.</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickRoutes.map((route) => (
                  <QuickRoutePill key={route.href} route={route} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-left">
                  <div className="font-cinzel text-xl font-black text-white">{dailyPointsEarned}/50</div>
                  <div className="text-[10px] font-cinzel uppercase tracking-[0.24em] text-white/25">מכסת נקודות יומית</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-cinzel uppercase tracking-[0.24em] text-white/30">כמה נקודות כבר נסגרו במסע היומי שלך?</div>
                  <div className="mt-1 text-sm text-white/65">המסע היומי עדיין פתוח, וכל נקודה שנסגרת דוחפת את הלוח קדימה.</div>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${dailyPointsPercent}%`,
                    background: theme.accent || "#f59e0b",
                    boxShadow: `0 0 20px ${theme.accent || "#f59e0b"}66`,
                  }}
                />
              </div>
              <div className="mt-3 text-right text-sm leading-6 text-white/55">
                {dailyCapHint(dailyPointsEarned)}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-left text-xs font-cinzel uppercase tracking-[0.24em] text-white/25">צעדי המשך</div>
                <div className="text-right">
                  <div className="text-[10px] font-cinzel uppercase tracking-[0.24em] text-white/30">מסלולים פתוחים</div>
                  <div className="mt-1 text-sm text-white/65">המשימות הארוכות יותר מחכות שתדחוף אותן קדימה.</div>
                </div>
              </div>

              <div className="space-y-3">
                {secondaryActions.length > 0 ? secondaryActions.map((action) => {
                  return (
                    <Link
                      key={action.id}
                      href={action.href}
                      className="flex items-start justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/80">
                        <MissionActionGlyph href={action.href} size={16} />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="font-cinzel text-sm font-black text-white">{action.title}</div>
                        <div className="mt-1 text-xs leading-6 text-white/55">{action.gainLabel} · {action.progressLabel}</div>
                      </div>
                    </Link>
                  );
                }) : (
                  <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-right text-sm leading-7 text-white/55">
                    כרגע המיקוד הראשי מספיק חזק בפני עצמו. אחרי שתסגור אותו, הלוח כבר ימשוך אותך אל הצעד הבא.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {trackedQuests.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {trackedQuests.map((quest) => (
              <MissionTrack key={quest.id} quest={quest} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MissionMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="min-w-[108px] rounded-[1.5rem] border border-white/10 bg-black/25 px-4 py-3 text-right shadow-lg">
      <div className="text-[10px] font-cinzel uppercase tracking-[0.24em] text-white/25">{label}</div>
      <div className={`mt-2 font-cinzel text-lg font-black ${accent}`}>{value}</div>
    </div>
  );
}

function MissionTrack({ quest }: { quest: ComputedQuest }) {
  const percent = quest.target > 0 ? Math.min((quest.progress / quest.target) * 100, 100) : 0;
  const almostDone = isAlmostDoneQuest(quest);

  return (
    <div className={`rounded-[1.75rem] border p-4 text-right transition-all ${almostDone ? "border-amber-400/25 bg-amber-500/[0.06]" : "border-white/10 bg-black/20"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`text-[11px] font-cinzel uppercase tracking-[0.22em] ${almostDone ? "text-amber-200" : "text-white/30"}`}>
          {almostDone ? "עוד רגע נסגר" : "במסלול"}
        </div>
        <div className="flex-1 text-right">
          <div className="font-cinzel text-sm font-black text-white">{quest.title}</div>
          <div className="mt-1 text-xs leading-6 text-white/55">{quest.objectiveLabel}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px]">
        <span className={`font-bold ${almostDone ? "text-amber-100" : "text-white/75"}`}>{quest.progress}/{quest.target}</span>
        <span className="text-white/30">{quest.houseImpactLabel}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${almostDone ? "bg-gradient-to-r from-amber-300 via-amber-400 to-orange-300" : "bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function OverviewSectionLead({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 text-right">
      <div className="inline-flex w-fit self-end rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.26em] text-white/45">
        {eyebrow}
      </div>
      <div>
        <h3 className="font-cinzel text-2xl font-black text-white md:text-3xl">{title}</h3>
        <p className="mt-2 max-w-2xl mr-0 ml-auto text-sm leading-7 text-white/58">{description}</p>
      </div>
    </div>
  );
}

function QuickRoutePill({ route }: { route: QuickRoute }) {
  const Icon = route.icon;

  return (
    <Link
      href={route.href}
      className={`flex items-start justify-between gap-4 rounded-[1.25rem] border px-4 py-3 text-right transition-all ${
        route.highlight
          ? "border-amber-400/20 bg-amber-500/10 hover:border-amber-300/35 hover:bg-amber-500/15"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
      }`}
    >
      <div className={`shrink-0 rounded-xl border p-3 ${route.highlight ? "border-amber-400/20 bg-amber-500/10 text-amber-100" : "border-white/10 bg-white/[0.04] text-white/75"}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1">
        <div className="font-cinzel text-sm font-black text-white">{route.label}</div>
        <div className="mt-1 text-xs leading-6 text-white/55">{route.meta}</div>
      </div>
    </Link>
  );
}

function NotificationsPulseStrip({
  totalCount,
  unreadCount,
  duelAlertsCount,
  discussionAlertsCount,
}: {
  totalCount: number;
  unreadCount: number;
  duelAlertsCount: number;
  discussionAlertsCount: number;
}) {
  const primaryHref = duelAlertsCount > 0 ? "/arena" : "/dashboard?tab=overview";
  const primaryLabel = duelAlertsCount > 0 ? "לקפוץ לזירה" : "חזרה ללוח הראשי";
  const summaryCopy =
    unreadCount === 0
      ? totalCount > 0
        ? `יש ${totalCount} התראות אחרונות בתיבה, אבל כולן כבר נקראו. אפשר לעיין בהיסטוריה המלאה ממש כאן למטה.`
        : "אין כרגע שום דבר שמחכה לטיפול. אפשר להמשיך ללוח הראשי או למשימות בלי לפספס עדכון."
      : duelAlertsCount > 0
        ? `מחכות לך ${duelAlertsCount} התראות שקשורות לזירה ודורשות תשומת לב מהירה.`
        : discussionAlertsCount > 0
          ? `יש ${discussionAlertsCount} עדכוני קהילה פתוחים שמחכים לקריאה או מעבר מהיר.`
          : `יש כרגע ${unreadCount} התראות חדשות שמומלץ לעבור עליהן כדי לשמור על רצף.`;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-cinzel font-black uppercase tracking-[0.24em] text-white/65">
            <Bell size={12} />
            מצב התראות
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">{summaryCopy}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <MissionMetric label="לא נקראו" value={unreadCount.toString()} accent={unreadCount > 0 ? "text-amber-300" : "text-white/60"} />
          <MissionMetric label="דו-קרב" value={duelAlertsCount.toString()} accent={duelAlertsCount > 0 ? "text-rose-300" : "text-white/60"} />
          <MissionMetric label="קהילה" value={discussionAlertsCount.toString()} accent={discussionAlertsCount > 0 ? "text-sky-300" : "text-white/60"} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-5 py-3 font-cinzel text-xs font-black uppercase tracking-[0.24em] text-amber-950 transition-all hover:scale-[1.02]"
        >
          {duelAlertsCount > 0 ? <Swords size={14} /> : <Zap size={14} />}
          {primaryLabel}
        </Link>
        <Link
          href="/quests"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/20 px-5 py-3 font-cinzel text-xs font-black uppercase tracking-[0.24em] text-white/75 transition-all hover:border-white/20 hover:text-white"
        >
          <ScrollText size={14} />
          ללוח המשימות
        </Link>
      </div>
    </div>
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
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={count > 0 ? `${label} (${count} חדשים)` : label}
      className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-500 ${active ? `bg-white/10 ${theme.accentText} shadow-lg ring-1 ring-white/10` : 'text-white/40 hover:text-white hover:bg-white/5'}`}
    >
      <Icon size={18} />
      <span className="font-cinzel text-xs font-bold tracking-widest uppercase">{label}</span>
      {count > 0 && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse mr-auto">{count}</span>}
    </button>
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
