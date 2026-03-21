import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "משימות יומיות",
    description: "השלימו משימות יומיות ב-LUMOS IL וזכו בגליאונים ונקודות בית. התחברו כל יום לפעילויות חדשות.",
    keywords: ["משימות יומיות", "גליאונים", "נקודות בית", "פעילויות", "הארי פוטר", "lumos IL"],
    openGraph: {
        title: "משימות יומיות | LUMOS IL",
        description: "השלימו משימות יומיות, זכו בגליאונים ובנקודות בית.",
        url: "https://lumos-il.co.il/quests",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "משימות יומיות — LUMOS IL" }],
    },
};

export default function QuestsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
