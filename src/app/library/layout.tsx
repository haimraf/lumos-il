import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ספריית הפאנפיקים",
    description: "ספריית הפאנפיקים של LUMOS IL — קראו וכתבו סיפורי הרחבה לעולם הארי פוטר בעברית. מאות סיפורים מקוריים מקהילת הקוסמים הישראלית.",
    keywords: ["פאנפיק", "ספרייה", "סיפורים", "הארי פוטר", "כתיבה יצירתית", "lumos IL", "עברית"],
    openGraph: {
        title: "ספריית הפאנפיקים | LUMOS IL",
        description: "קראו וכתבו פאנפיקים בעברית — סיפורי הרחבה לעולם הארי פוטר.",
        url: "https://lumos-il.co.il/library",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "ספריית הפאנפיקים — LUMOS IL" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "ספריית הפאנפיקים | LUMOS IL",
        description: "קראו וכתבו פאנפיקים בעברית לעולם הארי פוטר.",
    },
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Library",
        "name": "ספריית הפאנפיקים — LUMOS IL",
        "description": "ספריית פאנפיקים עברית לעולם הארי פוטר",
        "url": "https://lumos-il.co.il/library",
        "inLanguage": "he",
        "genre": "Fan Fiction",
        "publisher": {
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
