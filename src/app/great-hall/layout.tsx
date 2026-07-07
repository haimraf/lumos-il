import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: "האולם הגדול",
  description: "האולם הגדול של LUMOS IL הוא מרחב השיחה החי של הטירה: נוכחות קהילה, הודעות בזמן אמת, רגעים קטנים בין בתים ושיחה בעברית באווירת הארי פוטר.",
  keywords: ["האולם הגדול", "קהילת הארי פוטר", "צאט הארי פוטר", "לומוס ישראל", "הארי פוטר בעברית"],
  openGraph: {
    title: "האולם הגדול | LUMOS IL",
    description: "מרחב השיחה החי של הטירה בעברית.",
    url: "https://lumos-il.co.il/great-hall",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "האולם הגדול של LUMOS IL" }],
  },
  twitter: { card: "summary_large_image", title: "האולם הגדול | LUMOS IL", description: "שיחה חיה ונוכחות קהילתית בטירה.", images: ["/images/og-image.png"] },
}, "/great-hall");

export default function GreatHallLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}