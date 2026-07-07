import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: "פורומים של הארי פוטר בעברית",
  description: "הפורומים של LUMOS IL הם מסדרונות השיחה של הטירה: דיונים, תיאוריות, שאלות, פאנפיקים, משימות קהילה ושיח מעריצים בעברית באווירה מכבדת.",
  keywords: [
    "פורום הארי פוטר",
    "פורומים בעברית",
    "קהילת הארי פוטר",
    "תיאוריות הארי פוטר",
    "פאנפיקים הארי פוטר",
    "LUMOS IL",
    "Harry Potter forum Israel",
  ],
  openGraph: {
    title: "פורומים של הארי פוטר בעברית | LUMOS IL",
    description: "מסדרונות השיחה של Lumos IL: דיונים, תיאוריות, שאלות, פאנפיקים ופעילות קהילתית בעברית.",
    url: "https://lumos-il.co.il/forums",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "פורומי LUMOS IL" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "פורומים של הארי פוטר בעברית | LUMOS IL",
    description: "דיונים, תיאוריות, פאנפיקים ושיחות קהילה בעברית.",
    images: ["/images/og-image.png"],
  },
}, "/forums");

export default function ForumsLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    name: "פורומים של הארי פוטר בעברית - LUMOS IL",
    description: "מרחב קהילתי לדיונים, תיאוריות, פאנפיקים, שאלות ועדכונים סביב עולם הארי פוטר בעברית.",
    url: "https://lumos-il.co.il/forums",
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
      {children}
    </>
  );
}