import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: "הנביא היומי — חדשות ועדכונים מהטירה",
  description: "הנביא היומי מרכז עדכונים קצרים, כתבות, סקרים ורשמים מפעילות הטירה: פורומים, משימות, נקודות בתים, ספרייה וקהילת הארי פוטר בעברית.",
  keywords: ["הנביא היומי", "חדשות הארי פוטר", "כתבות הארי פוטר", "לומוס ישראל", "קהילת הארי פוטר", "עדכוני קהילה"],
  openGraph: {
    title: "הנביא היומי | LUMOS IL",
    description: "עדכונים, כתבות וסקרים מתוך פעילות קהילת הארי פוטר בעברית.",
    url: "https://lumos-il.co.il/news",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "הנביא היומי של LUMOS IL" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "הנביא היומי | LUMOS IL",
    description: "עדכונים וכתבות מתוך פעילות הטירה.",
    images: ["/opengraph-image"],
  },
}, "/news");

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "הנביא היומי - LUMOS IL",
    description: "עמוד עדכוני הקהילה של LUMOS IL: כתבות, סקרים ורשמים מהטירה בעברית.",
    url: "https://lumos-il.co.il/news",
    inLanguage: "he-IL",
    isPartOf: {
      "@type": "WebSite",
      name: "LUMOS IL",
      url: "https://lumos-il.co.il",
    },
    publisher: {
      "@type": "Organization",
      name: "LUMOS IL",
      url: "https://lumos-il.co.il",
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
              style={{ maxWidth: "896px", marginLeft: "auto", marginRight: "auto" }}
            >
              {children}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}