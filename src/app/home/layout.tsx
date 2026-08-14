import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: "רחבת הכניסה של Lumos IL",
  description: "העמוד המרכזי של טירת Lumos IL: מעבר מהיר לפורומים, לספריית הפאנפיקים, לנביא היומי, לקווסטים, לגביע הבתים ולחדר המועדון האישי.",
  keywords: ["LUMOS IL", "לומוס ישראל", "הארי פוטר בעברית", "פאנפיקים", "פורומים", "הנביא היומי", "גביע הבתים"],
  openGraph: {
    title: "רחבת הכניסה | LUMOS IL",
    description: "שער מרכזי לטירת הארי פוטר בעברית: פורומים, פאנפיקים, משימות, חדשות וקהילה.",
    url: "https://lumos-il.co.il/home",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "רחבת הכניסה של LUMOS IL" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "רחבת הכניסה | LUMOS IL",
    description: "שער מרכזי לטירת הארי פוטר בעברית.",
    images: ["/opengraph-image"],
  },
}, "/home");

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "LUMOS IL", item: "https://lumos-il.co.il" },
      { "@type": "ListItem", position: 2, name: "רחבת הכניסה", item: "https://lumos-il.co.il/home" },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "LUMOS IL - קהילת הארי פוטר בעברית",
    alternateName: "לומוס ישראל",
    url: "https://lumos-il.co.il",
    description: "טירה דיגיטלית למעריצות ומעריצי הארי פוטר בעברית: פורומים, ספריית פאנפיקים, הנביא היומי, משימות וגביע בתים.",
    inLanguage: "he-IL",
    publisher: {
      "@type": "Organization",
      name: "LUMOS IL",
      url: "https://lumos-il.co.il",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://lumos-il.co.il/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {children}
    </>
  );
}