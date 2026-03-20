import { Metadata } from 'next';
import { Sparkles, X } from 'lucide-react';
import Image from 'next/image';

// הגדרת המטא-דאטה - פעם אחת בלבד!
export const metadata: Metadata = {
  title: 'הנביא היומי | Lumos IL - עיתון הקוסמים הרשמי',
  description: 'כל מה שקורה בטירת לומוס ישראל. כתבות, סקרים ועדכונים חיים מהקהילה.',
  openGraph: {
    title: 'הנביא היומי | לומוס ישראל',
    description: 'המהדורה החדשה של עיתון הקוסמים כבר כאן. בואו להגיב ולהשפיע!',
    url: 'https://lumos-il.co.il/news',
    siteName: 'Lumos IL',
    locale: 'he_IL',
    type: 'website',
    images: [
      {
        url: 'https://lumos-il.co.il/og-news.jpg',
        width: 1200,
        height: 630,
        alt: 'הנביא היומי - לומוס ישראל',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'הנביא היומי | לומוס ישראל',
    description: 'עיתון הקוסמים הרשמי של הקהילה.',
    images: ['https://lumos-il.co.il/og-news.jpg'],
  },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="antialiased selection:bg-amber-500 selection:text-[#020617]">
      <div className="min-h-screen bg-[#020617] w-full">

        {/* 1. באנר עליון קבוע (Fixed Header) */}
        <div className="w-full fixed top-0 left-0 right-0 z-50 bg-[#0a0f20]/95 backdrop-blur-md border-b border-[#1e293b]/50 py-3 px-4 flex justify-between items-center gap-3">
          <button className="text-slate-500 hover:text-slate-300">
            <X size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-900/30 px-3 py-1.5 rounded-full">
              <span className="font-bebas text-lg text-amber-500">3</span>
              <Image src="/images/gold-coin.png" alt="גליאונים" width={18} height={18} />
            </div>

            <div className="relative group">
              <div className="w-10 h-10 rounded-full border-2 border-slate-700 overflow-hidden cursor-pointer group-hover:border-slate-500 transition-all">
                <Image
                  src="/images/house-elf-helper.png"
                  alt="פרופיל Haim"
                  width={40}
                  height={40}
                  className="object-cover"
                  priority
                />
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 border-2 border-[#0a0f20]"></span>
            </div>
          </div>
        </div>

        {/* 2. תוכן העמוד */}
        <div className="w-full flex justify-center pt-32 pb-16">
          <main
            className="w-full px-6 md:px-0 flex flex-col items-center"
            style={{ maxWidth: '896px', marginLeft: 'auto', marginRight: 'auto' }}
          >

            {/* כותרת ראשית: הנביא היומי */}
            <div className="text-center mb-6 animate-in fade-in slide-in-from-top duration-1000">
              <h1 className="font-cinzel text-5xl md:text-7xl font-black text-white tracking-[0.2em] uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                הנביא היומי
              </h1>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="h-[1px] w-12 bg-amber-500/40"></div>
                <span className="font-cinzel text-xs text-amber-500 tracking-widest uppercase">The Daily Prophet • Edition 8.2</span>
                <div className="h-[1px] w-12 bg-amber-500/40"></div>
              </div>
            </div>

            {/* באנר עידוד לתגובות - עכשיו הוא מתחת לכותרת */}
            <div className="w-full max-w-2xl mx-auto mb-12 bg-amber-500/10 border border-amber-500/20 py-3 px-4 flex justify-center items-center gap-3 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.05)]">
              <Sparkles className="text-amber-500 animate-pulse" size={18} />
              <p className="font-assistant text-sm md:text-base text-amber-200 font-bold tracking-wide text-center">
                הידעת? כל תגובה בנביא היומי מזכה את הבית שלך ב-1 נקודה ובגליאון זהב!
              </p>
              <Sparkles className="text-amber-500 animate-pulse" size={18} />
            </div>

            {/* תוכן הכתבות (הילדים) */}
            <div className="w-full">
              {children}
            </div>
          </main>
        </div>

      </div>
    </section>
  );
}