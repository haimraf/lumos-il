import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "גביע הבתים",
    description: "תחרות גביע הבתים של LUMOS IL — עקבו אחר הניקוד של גריפינדור, סלית'רין, רייבנקלו והפלפאף. ענו על חידונים וצברו נקודות לבית שלכם.",
    keywords: ["גביע הבתים", "גריפינדור", "סלית'רין", "רייבנקלו", "הפלפאף", "נקודות", "חידון", "lumos IL"],
    openGraph: {
        title: "גביע הבתים | LUMOS IL",
        description: "עקבו אחר הניקוד, ענו על חידונים וצברו נקודות לבית שלכם.",
        url: "https://lumos-il.co.il/house-cup",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "גביע הבתים — LUMOS IL" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "גביע הבתים | LUMOS IL",
        description: "עקבו אחר הניקוד, ענו על חידונים וצברו נקודות לבית שלכם.",
    },
};

export default function HouseCupLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
