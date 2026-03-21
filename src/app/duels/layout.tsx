import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "דו-קרב לחשים",
    description: "צפו בדו-קרב לחשים חי בין קוסמי LUMOS IL. כל מהלך בזמן אמת.",
    openGraph: {
        title: "דו-קרב לחשים | LUMOS IL",
        description: "דו-קרב לחשים חי בין קוסמי קהילת LUMOS IL.",
        url: "https://lumos-il.co.il/arena",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "דו-קרב לחשים — LUMOS IL" }],
    },
};

export default function DuelsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
