import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "פורום הארי פוטר",
  description: "פורום הארי פוטר הגדול בישראל — דיונים, תיאוריות, פאנפיקים, קנון ועוד. הצטרף לקהילת הקוסמים הישראלית.",
  keywords: [
    "פורום הארי פוטר", "פורום", "אשכולות", "דיונים", "הארי פוטר",
    "קהילת הארי פוטר", "הוגוורטס", "תיאוריות הארי פוטר",
    "Harry Potter forum", "HP Israel",
  ],
  openGraph: {
    title: "פורום הארי פוטר | LUMOS IL",
    description: "פורום הארי פוטר הגדול בישראל — דיונים, תיאוריות, פאנפיקים וקנון. הצטרף לקהילה.",
    url: "https://lumos-il.co.il/forums",
    siteName: "LUMOS IL",
    type: "website",
  },
  alternates: { canonical: "https://lumos-il.co.il/forums" },
};

export default function ForumsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "פורום הארי פוטר — LUMOS IL",
            "description": "פורום הארי פוטר הגדול בישראל — דיונים, תיאוריות, פאנפיקים וקנון",
            "url": "https://lumos-il.co.il/forums",
            "inLanguage": "he",
            "isPartOf": {
              "@type": "WebSite",
              "name": "LUMOS IL",
              "url": "https://lumos-il.co.il",
              "description": "קהילת הארי פוטר הגדולה בישראל",
            },
            "publisher": {
              "@type": "Organization",
              "name": "LUMOS IL",
              "url": "https://lumos-il.co.il",
              "sameAs": ["https://lumos-il.co.il"],
            },
          }),
        }}
      />
      {children}
    </>
  );
}
