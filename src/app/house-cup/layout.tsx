import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: "גביע הבתים",
  description: "גביע הבתים של LUMOS IL מציג את התרומה הקהילתית של גריפינדור, סלית'רין, רייבנקלו והפלפאף דרך משימות, תגובות, קריאה ופעילות בטירה.",
  keywords: ["גביע הבתים", "נקודות בתים", "גריפינדור", "סלית'רין", "רייבנקלו", "הפלפאף", "LUMOS IL"],
  openGraph: {
    title: "גביע הבתים | LUMOS IL",
    description: "נקודות בתים ופעילות קהילה באווירת הוגוורטס.",
    url: "https://lumos-il.co.il/house-cup",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "גביע הבתים של LUMOS IL" }],
  },
  twitter: { card: "summary_large_image", title: "גביע הבתים | LUMOS IL", description: "הבתים מתקדמים דרך פעילות קהילתית אמיתית.", images: ["/images/og-image.png"] },
}, "/house-cup");

export default function HouseCupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}