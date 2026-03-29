import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getCanonicalUrl } from "@/lib/seo";

interface Props {
    params: Promise<{ slug: string; id: string }>;
    children: React.ReactNode;
}

async function getThread(slug: string, id: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("threads")
        .select("title, content, created_at, profiles(full_name)")
        .eq("id", id)
        .maybeSingle();
    return { data, slug, id };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
    const { slug, id } = await params;
    const { data: thread } = await getThread(slug, id);

    const title = thread?.title || "אשכול";
    const description = thread?.content
        ? thread.content.replace(/<[^>]*>/g, "").slice(0, 160)
        : `דיון בפורום ${slug} — קהילת LUMOS IL`;

    return {
        title,
        description,
        alternates: {
            canonical: getCanonicalUrl(`/forums/${slug}/${id}`),
        },
        openGraph: {
            title: `${title} | LUMOS IL`,
            description,
            url: `https://lumos-il.co.il/forums/${slug}/${id}`,
            siteName: "LUMOS IL",
            type: "article",
        },
    };
}

export default async function ThreadLayout({ params, children }: Props) {
    const { slug, id } = await params;
    const { data: thread } = await getThread(slug, id);

    const title = thread?.title || "אשכול";
    const author = (thread?.profiles as any)?.full_name;
    const description = thread?.content
        ? thread.content.replace(/<[^>]*>/g, "").slice(0, 160)
        : `דיון בפורום ${slug} — קהילת LUMOS IL`;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "DiscussionForumPosting",
        "headline": title,
        "description": description,
        "url": `https://lumos-il.co.il/forums/${slug}/${id}`,
        "inLanguage": "he",
        "datePublished": thread?.created_at,
        ...(author ? { "author": { "@type": "Person", "name": author } } : {}),
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
