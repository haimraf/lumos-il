"use client";

import { useState } from "react";
import HouseHourglasses from "@/components/HouseHourglasses";
import QuizModal from "../../components/QuizModal"; // המודל החדש שבנינו
import { Sparkles, History, Scroll, Play, ShieldCheck, Trophy } from "lucide-react";
import Script from "next/script";
import { motion } from "framer-motion";

export default function HouseCupPage() {
    const [isQuizOpen, setIsQuizOpen] = useState(false);

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "תחרות גביע הבתים - Lumos IL (HP Fandom Israel)",
        description: "הזירה הרשמית לתחרות בין בתי הוגוורטס בקהילת Lumos IL.",
        isPartOf: {
            "@type": "WebSite",
            name: "Lumos IL",
            url: "https://lumos-il.co.il",
        },
    };

    return (
        <>
            <Script id="house-cup-seo" type="application/ld+json">
                {JSON.stringify(structuredData)}
            </Script>

            <main
                className="relative min-h-screen overflow-hidden bg-[#020617] pt-[220px] md:pt-[270px] pb-32"
                dir="rtl"
            >
                {/* Background - לא נגענו */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.14),transparent_24%),radial-gradient(circle_at_50%_35%,rgba(99,102,241,0.08),transparent_30%),linear-gradient(180deg,#040816_0%,#020617_45%,#030712_100%)]" />
                    <div className="absolute inset-0 bg-[url('/bg-stars.png')] opacity-[0.08]" />

                    {/* Hall depth lines */}
                    <div className="absolute inset-y-0 left-[8%] w-px bg-white/[0.04]" />
                    <div className="absolute inset-y-0 left-[32%] w-px bg-white/[0.04]" />
                    <div className="absolute inset-y-0 right-[32%] w-px bg-white/[0.04]" />
                    <div className="absolute inset-y-0 right-[8%] w-px bg-white/[0.04]" />

                    <div className="absolute top-0 left-1/2 h-[380px] w-[90%] -translate-x-1/2 rounded-b-[3rem] border-b border-white/[0.05] bg-white/[0.02] blur-[1px]" />

                    <MagicalDust />
                    <TorchGlow side="left" />
                    <TorchGlow side="right" />
                </div>

                <div
                    className="relative z-10 px-6"
                    style={{ maxWidth: "80rem", marginLeft: "auto", marginRight: "auto" }}
                >
                    {/* HERO */}
                    <header className="relative mb-20 md:mb-24 text-center">
                        <div className="absolute left-1/2 top-[-90px] h-48 w-48 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />

                        <motion.div
                            initial={{ y: -18, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="inline-flex items-center gap-3 rounded-full border border-amber-500/20 bg-amber-500/8 px-6 py-2.5 backdrop-blur-md"
                        >
                            <Sparkles className="text-amber-400" size={15} />
                            <span className="font-cinzel text-[11px] font-bold tracking-[0.32em] uppercase text-amber-300">
                                התחרות השנתית ה-1
                            </span>
                            <Sparkles className="text-amber-400" size={15} />
                        </motion.div>

                        <motion.h1
                            initial={{ y: 18, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.08 }}
                            className="mt-7 font-cinzel text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-700"
                        >
                            גביע הבתים
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0, scaleX: 0.7 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            transition={{ delay: 0.15 }}
                            className="mx-auto mt-7 h-px w-44 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"
                        />

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.22 }}
                            className="mx-auto mt-7 max-w-3xl font-crimson text-xl italic leading-relaxed text-white/60 md:text-[23px]"
                        >
                            "מעשיכם בתוך כותלי הטירה מהדהדים בין הדפים. כל פיסת ידע, אומץ,
                            נאמנות וחוכמה מוסיפים חול לשעון של הבית שלכם."
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-8 flex items-center justify-center gap-3 text-[10px] font-assistant uppercase tracking-[0.28em] text-white/35"
                        >
                            <div className="h-px w-10 bg-white/10" />
                            <Trophy size={13} className="text-amber-400/70" />
                            <span>היכל התחרות של Lumos IL</span>
                            <Trophy size={13} className="text-amber-400/70" />
                            <div className="h-px w-10 bg-white/10" />
                        </motion.div>
                    </header>

                    {/* HOURGLASS PANEL */}
                    <section
                        className="relative mb-20 overflow-hidden rounded-[3rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-6 shadow-[0_0_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl md:p-10 xl:p-14"
                        aria-labelledby="hourglass-title"
                    >
                        <div className="pointer-events-none absolute inset-0">
                            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.04] to-transparent" />
                            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white/[0.025] to-transparent" />
                            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white/[0.025] to-transparent" />
                            <div className="absolute left-1/2 top-0 h-40 w-[65%] -translate-x-1/2 rounded-b-[2.5rem] bg-amber-300/[0.04] blur-3xl" />
                            <div className="absolute inset-[10px] rounded-[2.4rem] border border-white/[0.05]" />
                        </div>

                        <div className="relative z-10">
                            <div className="mb-10 flex justify-center">
                                <div className="flex items-center gap-3 rounded-full border border-amber-500/25 bg-amber-500/10 px-7 py-3 font-cinzel text-[11px] font-black tracking-[0.28em] text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.12)]">
                                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                                    מצב נוכחי בזמן אמת
                                </div>
                            </div>

                            <div className="mb-8 text-center">
                                <h2 id="hourglass-title" className="font-cinzel text-2xl md:text-3xl font-black tracking-[0.16em] text-white">
                                    מאזן החול של הבתים
                                </h2>
                                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/50 md:text-base">
                                    כל תרומה לקהילה, השתתפות וחיבור לעולם של Lumos IL עשויים לשנות את מאזן הכוחות בין הבתים.
                                </p>
                            </div>

                            <HouseHourglasses />
                        </div>
                    </section>

                    {/* CTA - הוחלף מ-Link ל-button שפותח את המודל */}
                    <section className="mb-24 flex w-full flex-col items-center gap-5">
                        <button
                            onClick={() => setIsQuizOpen(true)}
                            className="group relative flex items-center gap-6 rounded-full border border-white/10 bg-white/5 p-2 pr-8 shadow-[0_0_24px_rgba(245,158,11,0.12)] transition-all duration-500 hover:scale-[1.03] hover:border-amber-400/40 hover:bg-amber-500 hover:shadow-[0_0_60px_rgba(245,158,11,0.34)]"
                        >
                            <div className="text-right">
                                <span className="font-assistant text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80 transition-colors group-hover:text-amber-950/80">
                                    הנביא היומי מציג
                                </span>
                                <div className="mt-1 font-cinzel text-lg font-black tracking-[0.08em] text-white/90 transition-colors group-hover:text-amber-950">
                                    חידון הידע של גלי
                                </div>
                            </div>

                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 shadow-lg transition-colors group-hover:bg-amber-950">
                                <Play fill="currentColor" className="text-amber-950 group-hover:text-amber-500" size={22} />
                            </div>
                        </button>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="flex items-center gap-3 text-[10px] font-assistant uppercase tracking-[0.2em] text-white/35"
                        >
                            <div className="h-px w-8 bg-white/15" />
                            <Sparkles size={11} className="text-amber-500/50" />
                            <span>
                                הצעה של חברת הקהילה:{" "}
                                <span className="font-bold text-amber-400/70">גלי</span>
                            </span>
                            <Sparkles size={11} className="text-amber-500/50" />
                            <div className="h-px w-8 bg-white/15" />
                        </motion.div>
                    </section>

                    {/* INFO CARDS */}
                    <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <InfoCard
                            icon={ShieldCheck}
                            title="הגינות וערכים"
                            text="נקודות מוענקות על תרומה לקהילה, יצירתיות, עזרה הדדית והתנהלות שמכבדת את רוח הטירה."
                            color="text-emerald-400"
                            glow="rgba(16,185,129,0.08)"
                        />
                        <InfoCard
                            icon={Scroll}
                            title="חוקי התחרות"
                            text="הגביע מוענק לבית המוביל בסוף עונת הלימודים, לאחר שכל התרומות וההישגים נספרים באולם הגדול."
                            color="text-amber-400"
                            glow="rgba(245,158,11,0.08)"
                        />
                        <InfoCard
                            icon={History}
                            title="היכל התהילה"
                            text="בקרוב: רשימת אלופי הטירה של Lumos IL לאורך השנים, עם רגעי השיא והבתים שהאירו את האולם."
                            color="text-blue-400"
                            glow="rgba(59,130,246,0.08)"
                        />
                    </section>
                </div>

                {/* מודל החידון - מופיע כשלוחצים */}
                {isQuizOpen && <QuizModal onClose={() => setIsQuizOpen(false)} />}
            </main>
        </>
    );
}

// --- קומפוננטות עזר (ללא שינוי) ---

function InfoCard({ icon: Icon, title, text, color, glow }: any) {
    return (
        <motion.article
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="group relative overflow-hidden rounded-[2rem] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-8 text-right backdrop-blur-xl transition-all hover:border-white/12 hover:-translate-y-1"
            style={{ boxShadow: `0 24px 60px ${glow}` }}
        >
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.035] to-transparent" />
                <div className="absolute inset-[8px] rounded-[1.6rem] border border-white/[0.04]" />
            </div>
            <div className="relative z-10">
                <div className={`mb-6 w-fit rounded-2xl border border-white/8 bg-white/5 p-3.5 ${color} transition-transform group-hover:scale-110`}>
                    <Icon size={22} />
                </div>
                <h3 className="mb-3 font-cinzel text-lg font-bold tracking-wide text-white/90">{title}</h3>
                <p className="font-assistant text-sm leading-relaxed text-white/60">{text}</p>
            </div>
        </motion.article>
    );
}

function MagicalDust() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => (
                <motion.span
                    key={i}
                    className="absolute rounded-full bg-white/30"
                    style={{
                        width: i % 5 === 0 ? 3 : 2,
                        height: i % 5 === 0 ? 3 : 2,
                        left: `${(i * 11.7) % 100}%`,
                        top: `${(i * 9.9) % 100}%`,
                        filter: "blur(0.4px)",
                    }}
                    animate={{ y: [0, -18, 0], x: [0, i % 2 === 0 ? 5 : -5, 0], opacity: [0.04, 0.2, 0.04] }}
                    transition={{ duration: 5 + (i % 6), repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                />
            ))}
        </div>
    );
}

function TorchGlow({ side }: { side: "left" | "right" }) {
    return (
        <div className={`absolute top-24 ${side === "left" ? "left-0" : "right-0"} h-72 w-28`} aria-hidden="true">
            <motion.div
                className="absolute left-1/2 top-0 h-10 w-10 -translate-x-1/2 rounded-full bg-amber-300/20 blur-xl"
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.94, 1.06, 0.94] }}
                transition={{ duration: 2.3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute left-1/2 top-8 h-40 w-20 -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-300/15 via-orange-400/10 to-transparent blur-2xl"
                animate={{ opacity: [0.16, 0.32, 0.16] }}
                transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
}