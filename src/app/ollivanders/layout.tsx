import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
    title: "אוליבנדר — בחירת השרביט",
    description: "בחרו את השרביט הקסום שלכם אצל אוליבנדר ב-LUMOS IL. גלו איזה שרביט בוחר בכם — עץ, ליבה וגודל.",
    keywords: ["שרביט", "אוליבנדר", "בחירת שרביט", "הארי פוטר", "קסמים", "lumos IL"],
    openGraph: {
        title: "אוליבנדר | LUMOS IL",
        description: "השרביט בוחר בקוסם — גלו איזה שרביט שייך לכם.",
        url: "https://lumos-il.co.il/ollivanders",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "אוליבנדר — LUMOS IL" }],
    },
}, "/ollivanders");

export default function OllivandersLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
