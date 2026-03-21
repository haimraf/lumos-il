import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "זירת הקרבות",
    description: "דו-קרבות לחשים בזמן אמת בין קוסמי ישראל. אתגר קוסמים אחרים, הגיע לראש לוח המובילים וזכה בתואר אלוף הזירה.",
    keywords: ["דו-קרב", "קרב לחשים", "זירה", "הארי פוטר", "קרב", "אלוף הזירה", "lumos IL"],
    openGraph: {
        title: "זירת הקרבות | LUMOS IL",
        description: "דו-קרבות לחשים בזמן אמת. אתגר קוסמים, זכה בניצחונות, עלה בדירוג.",
        url: "https://lumos-il.co.il/arena",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "זירת הקרבות — LUMOS IL" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "זירת הקרבות | LUMOS IL",
        description: "דו-קרבות לחשים בזמן אמת בין קוסמי ישראל.",
    },
};

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        "name": "זירת הקרבות — LUMOS IL",
        "description": "דו-קרבות לחשים בזמן אמת בין קוסמי קהילת LUMOS IL",
        "url": "https://lumos-il.co.il/arena",
        "inLanguage": "he",
        "organizer": {
            "@type": "Organization",
            "name": "LUMOS IL",
            "url": "https://lumos-il.co.il",
        },
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
