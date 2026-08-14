import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getCanonicalUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ id: string; orderIndex: string }>;
  children: React.ReactNode;
};

type ChapterStoryRow = {
  title?: string | null;
  cover_url?: string | null;
};
type ChapterStory = ChapterStoryRow | ChapterStoryRow[] | null;

type ChapterRow = {
  title?: string | null;
  content?: string | null;
  updated_at?: string | null;
  stories?: ChapterStory;
};

function normalizeStory(story: ChapterStory): ChapterStoryRow | null {
  return Array.isArray(story) ? story[0] ?? null : story;
}

function stripHtml(value: string | null | undefined) {
  return String(value || "").replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
}

async function getChapter(id: string, orderIndex: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chapters")
    .select("title, content, updated_at, stories(title, cover_url)")
    .eq("story_id", id)
    .eq("order_index", Number(orderIndex))
    .maybeSingle();

  return (data as ChapterRow | null) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; orderIndex: string }> }): Promise<Metadata> {
  const { id, orderIndex } = await params;
  const chapter = await getChapter(id, orderIndex);

  if (!chapter) {
    return {
      title: "פרק לא נמצא | LUMOS IL",
      robots: { index: false, follow: true },
    };
  }

  const story = normalizeStory(chapter.stories || null);
  const storyTitle = story?.title || "סיפור בספריית LUMOS IL";
  const chapterTitle = chapter.title || `פרק ${orderIndex}`;
  const fullTitle = `${chapterTitle} | ${storyTitle}`;
  const description = stripHtml(chapter.content).slice(0, 155) || `פרק מתוך "${storyTitle}" בספריית הפאנפיקים של LUMOS IL.`;
  const imageUrl = story?.cover_url || "https://lumos-il.co.il/opengraph-image";
  const url = getCanonicalUrl(`/library/${id}/${orderIndex}`);

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${fullTitle} | LUMOS IL`,
      description,
      url,
      type: "article",
      locale: "he_IL",
      siteName: "LUMOS IL",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${fullTitle} | LUMOS IL`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ChapterLayout({ children, params }: Props) {
  const { id, orderIndex } = await params;
  const chapter = await getChapter(id, orderIndex);
  const story = normalizeStory(chapter?.stories || null);
  const storyTitle = story?.title || "סיפור בספריית LUMOS IL";
  const chapterTitle = chapter?.title || `פרק ${orderIndex}`;
  const description = stripHtml(chapter?.content).slice(0, 160) || `פרק מתוך "${storyTitle}" בספריית הפאנפיקים של LUMOS IL.`;
  const url = getCanonicalUrl(`/library/${id}/${orderIndex}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Chapter",
    name: chapterTitle,
    headline: chapterTitle,
    description,
    url,
    inLanguage: "he-IL",
    isPartOf: {
      "@type": "CreativeWork",
      name: storyTitle,
      url: getCanonicalUrl(`/library/${id}`),
    },
    publisher: {
      "@type": "Organization",
      name: "LUMOS IL",
      url: "https://lumos-il.co.il",
    },
    ...(chapter?.updated_at ? { dateModified: chapter.updated_at } : {}),
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