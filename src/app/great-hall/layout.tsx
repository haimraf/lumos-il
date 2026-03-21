import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "האולם הגדול — צ'אט חי",
    description: "שיחות חיות בזמן אמת עם קוסמי ישראל באולם הגדול של LUMOS IL. הצטרפו לשיחה, שלחו הודעות ובנו קשרים קסומים.",
    keywords: ["צ'אט", "אולם גדול", "שיחה חיה", "הארי פוטר", "קהילה", "lumos IL"],
    openGraph: {
        title: "האולם הגדול | LUMOS IL",
        description: "שיחות חיות בזמן אמת עם קוסמי ישראל.",
        url: "https://lumos-il.co.il/great-hall",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "האולם הגדול — LUMOS IL" }],
    },
};

export default function GreatHallLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
