import { Metadata } from "next";
import { Sparkles, Star, Zap, Users, ShieldCheck, Wand2, Compass, Scroll, Flame } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

export const metadata: Metadata = {
  title: "הסיפור מאחורי האור",
  description: "איך הפכנו את החלום לטירה? גלו את הסיפור של LUMOS IL — הבית הדיגיטלי האינטראקטיבי של קהילת הקוסמים והקוסמות בישראל.",
  keywords: ["אודות", "LUMOS IL", "קהילת הארי פוטר", "ישראל", "הסיפור שלנו"],
  openGraph: {
    title: "הסיפור מאחורי האור | LUMOS IL",
    description: "הבית הדיגיטלי של קהילת הקוסמים בישראל",
    url: "https://lumos-il.co.il/about",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "LUMOS IL — הסיפור שלנו" }],
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "LUMOS IL",
  "alternateName": "לומוס ישראל",
  "description": "קהילת הארי פוטר הגדולה בישראל — הבית הדיגיטלי האינטראקטיבי של חובבי הקסם",
  "url": "https://lumos-il.co.il",
  "logo": "https://lumos-il.co.il/logo.png",
  "foundingDate": "2024",
  "inLanguage": "he",
  "sameAs": [],
  "knowsAbout": ["Harry Potter", "הארי פוטר", "J.K. Rowling", "Hogwarts", "הוגוורטס", "Fan Fiction"],
};


export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-20 px-6 relative overflow-hidden" dir="rtl">
      <Script id="org-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />

      {/* רקע כוכבים */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-amber-500/[0.055] rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[700px] bg-indigo-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[140px] pointer-events-none" />

      {/* ✅ תיקון רוחב */}
      <div className="relative z-10 space-y-32" style={{ maxWidth: '64rem', marginLeft: 'auto', marginRight: 'auto' }}>

        {/* Hero */}
        <section className="text-center space-y-10">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-cinzel text-[11px] tracking-[0.4em] uppercase">
            <Wand2 size={14} /> הסיפור שמאחורי האור
          </div>

          <h1 className="font-cinzel text-6xl md:text-8xl font-black leading-none tracking-tighter">
            הבית שבו <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600">
              הקסם מתגורר
            </span>
          </h1>

          {/* קו הפרדה */}
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-24 bg-gradient-to-l from-amber-500/40 to-transparent" />
            <Sparkles size={16} className="text-amber-500/60" />
            <div className="h-px w-24 bg-gradient-to-r from-amber-500/40 to-transparent" />
          </div>

          <p className="font-crimson text-2xl md:text-3xl text-amber-100/70 italic max-w-3xl mx-auto leading-relaxed">
            "לומוס ישראל הוא לא עוד אתר מעריצים. כאן נמצא המקום שבו המכתב שחיכיתם לו בגיל 11 סוף סוף מגיע."
          </p>
        </section>

        {/* חזון */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/8">
              <Compass className="text-amber-500" size={28} />
            </div>
            <h2 className="font-cinzel text-4xl font-black text-white border-r-4 border-amber-500 pr-6 uppercase tracking-widest">
              החזון שלנו
            </h2>
            <div className="space-y-5 font-crimson text-xl leading-relaxed text-white/75 text-right">
              <p>
                הכל התחיל מהרצון להחזיר את תחושת הקהילה האמיתית — המקומות שבהם הייתה זהות אמיתית, חדר אישי וחברויות מכל הארץ.
              </p>
              <p>
                לקחנו את הגעגוע העמוק ההוא, שילבנו אותו עם העולם המופלא שגדלנו עליו, ויצרנו את{" "}
                <span className="text-amber-400 font-bold">Lumos IL</span>.
              </p>
              <div className="bg-amber-500/8 p-6 rounded-2xl border border-amber-500/20 text-amber-50/80">
                כאן, אין מדובר ב"משתמשים" אנונימיים — כאן הזהות היא זהות קסם. יש כאן בית להתגאות בו, שרביט שבחר בכם, וסיפור שרק מחכה ליצירה שלכם.
              </div>
            </div>
          </div>

          {/* אייקון קסמי */}
          <div className="relative group flex items-center justify-center">
            <div className="absolute inset-0 bg-amber-500/20 blur-[100px] rounded-full" />
            <div className="relative bg-[#0d0d0f]/80 border border-amber-500/20 rounded-[4rem] p-12 shadow-2xl backdrop-blur-md group-hover:border-amber-500/40 transition-all duration-700 text-center space-y-6">
              {/* ארבעת בתי הוגוורטס */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "🦁", name: "גריפינדור", color: "border-red-500/30 bg-red-950/20" },
                  { icon: "🐍", name: "סלית'רין", color: "border-emerald-500/30 bg-emerald-950/20" },
                  { icon: "🦅", name: "רייבנקלו", color: "border-blue-500/30 bg-blue-950/20" },
                  { icon: "🦡", name: "הפלפאף", color: "border-amber-500/30 bg-amber-950/20" },
                ].map((house) => (
                  <div key={house.name} className={`p-4 rounded-2xl border ${house.color} flex flex-col items-center gap-2`}>
                    <span className="text-3xl">{house.icon}</span>
                    <span className="font-cinzel text-[10px] text-white/60 uppercase tracking-widest">{house.name}</span>
                  </div>
                ))}
              </div>
              <p className="font-cinzel text-amber-500/60 text-[10px] uppercase tracking-widest">ארבעת הבתים — בית אחד</p>
            </div>
          </div>
        </section>

        {/* ציר זמן קסמי */}
        <section className="space-y-12">
          <div className="text-center space-y-3">
            <h2 className="font-cinzel text-4xl font-black text-white tracking-widest">פרקי הסיפור</h2>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mx-auto" />
          </div>

          <div className="space-y-6">
            {[
              { icon: Scroll, color: "text-blue-400  bg-blue-950/30  border-blue-500/20", step: "01", title: "הרעיון נולד", desc: "מגעגוע לקהילות הדיגיטליות של פעם — נולד הרצון לבנות בית חדש לקוסמים הישראלים." },
              { icon: Flame, color: "text-red-400   bg-red-950/30   border-red-500/20", step: "02", title: "הטירה נבנית", desc: "שורות קוד, לילות ארוכים, ואהבה עצומה לפרטים — כך נבנה המקום שאתם בו עכשיו." },
              { icon: Users, color: "text-emerald-400 bg-emerald-950/30 border-emerald-500/20", step: "03", title: "הקהילה מתעוררת", desc: "הקוסמים הגיעו, המיון התחיל, והטירה החלה לנשום חיים אמיתיים." },
              { icon: Sparkles, color: "text-amber-400 bg-amber-950/30 border-amber-500/20", step: "04", title: "הקסם נמשך", desc: "כל יום חדש מביא פיצ'ר חדש, כתבה חדשה, קוסם חדש. הסיפור רק מתחיל." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="flex items-start gap-6 p-6 rounded-2xl border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                  <div className={`shrink-0 p-3 rounded-xl border ${item.color} group-hover:scale-110 transition-transform`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 text-right">
                    <div className="flex items-center justify-end gap-3 mb-1">
                      <h3 className="font-cinzel text-lg font-bold text-white/90">{item.title}</h3>
                      <span className="font-cinzel text-[10px] text-white/20 font-black">{item.step}</span>
                    </div>
                    <p className="font-crimson text-lg text-white/55 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* עמודי תווך */}
        <section className="space-y-12">
          <div className="text-center space-y-3">
            <h2 className="font-cinzel text-4xl font-black text-white tracking-widest">עמודי התווך של הטירה</h2>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ValueCard
              icon={<Users size={32} />}
              title="קהילה חיה"
              description="שיח מכבד, חברויות חדשות ומרחב בטוח שבו כל דמות יכולה להיות בדיוק מי שהיא."
            />
            <ValueCard
              icon={<Star size={32} />}
              title="חוויה אינטראקטיבית"
              description="מטקס המיון ועד מפת הקונדסאים — הכל נבנה כדי לאפשר השתתפות פעילה בעולם."
            />
            <ValueCard
              icon={<ShieldCheck size={32} />}
              title="נאמנות ליצירה"
              description="נבנה באהבה על ידי מעריצים, עבור מעריצים. כל פרט קטן נועד לכבד את העולם שכולנו אוהבים."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="relative p-px bg-gradient-to-br from-amber-400/60 to-amber-700/60 rounded-[4rem] shadow-2xl">
          <div className="bg-[#020617] rounded-[4rem] p-12 md:p-20 text-center space-y-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative space-y-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Wand2 size={20} className="text-amber-500/60" />
                <span className="font-cinzel text-[11px] text-amber-500/60 uppercase tracking-[0.4em]">השרביט קורא לך</span>
                <Wand2 size={20} className="text-amber-500/60 scale-x-[-1]" />
              </div>

              <h2 className="font-cinzel text-4xl md:text-6xl font-black text-white">
                השרביט מחכה בקוצר רוח
              </h2>
              <p className="font-crimson text-xl md:text-2xl text-amber-100/60 italic max-w-2xl mx-auto leading-relaxed">
                אלפי שרביטים כבר מצאו את הבית שלהם. הגיעה השעה להיכנס בשערי הטירה.
              </p>

              <div className="pt-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-amber-950 px-12 py-5 rounded-full font-cinzel font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-[0_15px_40px_rgba(245,158,11,0.3)] hover:shadow-[0_20px_50px_rgba(245,158,11,0.5)]"
                >
                  <Sparkles size={20} />
                  הכניסה לטירה
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/8 hover:border-amber-500/30 hover:bg-amber-500/[0.03] transition-all group text-center space-y-5">
      <div className="text-amber-500 group-hover:scale-110 transition-transform duration-500 flex justify-center">
        {icon}
      </div>
      <h3 className="font-cinzel text-xl font-black text-white/90 uppercase tracking-tight">
        {title}
      </h3>
      <p className="font-crimson text-lg text-white/55 leading-relaxed">
        {description}
      </p>
    </div>
  );
}