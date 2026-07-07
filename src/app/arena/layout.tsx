import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: "זירת הקרבות",
  description:
    "דו-קרבות לחשים בזמן אמת בין חברות וחברי קהילת LUMOS IL. אתגרו יריבים, הגיעו לראש לוח המובילים וזכו בתואר אלופי הזירה.",
  keywords: [
    "דו-קרב",
    "קרב לחשים",
    "זירה",
    "הארי פוטר",
    "קרב",
    "אלוף הזירה",
    "lumos IL",
  ],
  openGraph: {
    title: "זירת הקרבות | LUMOS IL",
    description: "דו-קרבות לחשים בזמן אמת. אתגרו יריבים, צברו ניצחונות וטפסו בדירוג.",
    url: "https://lumos-il.co.il/arena",
    siteName: "LUMOS IL",
    type: "website",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "זירת הקרבות — LUMOS IL",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "זירת הקרבות | LUMOS IL",
    description: "דו-קרבות לחשים בזמן אמת בקהילת LUMOS IL.",
  },
}, "/arena");

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "זירת הקרבות — LUMOS IL",
    description:
      "דו-קרבות לחשים בזמן אמת, לוח מובילים, חיפוש יריבים והיסטוריית קרבות בקהילת LUMOS IL.",
    url: "https://lumos-il.co.il/arena",
    inLanguage: "he-IL",
    isPartOf: {
      "@type": "WebSite",
      name: "LUMOS IL",
      url: "https://lumos-il.co.il",
    },
    about: [
      {
        "@type": "Thing",
        name: "דו-קרבות קהילתיים",
      },
      {
        "@type": "Thing",
        name: "לוח מובילים",
      },
      {
        "@type": "Thing",
        name: "אתגרי קוסמים",
      },
    ],
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
