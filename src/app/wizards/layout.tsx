import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
    title: "קוסמי הטירה",
    description: "עמוד המשתתפים של LUMOS IL: שמות, בתים, אווטארים, דרגות ומי מחובר או מחוברת עכשיו.",
    keywords: ["קוסמים", "משתתפים", "בתים", "פרופילים", "lumos IL", "הארי פוטר", "קהילה"],
    openGraph: {
        title: "קוסמי הטירה | LUMOS IL",
        description: "הכירו את אנשי הטירה, ראו לאיזה בית כל אחד משתייך, ומי מחובר או מחוברת ממש עכשיו.",
        url: "https://lumos-il.co.il/wizards",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "קוסמי הטירה - LUMOS IL" }],
    },
}, "/wizards");

export default function WizardsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
