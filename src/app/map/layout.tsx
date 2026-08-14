import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
    title: "מפת הקונדסאים",
    description: "גלו היכן נמצאים הקוסמים האחרים עכשיו — מפת הנוכחות החיה של LUMOS IL. ראו אילו חדרי הטירה פעילים.",
    keywords: ["מפת קונדסאים", "נוכחות", "קוסמים מחוברים", "הוגוורטס", "lumos IL"],
    openGraph: {
        title: "מפת הקונדסאים | LUMOS IL",
        description: "גלו היכן נמצאים הקוסמים עכשיו — מפת הנוכחות החיה של הטירה.",
        url: "https://lumos-il.co.il/map",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "מפת הקונדסאים — LUMOS IL" }],
    },
}, "/map");

export default function MapLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
