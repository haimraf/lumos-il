import type { Metadata } from "next";
import { SITE_FAQ } from "@/data/site-features-faq";

export const metadata: Metadata = {
    title: "שאלות ותשובות",
    description: "כל מה שצריך לדעת על LUMOS IL — שאלות ותשובות על מערכות הקהילה: מיון בתים, גביע הבתים, זירת הקרבות, ספרייה, חנות ועוד.",
    keywords: ["שאלות ותשובות", "FAQ", "עזרה", "הארי פוטר", "lumos IL", "מדריך"],
    openGraph: {
        title: "שאלות ותשובות | LUMOS IL",
        description: "כל מה שצריך לדעת על מערכות LUMOS IL.",
        url: "https://lumos-il.co.il/faq",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "שאלות ותשובות — LUMOS IL" }],
    },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "name": "שאלות ותשובות — LUMOS IL",
        "url": "https://lumos-il.co.il/faq",
        "inLanguage": "he",
        "mainEntity": SITE_FAQ.map((item) => ({
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
