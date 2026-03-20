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

        {/* באנר עליון קבוע נשאר כמו שהוא */}
        <div className="w-full fixed top-0 left-0 right-0 z-50 bg-[#0a0f20]/95 backdrop-blur-md border-b border-[#1e293b]/50 py-3 px-4 flex justify-between items-center gap-3">
          {/* ... תוכן הבאנר העליון (X, גליאונים, אווטאר) ... */}
        </div>

        {/* תוכן העמוד - השארנו pt-32 כדי שיהיה מרחב מהבאנר הקבוע */}
        <div className="w-full flex justify-center pt-32 pb-16">
          <main
            className="w-full px-6 md:px-0"
            style={{ maxWidth: '896px', marginLeft: 'auto', marginRight: 'auto' }}
          >
            {children}
          </main>
        </div>
      </div>
    </section>
  );
}