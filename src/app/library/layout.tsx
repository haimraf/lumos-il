import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: "ספריית הפאנפיקים בעברית",
  description: "ספריית הפאנפיקים של LUMOS IL מרכזת סיפורי הארי פוטר בעברית, פרקים מקוריים של הקהילה, תגובות, קריאה ומשימות שמחברות בין כתיבה לבין פעילות בטירה.",
  keywords: ["פאנפיק הארי פוטר", "פאנפיקים בעברית", "ספריית פאנפיקים", "סיפורי הארי פוטר", "כתיבה יצירתית", "LUMOS IL"],
  openGraph: {
    title: "ספריית הפאנפיקים בעברית | LUMOS IL",
    description: "מדפי סיפורים, פרקים ויצירות קהילה בעברית מתוך עולם הארי פוטר.",
    url: "https://lumos-il.co.il/library",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "ספריית הפאנפיקים של LUMOS IL" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ספריית הפאנפיקים בעברית | LUMOS IL",
    description: "סיפורי הארי פוטר בעברית, פרקים מקוריים ויצירות קהילה.",
    images: ["/images/og-image.png"],
  },
}, "/library");

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ספריית הפאנפיקים בעברית - LUMOS IL",
    description: "אוסף קהילתי של פאנפיקים, סיפורים ופרקים בעברית בהשראת עולם הארי פוטר.",
    url: "https://lumos-il.co.il/library",
    inLanguage: "he-IL",
    genre: ["Fan Fiction", "Fantasy", "Community Writing"],
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
      {children}
    </>
  );
}