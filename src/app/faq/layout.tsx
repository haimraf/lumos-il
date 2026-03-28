import type { Metadata } from "next";
import { getFAQItems } from "@/lib/faq";

export const metadata: Metadata = {
    title: "שאלות ותשובות",
    description: "שאלות ותשובות על LUMOS IL: מערכת הקווסטים, מה כדאי לעשות עכשיו, גביע הבתים, האיוונטים, זירת הדו-קרב, הספרייה, הפורומים ועוד.",
    keywords: ["שאלות ותשובות", "FAQ", "עזרה", "מערכת הקווסטים", "מה כדאי לעשות עכשיו", "הארי פוטר", "lumos IL", "מדריך"],
    openGraph: {
        title: "שאלות ותשובות | LUMOS IL",
        description: "מדריך השאלות והתשובות של LUMOS IL על קווסטים, גביע הבתים, איוונטים, ספרייה, פורומים ועוד.",
        url: "https://lumos-il.co.il/faq",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "שאלות ותשובות — LUMOS IL" }],
    },
};

export default async function FAQLayout({ children }: { children: React.ReactNode }) {
    const faqItems = await getFAQItems();
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "name": "שאלות ותשובות — LUMOS IL",
        "url": "https://lumos-il.co.il/faq",
            "inLanguage": "he-IL",
        "mainEntity": faqItems.map((item) => ({
            "@type": "Question",
            "name": item.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.a,
            },
        })),
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
