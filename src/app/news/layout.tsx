import { Metadata } from 'next';

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
  // תוספת קטנה לשיפור השיתוף ברשתות
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
        {children}
      </div>
    </section>
  );
}