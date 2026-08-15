import type { Metadata } from "next";
import Link from "next/link";
import { Feather, Mail, MapPin, Moon, ScrollText, Send } from "lucide-react";

import CanonBadge from "@/components/CanonBadge";
import { withCanonical } from "@/lib/seo";

/**
 * עמוד הינשופייה.
 *
 * נבנה בעקבות נתוני Search Console: "הינשופייה" צברה מאה ואחת הופעות ברבעון
 * במיקום ממוצע שישי, ואפס קליקים. הדף שדורג עליה היה עמוד צור קשר, שכותרתו
 * נושאת את השם — כלומר מי שחיפש מידע על הינשופייה קיבל טופס תמיכה.
 *
 * הדף הזה עונה על כוונת החיפוש עצמה: מה הינשופייה, איפה היא, מי גר בה. הקישור
 * לטופס הפנייה נשאר, אבל כשלב שני ולא כתשובה הראשונה.
 */

export const metadata: Metadata = withCanonical(
  {
    // בלי סיומת המותג — layout.tsx מוסיף "| LUMOS IL" דרך title.template.
    title: "הינשופייה — מגדל הינשופים של הוגוורטס",
    description:
      "מה זו הינשופייה בהוגוורטס, איפה היא נמצאת, אילו ינשופים גרים בה ואיך נשלח דואר קסום. מדריך בעברית לפי הספרים, ומשם גם אל ינשופי הדואר של טירת לומוס.",
    keywords: ["הינשופייה", "ינשופים הארי פוטר", "דואר ינשופים", "הדוויג", "מגדל המערבי הוגוורטס"],
    openGraph: {
      title: "הינשופייה — מגדל הינשופים של הוגוורטס",
      description: "איפה נמצאת הינשופייה, מי גר בה, ואיך עובד דואר הינשופים בעולם הקסמים.",
      type: "article",
    },
  },
  "/owlery",
);

const CANON_FACTS = [
  {
    icon: <MapPin className="w-10 h-10" />,
    title: "איפה היא נמצאת",
    body:
      "הינשופייה ניצבת בראש המגדל המערבי של הוגוורטס. העלייה אליה היא טיפוס ארוך במדרגות אבן, וזו אחת הסיבות שתלמידים נוטים לשלוח דואר בבוקר אחד בשבוע ולא בכל יום.",
  },
  {
    icon: <Feather className="w-10 h-10" />,
    title: "איך היא נראית באמת",
    body:
      "זה לא חדר נעים. הרצפה מכוסה בקש, בגללי ינשופים ובגלולות שהם משליכים — שאריות עצמות ופרווה של עכברים. חלונות פעורים בלי זכוכית, וקר שם תמיד.",
  },
  {
    icon: <Moon className="w-10 h-10" />,
    title: "מי גר בה",
    body:
      "מאות ינשופי בית ספר שכל תלמיד רשאי להשתמש בהם, לצד הינשופים הפרטיים של התלמידים. ביניהם הדוויג של הארי, ארול הזקן של משפחת ויזלי, ופיגוידג'ן הקטן והנרגש של רון.",
  },
  {
    icon: <Send className="w-10 h-10" />,
    title: "איך שולחים דואר",
    body:
      "קושרים את המכתב לרגל הינשוף ואומרים לו למי למסור. הינשוף מוצא את הנמען בעצמו, בלי כתובת. זו אחת המערכות הקסומות היחידות בסאגה שעובדת בלי לחש ובלי שרביט.",
  },
];

export default function OwleryPage() {
  return (
    <div className="relative min-h-screen bg-[#020617] px-4 py-24 md:px-8" dir="rtl">
      <div className="fixed top-0 right-1/3 h-[500px] w-[700px] rounded-full bg-amber-500/[0.04] blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 left-1/4 h-[400px] w-[600px] rounded-full bg-amber-900/[0.06] blur-[140px] pointer-events-none" />

      <article className="relative z-10 mx-auto max-w-5xl space-y-20">
        <header className="space-y-8 text-center">
          <div className="inline-flex items-center gap-4 rounded-full border-2 border-amber-500/40 bg-amber-500/10 px-6 py-2 font-cinzel text-xs uppercase tracking-[0.4em] text-amber-500">
            <ScrollText size={18} /> המגדל המערבי
          </div>

          <h1 className="font-cinzel text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(245,158,11,0.6)] md:text-8xl">
            ה<span className="text-amber-500">ינשופייה</span>
          </h1>

          <p className="mx-auto max-w-3xl font-crimson text-2xl font-bold italic leading-tight text-amber-100/90 md:text-3xl">
            &quot;מאות ינשופים, חלונות בלי זכוכית, ורצפה שאף אחד לא רוצה להסתכל עליה — וזו עדיין
            מערכת הדואר האמינה ביותר בעולם הקסמים.&quot;
          </p>

          <div className="flex justify-center">
            <CanonBadge source="books" />
          </div>
        </header>

        <section className="grid grid-cols-1 gap-10">
          {CANON_FACTS.map((fact) => (
            <div
              key={fact.title}
              className="group relative rounded-sm border-4 border-amber-500 bg-[#050816] shadow-[12px_12px_0px_#f59e0b] transition-all duration-500 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[18px_18px_0px_#f59e0b]"
            >
              <div className="flex flex-col gap-8 p-10 md:flex-row md:p-14">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-sm bg-amber-500 text-[#020617] transition-transform group-hover:rotate-6">
                  {fact.icon}
                </div>
                <div className="flex-1 space-y-5">
                  <h2 className="font-cinzel text-3xl font-black tracking-tight text-white transition-colors group-hover:text-amber-400 md:text-4xl">
                    {fact.title}
                  </h2>
                  <p className="font-crimson text-2xl font-bold leading-snug text-white">
                    {fact.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-8 rounded-[3rem] border-4 border-dashed border-amber-500/30 bg-amber-500/5 p-12 text-center md:p-16">
          <Mail size={60} className="mx-auto animate-pulse text-amber-500/40" />
          <h2 className="font-cinzel text-4xl font-black tracking-tight text-white md:text-5xl">
            הינשופייה של לומוס
          </h2>
          <p className="mx-auto max-w-3xl font-crimson text-2xl font-bold leading-snug text-white md:text-3xl">
            גם אצלנו בטירה יש ינשופים. כל הודעה שאתם שולחים לצוות יוצאת דרך הינשופייה, וכל תשובה
            חוזרת אליכם באותה הדרך.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-sm border-4 border-amber-500 bg-amber-500 px-8 py-4 font-cinzel text-sm font-black uppercase tracking-widest text-[#020617] transition-all hover:bg-transparent hover:text-amber-500"
            >
              <Send size={16} /> שלחו ינשוף לצוות
            </Link>
            <Link
              href="/forums/library"
              className="inline-flex items-center gap-2 rounded-sm border-4 border-amber-500/40 px-8 py-4 font-cinzel text-sm font-black uppercase tracking-widest text-amber-300 transition-all hover:border-amber-500 hover:text-amber-500"
            >
              <Feather size={16} /> דיונים על עולם הקסמים
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}
