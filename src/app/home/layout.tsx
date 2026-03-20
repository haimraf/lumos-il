import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'האולם הגדול | לומוס IL - קהילת הקוסמים של ישראל',
    description: 'ברוכים הבאים לאולם הגדול של לומוס IL! הפורטל המרכזי של קהילת הארי פוטר בישראל. מכאן תוכלו להגיע לספריית הפאנפיקים, לפורומים, לנביא היומי ולחדר המועדון שלכם.',
    keywords: ['הארי פוטר', 'לומוס', 'קהילת קוסמים', 'פאנפיקים', 'הוגוורטס', 'פורומים הארי פוטר', 'קסמים', 'Lumos IL'],
    openGraph: {
        title: 'האולם הגדול | לומוס IL',
        description: 'הפורטל המרכזי של קהילת הקוסמים של ישראל.',
        url: 'https://lumos-il.co.il/home',
        siteName: 'LUMOS IL',
        type: 'website',
    }
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
    // Schema.org - מסביר לבינה מלאכותית שזו קהילה מקוונת
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "LUMOS IL - קהילת הקוסמים של ישראל",
        "url": "https://lumos-il.co.il",
        "description": "הבית של חובבי הארי פוטר בישראל. ספריית פאנפיקים, פורומים, ומשחקי תפקידים.",
        "publisher": {
            "@type": "Organization",
            "name": "LUMOS IL"
        }
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