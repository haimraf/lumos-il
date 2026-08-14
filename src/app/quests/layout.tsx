import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: "קווסטים ומשימות קהילה",
  description: "לוח הקווסטים של LUMOS IL מחבר בין פעילות אמיתית בטירה לבין התקדמות: תגובות, קריאה, פאנפיקים, פורומים, נקודות בתים וגביע קהילה.",
  keywords: ["קווסטים הארי פוטר", "משימות קהילה", "נקודות בתים", "גביע הבתים", "LUMOS IL", "הארי פוטר בעברית"],
  openGraph: {
    title: "קווסטים ומשימות קהילה | LUMOS IL",
    description: "משימות יומיות וקהילתיות שמחזקות את הבתים ואת הפעילות בטירה.",
    url: "https://lumos-il.co.il/quests",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "קווסטים ומשימות קהילה ב-LUMOS IL" }],
  },
  twitter: { card: "summary_large_image", title: "קווסטים | LUMOS IL", description: "משימות, נקודות בתים ופעילות קהילה בטירה.", images: ["/opengraph-image"] },
}, "/quests");

export default function QuestsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}