import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
    title: "גביע הבתים",
    description: "גביע הבתים של LUMOS IL מציג מירוץ חי בין הבתים עם פערים, מומנטום, תרומה אישית ועדכונים שוטפים מתוך עולם הקהילה.",
    keywords: ["גביע הבתים", "גריפינדור", "סלית'רין", "רייבנקלו", "הפלפאף", "נקודות", "מומנטום", "תרומה לבית", "lumos IL"],
    openGraph: {
        title: "גביע הבתים | LUMOS IL",
        description: "עקבו אחר מירוץ גביע הבתים החי, בדקו פערים, מומנטום ותרומת שחקנים לבית שלהם.",
        url: "https://lumos-il.co.il/house-cup",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "גביע הבתים — LUMOS IL" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "גביע הבתים | LUMOS IL",
        description: "מירוץ גביע הבתים החי של LUMOS IL עם פערים, מומנטום ותרומת שחקנים.",
    },
}, "/house-cup");

export default function HouseCupLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
