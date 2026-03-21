import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "מפת הקונדסאים",
    description: "גלו היכן נמצאים הקוסמים האחרים עכשיו — מפת הנוכחות החיה של LUMOS IL. ראו אילו חדרי הטירה פעילים.",
    keywords: ["מפת קונדסאים", "נוכחות", "קוסמים מחוברים", "הוגוורטס", "lumos IL"],
    openGraph: {
        title: "מפת הקונדסאים | LUMOS IL",
        description: "גלו היכן נמצאים הקוסמים עכשיו — מפת הנוכחות החיה של הטירה.",
        url: "https://lumos-il.co.il/map",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "מפת הקונדסאים — LUMOS IL" }],
    },
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
