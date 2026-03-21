import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "סמטת דיאגון",
    description: "החנות הקסומה של LUMOS IL — רכשו שרביטים, חיות מחמד, אבקת פלו ועוד פריטים קסומים בגליאונים.",
    keywords: ["חנות קסומה", "גליאונים", "שרביט", "סמטת דיאגון", "הארי פוטר", "חיות מחמד קסומות"],
    openGraph: {
        title: "סמטת דיאגון | LUMOS IL",
        description: "רכשו פריטים קסומים בגליאונים — שרביטים, חיות מחמד, אבקת פלו ועוד.",
        url: "https://lumos-il.co.il/shop",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "סמטת דיאגון — LUMOS IL" }],
    },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Store",
        "name": "סמטת דיאגון — LUMOS IL",
        "description": "החנות הקסומה של קהילת LUMOS IL — פריטי משחק, חיות מחמד ושרביטים",
        "url": "https://lumos-il.co.il/shop",
        "inLanguage": "he",
        "currenciesAccepted": "גליאונים",
        "priceRange": "0–500 גליאונים",
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {children}
        </>
    );
}
