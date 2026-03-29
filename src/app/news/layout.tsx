import { Metadata } from 'next';
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: 'הנביא היומי',
  description: 'כל מה שקורה בטירת לומוס ישראל. כתבות, סקרים ועדכונים חיים מהקהילה.',
  keywords: ['הנביא היומי', 'חדשות', 'כתבות', 'הארי פוטר', 'lumos IL', 'עיתון קוסמים'],
  openGraph: {
    title: 'הנביא היומי | LUMOS IL',
    description: 'המהדורה החדשה של עיתון הקוסמים כבר כאן. בואו להגיב ולהשפיע!',
    url: 'https://lumos-il.co.il/news',
    siteName: 'LUMOS IL',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: '/images/og-image.png', width: 1200, height: 630, alt: 'הנביא היומי — LUMOS IL' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'הנביא היומי | LUMOS IL',
    description: 'עיתון הקוסמים הרשמי של הקהילה.',
    images: ['/images/og-image.png'],
  },
}, "/news");

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "name": "הנביא היומי — LUMOS IL",
    "description": "עיתון הקוסמים הרשמי של קהילת LUMOS IL — כתבות, ידיעות ועדכונים מהקהילה",
    "url": "https://lumos-il.co.il/news",
    "inLanguage": "he",
    "publisher": {
      "@type": "Organization",
      "name": "LUMOS IL",
      "url": "https://lumos-il.co.il",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="antialiased selection:bg-amber-500 selection:text-[#020617]">
        <div className="min-h-screen bg-[#020617] w-full">
          <div className="w-full flex justify-center pt-32 pb-16">
            <div
              className="w-full px-6 md:px-0"
              style={{ maxWidth: '896px', marginLeft: 'auto', marginRight: 'auto' }}
            >
              {children}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
