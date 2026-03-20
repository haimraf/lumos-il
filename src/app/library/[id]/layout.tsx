import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// יצירת קליינט שרת בטוח שלא תלוי ב-Auth (לשליפת נתונים ציבוריים בלבד לטובת SEO)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Props = {
    params: { id: string }
};

// הלחש שיוצר את התצוגה המקדימה לוואטסאפ, טלגרם וטיקטוק
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { data: story } = await supabase
        .from('stories')
        .select(`
            title, 
            description, 
            cover_url, 
            profiles:author_id(full_name)
        `)
        .eq('id', params.id)
        .single();

    if (!story) {
        return { title: 'סיפור אבוד במרתף | לומוס IL' };
    }

    // ניקוי תגיות HTML מהתקציר כדי שהטקסט ייראה נקי בוואטסאפ
    const cleanDescription = story.description
        ? story.description.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...'
        : 'היכנסו לקרוא את הסיפור המלא בקהילת הקוסמים של ישראל...';

    // טיפול במידע על המחבר (Supabase עשוי להחזיר מערך בהצטרפות)
    const authorData = Array.isArray(story.profiles) ? story.profiles[0] : (story.profiles as any);
    const authorName = authorData?.full_name || 'קוסם אנונימי';
    const imageUrl = story.cover_url || 'https://lumos-il.co.il/images/og-image.png'; // שים לב לשנות לנתיב תמונת הדיפולט שלך

    return {
        title: `${story.title} | לומוס IL`,
        description: cleanDescription,
        authors: [{ name: authorName }],
        openGraph: {
            title: `${story.title} | לומוס IL`,
            description: cleanDescription,
            url: `https://lumos-il.co.il/library/${params.id}`,
            siteName: 'LUMOS IL',
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: story.title,
                }
            ],
            type: 'article',
            publishedTime: new Date().toISOString(),
        },
        twitter: {
            card: 'summary_large_image',
            title: `${story.title} | לומוס IL`,
            description: cleanDescription,
            images: [imageUrl],
        }
    };
}

export default async function StoryLayout({ children, params }: { children: React.ReactNode, params: { id: string } }) {
    // שליפת הנתונים פעם נוספת עבור ה-JSON-LD (Next.js חכם מספיק לעשות Cache מאחורי הקלעים)
    const { data: story } = await supabase
        .from('stories')
        .select('title, description, cover_url, profiles:author_id(full_name)')
        .eq('id', params.id)
        .single();

    const cleanDescription = story?.description?.replace(/<[^>]*>?/gm, '').substring(0, 160);

    // Level Up: יצירת Schema.org Structured Data כדי שגוגל יבין שזה יצירה ספרותית
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Book",
        "name": story?.title || "סיפור בלומוס IL",
        "author": {
            "@type": "Person",
            "name": (Array.isArray(story?.profiles) ? story.profiles[0] : (story?.profiles as any))?.full_name || "קוסם אנונימי"
        },
        "image": story?.cover_url || "https://lumos-il.co.il/images/og-image.png",
        "description": cleanDescription || "סיפור מרתק בקהילת הקוסמים של ישראל",
        "publisher": {
            "@type": "Organization",
            "name": "LUMOS IL"
        },
        "inLanguage": "he"
    };

    return (
        <>
            {/* הזרקת הקסם של גוגל ישירות ל-Head של האתר */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* כאן מרונדר דף ה-page.tsx הרגיל שלך */}
            {children}
        </>
    );
}