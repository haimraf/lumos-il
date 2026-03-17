import { Metadata } from 'next';
import { Sparkles } from 'lucide-react'; // כדאי לוודא שמותקן, אם לא - אפשר להוריד

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
      <div className="min-h-screen bg-[#020617]">

        {/* באנר עידוד לכתיבת תגובות וצבירת נקודות */}
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 py-3 px-4 flex justify-center items-center gap-3">
          <Sparkles className="text-amber-500 animate-pulse" size={18} />
          <p className="font-assistant text-sm md:text-base text-amber-200 font-bold tracking-wide text-center">
            הידעת? כל תגובה בנביא היומי מזכה את הבית שלך ב-1 נקודה ובגליאון זהב!
          </p>
          <Sparkles className="text-amber-500 animate-pulse" size={18} />
        </div>

        {children}
      </div>
    </section>
  );
}