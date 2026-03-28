"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useOwlMail } from "@/components/OwlMail";
import { logActivityEvent } from "@/lib/activityEvents";
import CanonBadge from "@/components/CanonBadge";
import { DIAGON_ALLEY_GUIDE } from "@/lib/wizardingCanon";
import { Coins, Sparkles, Shield, Wand2, Users, ScrollText, ChevronRight, ShoppingBag, Zap, Star, Map } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
const CATEGORIES = [
    { id: 'all', label: 'כל הסמטה', icon: ShoppingBag },
    { id: 'wands', label: 'שרביטים', icon: Wand2 },
    { id: 'companion', label: 'חיות ומלווים', icon: Users },
    { id: 'potions', label: 'רוקחות ושיקויים', icon: Sparkles },
    { id: 'cards', label: 'קלפי צפרדע', icon: ScrollText },
    { id: 'travel', label: 'ציוד נסיעות', icon: Map },
];

const RARITY_THEMES: Record<string, { card: string; badge: string; label: string }> = {
    legendary: {
        card: 'border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.25)]',
        badge: 'border-purple-500/40 bg-purple-950/60 text-purple-300',
        label: 'אגדי'
    },
    epic: {
        card: 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]',
        badge: 'border-amber-500/40 bg-amber-950/60 text-amber-300',
        label: 'אפי'
    },
    rare: {
        card: 'border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]',
        badge: 'border-blue-500/40 bg-blue-950/60 text-blue-300',
        label: 'נדיר'
    },
    common: {
        card: 'border-white/8 shadow-none',
        badge: 'border-white/10 bg-white/5 text-white/40',
        label: 'רגיל'
    }
};

function getRarity(item: any) {
    return RARITY_THEMES[item.rarity] || RARITY_THEMES.common;
}

// ✅ קומפוננטת תמונה עם fallback
function ItemImage({ src, alt, rarity }: { src?: string; alt: string; rarity: string }) {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-white/[0.03] to-transparent gap-3">
                <ShoppingBag className="text-white/10 w-14 h-14" />
                <span className="font-cinzel text-[9px] text-white/15 uppercase tracking-widest text-center px-4">{alt}</span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
            onError={() => setError(true)}
        />
    );
}

function ShopContent() {
    const [supabase] = useState(() => createClient());
    const { profile, refreshProfile, session, profileError, isLoading: authLoading } = useAuth();
    const { sendOwl } = useOwlMail();

    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [purchasingId, setPurchasingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchShopItems = async () => {
            const { data } = await supabase.from('shop_items').select('*').order('price', { ascending: true });
            if (data) {
                setItems(data);
                console.log('[shop] unique categories:', [...new Set(data.map((i: any) => i.category))]);
            }
            setLoading(false);
        };
        fetchShopItems();
    }, [supabase]);

    const handlePurchase = async (item: any) => {
        if (!profile) return;

        if (profile.galleons < item.price) {
            sendOwl("אין מספיק זהב!", `חסרים לך ${item.price - profile.galleons} גליאונים.`, "error");
            return;
        }
        if (profile.year < (item.min_year || 1)) {
            sendOwl("חפץ מתקדם מדי", `החפץ דורש שנת לימוד ${item.min_year} ומעלה.`, "error");
            return;
        }

        const currentInventory = profile.inventory || { items: [], equipped_pet: null };
        if (item.is_one_time) {
            const alreadyOwned = currentInventory.items?.some((i: any) => i.id === item.id);
            if (alreadyOwned) {
                sendOwl("כבר ברשותך!", "חפץ זה ניתן לרכישה פעם אחת בלבד.", "error");
                return;
            }
        }

        setPurchasingId(item.id);

        const newInventory = {
            ...currentInventory,
            items: [...(currentInventory.items || [])],
        };
        const newItemToAdd = {
            id: item.id, name: item.name, rarity: item.rarity,
            image_url: item.image_url, boosts: item.stats_boost, equipped: false,
            category: item.category
        };

        newInventory.items.push(newItemToAdd);

        const { error } = await supabase.rpc('purchase_item_secure', {
            p_item_id: item.id,
            p_price: item.price,
            p_new_inventory: newInventory
        });

        if (!error) {
            sendOwl("רכישה מוצלחת!", `${item.name} התווסף למזוודה!`, "success");
            if (session?.user?.id) {
                await logActivityEvent(supabase, {
                    actorId: session.user.id,
                    eventType: "shop_purchase",
                    icon: "🛍️",
                    title: "רכש/ה פריט חדש בסמטת דיאגון",
                    subtitle: item.name,
                    description: `${item.price} גליאונים`,
                    targetType: "shop_item",
                    targetId: item.id,
                    targetUrl: "/shop",
                });
            }
            refreshProfile();
        } else {
            sendOwl("שגיאת גרינגוטס", error.message || "משהו השתבש...", "error");
        }
        setPurchasingId(null);
    };

    const filteredItems = activeCategory === 'all'
        ? items
        : items.filter(item => item.category === activeCategory);
    const activeGuide = DIAGON_ALLEY_GUIDE.find((entry) => entry.id === activeCategory) || DIAGON_ALLEY_GUIDE[0];

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="w-10 h-10 border-t-2 border-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (session && !profile) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6" dir="rtl">
                <div className="max-w-md w-full rounded-[2rem] border border-amber-500/20 bg-black/30 p-8 text-center space-y-5 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
                    <ShoppingBag className="mx-auto text-amber-500" size={42} />
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
                                window.location.assign("/");
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

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 pb-24 font-crimson relative overflow-x-hidden" dir="rtl">

            {/* הילת רקע */}
            <div className="absolute top-0 left-1/4 w-[60vw] h-[60vw] bg-amber-600/[0.07] rounded-full blur-[180px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/[0.03] rounded-full blur-[150px] pointer-events-none" />

            {/* ✅ תיקון רוחב */}
            <div className="px-4 md:px-6 pt-10 relative z-10" style={{ maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto' }}>

                {/* סרגל עליון */}
                <div className="flex justify-between items-center mb-16 border-b border-white/5 pb-8">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-white/40 hover:text-amber-400 transition-colors font-cinzel text-[10px] uppercase tracking-[0.2em] group"
                    >
                        <ChevronRight size={14} className="group-hover:-translate-x-1 transition-transform" />
                        חזרה לטירה
                    </Link>
                    <div className="glass-panel px-5 md:px-7 py-2.5 rounded-full border border-amber-500/25 flex items-center gap-3 bg-black/60">
                        <span className="text-[10px] text-white/35 uppercase tracking-widest font-cinzel hidden md:inline">יתרת זהב</span>
                        <div className="flex items-center gap-2 text-amber-400 font-black text-xl">
                            <Coins size={18} />
                            {profile?.galleons?.toLocaleString() || 0}
                        </div>
                    </div>
                </div>

                {/* Hero */}
                <div className="text-center mb-8 md:mb-20 mt-4 md:mt-0">
                    <div className="inline-block mb-3 md:mb-5 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-500/60 font-cinzel text-[10px] tracking-[0.4em] uppercase">
                        London, Charing Cross Road
                    </div>
                    <h1 className="font-cinzel text-4xl sm:text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-500 to-amber-900 mb-5 tracking-tighter">
                        סמטת דיאגון
                    </h1>
                    <div className="h-px w-40 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mx-auto mb-6" />
                    <p className="text-lg md:text-xl text-white/40 italic max-w-xl mx-auto leading-relaxed">
                        "כאן מתחילים שנת לימודים כמו שצריך: שרביט, רוקחות, ינשוף וקצת מקום במזוודה."
                    </p>
                </div>

                <div className="mb-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[2.4rem] border border-white/10 bg-black/25 p-6 text-right">
                        <div className="mb-3 flex flex-wrap justify-end gap-2">
                            <CanonBadge source={activeGuide.source} />
                        </div>
                        <h2 className="font-cinzel text-2xl font-black text-white">{activeGuide.title}</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">
                            {activeGuide.summary}
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {DIAGON_ALLEY_GUIDE.filter((entry) => entry.id !== "all").map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                onClick={() => setActiveCategory(entry.id)}
                                className={`rounded-[2rem] border p-4 text-right transition-all ${
                                    activeCategory === entry.id
                                        ? "border-amber-500/35 bg-amber-500/10"
                                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                                }`}
                            >
                                <div className="mb-3 flex flex-wrap justify-end gap-2">
                                    <CanonBadge source={entry.source} />
                                </div>
                                <p className="font-cinzel text-sm font-black text-white">{entry.title}</p>
                                <p className="mt-2 text-sm leading-6 text-white/55 line-clamp-2">{entry.summary}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ✅ קטגוריות — עם מספר פריטים */}
                <div className="flex flex-wrap justify-center gap-3 mb-8 md:mb-14 pb-3 w-full">
                    {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = activeCategory === cat.id;
                        const count = cat.id === 'all'
                            ? items.length
                            : items.filter(i => i.category === cat.id).length;

                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-2.5 px-4 py-2.5 md:px-5 md:py-3.5 rounded-2xl font-cinzel text-[10px] uppercase tracking-widest transition-all duration-300 border ${isActive
                                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                                    : 'bg-white/4 border-white/6 text-white/35 hover:text-white/60 hover:border-white/15'
                                    }`}
                            >
                                <Icon size={14} />
                                {cat.label}
                                {count > 0 && (
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-white/8 text-white/30'}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* גריד */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="w-10 h-10 border-t-2 border-amber-500 rounded-full animate-spin" />
                        <span className="font-cinzel text-[11px] text-amber-500/40 tracking-widest uppercase animate-pulse">פותחים את החנויות...</span>
                    </div>
                ) : filteredItems.length > 0 ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeCategory}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        >
                            {filteredItems.map((item, i) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <ShopCard
                                        item={item}
                                        profile={profile}
                                        onPurchase={handlePurchase}
                                        purchasingId={purchasingId}
                                    />
                                </motion.div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[3rem]">
                        <ShoppingBag className="mx-auto text-white/8 mb-6 w-16 h-16" />
                        <h3 className="font-cinzel text-lg text-white/20 italic tracking-widest">
                            סמטה ריקה בקטגוריה זו
                        </h3>
                    </div>
                )}
            </div>
        </div>
    );
}

function ShopCard({ item, profile, onPurchase, purchasingId }: any) {
    const rarity = getRarity(item);
    const guide = DIAGON_ALLEY_GUIDE.find((entry) => entry.id === item.category);
    const canAfford = profile?.galleons >= item.price;
    const yearMet = profile?.year >= (item.min_year || 1);
    const isPurchasable = canAfford && yearMet;
    const isBuying = purchasingId === item.id;

    return (
        <div className={`group relative flex flex-col h-full bg-[#080d1a]/80 rounded-[2rem] border transition-all duration-500 hover:-translate-y-2 overflow-hidden ${rarity.card}`}>

            {/* תמונה */}
            <div className="w-full h-56 relative overflow-hidden bg-black/40 shrink-0">
                <ItemImage src={item.image_url} alt={item.name} rarity={item.rarity} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-transparent to-transparent opacity-70" />

                {/* תגיות */}
                <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                    <span className={`text-[9px] font-cinzel font-black px-2.5 py-1 rounded-full border uppercase tracking-[0.15em] backdrop-blur-sm ${rarity.badge}`}>
                        {rarity.label}
                    </span>
                    {guide && (
                        <CanonBadge source={guide.source} className="justify-center backdrop-blur-sm" />
                    )}
                    {item.min_year > 1 && (
                        <span className="text-[9px] font-cinzel px-2.5 py-1 rounded-full border border-red-500/30 bg-red-950/70 text-red-400 uppercase tracking-widest backdrop-blur-sm flex items-center gap-1">
                            <Shield size={9} /> שנה {item.min_year}+
                        </span>
                    )}
                </div>
            </div>

            {/* תוכן */}
            <div className="flex-1 flex flex-col p-5">
                <h3 className="font-cinzel text-lg font-bold text-white/90 group-hover:text-amber-400 transition-colors mb-1.5 leading-snug">
                    {item.name}
                </h3>
                <p className="text-sm text-white/40 italic mb-4 line-clamp-2 leading-relaxed flex-1">
                    {item.description}
                </p>
                {guide && (
                    <div className="mb-4 rounded-xl border border-white/6 bg-white/[0.03] px-3 py-3 text-right">
                        <p className="font-cinzel text-[9px] font-black uppercase tracking-[0.18em] text-white/28">
                            מסגרת קאנונית
                        </p>
                        <p className="mt-2 text-xs leading-6 text-white/58">
                            {guide.summary}
                        </p>
                    </div>
                )}

                {/* בוסטים */}
                {item.stats_boost && Object.keys(item.stats_boost).length > 0 && (
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 mb-4 space-y-1.5">
                        {Object.entries(item.stats_boost).map(([key, val]: any) => (
                            <div key={key} className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400/70 uppercase">
                                <Zap size={10} className="text-amber-600 shrink-0" />
                                {key.replace(/_/g, ' ')}: +{val}
                            </div>
                        ))}
                    </div>
                )}

                {/* מחיר + כפתור */}
                <div className="border-t border-white/5 pt-4 space-y-3 mt-auto">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-cinzel text-white/20 uppercase tracking-[0.3em]">מחיר</span>
                        <div className={`flex items-center gap-1.5 font-black text-lg ${canAfford ? 'text-amber-400' : 'text-red-400/70'}`}>
                            <Coins size={15} />
                            {item.price.toLocaleString()}
                        </div>
                    </div>

                    <button
                        onClick={() => onPurchase(item)}
                        disabled={isBuying || !isPurchasable}
                        className={`w-full py-3.5 rounded-xl font-cinzel font-black text-[11px] tracking-[0.15em] uppercase transition-all duration-300 ${isBuying
                            ? 'bg-amber-600/50 text-amber-950/50 cursor-wait'
                            : isPurchasable
                                ? 'bg-amber-600 hover:bg-amber-500 text-amber-950 shadow-[0_8px_20px_rgba(217,119,6,0.2)] hover:shadow-[0_12px_28px_rgba(217,119,6,0.35)] active:scale-95'
                                : 'bg-white/4 text-white/20 cursor-not-allowed'
                            }`}
                    >
                        {isBuying ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-3 h-3 border-t-2 border-amber-950 rounded-full animate-spin" />
                                רוקח קסם...
                            </span>
                        ) : !canAfford ? "אין מספיק זהב"
                            : !yearMet ? `דרושה שנה ${item.min_year}`
                                : "רכוש חפץ"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ShopPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="w-10 h-10 border-t-2 border-amber-500 rounded-full animate-spin" />
            </div>
        }>
            <ShopContent />
        </Suspense>
    );
}
