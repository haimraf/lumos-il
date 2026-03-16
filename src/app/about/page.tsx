import { Metadata } from "next";
import { Sparkles, Star, Zap, Users, ShieldCheck, Wand2, Compass } from "lucide-react";
import Link from "next/link"; // <-- ייבוא קריטי לניתוב הכפתור

export const metadata: Metadata = {
  title: "הסיפור מאחורי האור | LUMOS IL",
  description: "איך הפכנו את החלום לטירה? גלו את הסיפור של לומוס ישראל - הבית הדיגיטלי האינטראקטיבי של קהילת הקוסמים בארץ.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-20 px-6 relative overflow-hidden" dir="rtl">

      {/* רקע Blueprint עדין שמתחבר למפה */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/blueprint.png')]"></div>

      <div className="max-w-5xl mx-auto space-y-32 relative z-10">

        {/* Hero Section - השער לטירה */}
        <section className="text-center space-y-10 animate-in fade-in zoom-in duration-1000">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 font-cinzel text-xs tracking-[0.4em] uppercase shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Wand2 size={16} /> THE STORY BEHIND THE LIGHT
          </div>

          <h1 className="font-cinzel text-6xl md:text-8xl font-black leading-none tracking-tighter">
            הבית שבו <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              הקסם מתגורר
            </span>
          </h1>

          <p className="font-crimson text-2xl md:text-4xl text-amber-100/90 italic max-w-3xl mx-auto leading-tight">
            &quot;לומוס ישראל הוא לא עוד אתר מעריצים. הוא המקום שבו המכתב שחיכיתם לו בגיל 11 סוף סוף מגיע.&quot;
          </p>
        </section>

        {/* Nostalgia & Vision - החיבור לקהילה */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8 font-crimson text-2xl leading-relaxed">
            <div className="inline-block p-3 bg-white/5 rounded-2xl border border-white/10 mb-2">
              <Compass className="text-amber-500" size={32} />
            </div>
            <h2 className="font-cinzel text-4xl font-black text-white border-r-4 border-amber-500 pr-6 uppercase tracking-widest">
              החזון שלנו
            </h2>
            <div className="space-y-6 text-white">
              <p>
                הכל התחיל מהרצון להחזיר את תחושת הקהילה האמיתית. זוכרים את הימים של <span className="font-black text-amber-400">Habbo</span> או <span className="font-black text-amber-400">Club Penguin</span>? את המקומות שבהם הייתה לכם זהות אמיתית, חדר משלכם וחברים מכל הארץ?
              </p>
              <p>
                לקחנו את הגעגוע העמוק ההוא, שילבנו אותו עם העולם המופלא של הארי פוטר שכולנו גדלנו עליו, ויצרנו את <span className="text-amber-500 font-bold">Lumos IL</span>.
              </p>
              <p className="bg-amber-500/10 p-5 rounded-xl border border-amber-500/30 text-amber-50">
                כאן, אינכם רק &quot;משתמשים&quot; אנונימיים במסך - אתם קוסמים ומכשפות. יש לכם בית להתגאות בו, שרביט שבחר בכם, וסיפור שרק מחכה שתיצרו אותו.
              </p>
            </div>
          </div>

          {/* visual element */}
          <div className="relative group">
            <div className="absolute inset-0 bg-amber-500/30 blur-[120px] rounded-full animate-pulse"></div>
            <div className="relative bg-black/60 border-2 border-amber-500/30 rounded-[4rem] p-12 shadow-2xl backdrop-blur-md transform group-hover:rotate-2 transition-transform duration-700">
              <Zap size={150} className="text-amber-500 mx-auto drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]" />
              <div className="mt-8 text-center">
                <span className="font-cinzel text-amber-500 font-bold tracking-widest uppercase">Pure Magic Technology</span>
              </div>
            </div>
          </div>
        </section>

        {/* Values - קלפים בולטים לנגישות */}
        <section className="space-y-16 py-20">
          <h2 className="font-cinzel text-4xl font-black text-center text-white tracking-widest">עמודי התווך של הטירה</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <ValueCard
              icon={<Users size={40} />}
              title="קהילה חיה"
              description="אנחנו מאמינים בשיח מכבד, חברויות חדשות ומרחב בטוח שבו כל אחד יכול להיות בדיוק מי שהוא."
            />
            <ValueCard
              icon={<Star size={40} />}
              title="חוויה אינטראקטיבית"
              description="מטקס המיון המותח ועד מפת הקונדסאים - הכל נבנה כדי שתהיו חלק מהעולם, ולא רק צופים מהצד."
            />
            <ValueCard
              icon={<ShieldCheck size={40} />}
              title="נאמנות ליצירה"
              description="האתר נבנה באהבה על ידי מעריצים, עבור מעריצים. כל פרט קטן נועד לכבד את העולם שכולנו אוהבים."
            />
          </div>
        </section>

        {/* CTA - הזמנה רשמית */}
        <section className="relative p-1 md:p-2 bg-gradient-to-br from-amber-400 to-amber-700 rounded-[4.5rem] shadow-2xl">
          <div className="bg-[#020617] rounded-[4rem] p-12 md:p-20 text-center space-y-10 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-5 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pointer-events-none"></div>

            <h2 className="font-cinzel text-4xl md:text-6xl font-black text-white drop-shadow-md">
              השרביט מחכה לך
            </h2>
            <p className="font-crimson text-2xl md:text-3xl text-amber-100 italic max-w-2xl mx-auto font-bold leading-snug">
              אלפי קוסמים כבר מצאו את הבית שלהם. הגיע הזמן שתיכנסו בשערי הטירה.
            </p>

            <div className="pt-6">
              {/* החלפנו את ה-button הרגיל ב-Link אמיתי שמוביל לדאשבורד */}
              <Link href="/dashboard" className="inline-block bg-amber-500 text-black px-12 py-6 rounded-full font-cinzel font-black text-2xl hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(245,158,11,0.4)]">
                היכנסו לטירה עכשיו
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-10 rounded-[3rem] bg-white/[0.03] border-2 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group flex flex-col items-center text-center space-y-6">
      <div className="text-amber-500 group-hover:scale-125 transition-transform duration-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
        {icon}
      </div>
      <h3 className="font-cinzel text-2xl font-black text-white uppercase tracking-tighter">
        {title}
      </h3>
      <p className="font-crimson text-xl text-white font-bold leading-relaxed">
        {description}
      </p>
    </div>
  );
}