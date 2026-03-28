import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";

const BASE = "https://lumos-il.co.il";

type Props = {
  params: Promise<{ id: string; orderIndex: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string; orderIndex: string }> }): Promise<Metadata> {
  const { id, orderIndex } = await params;
  const supabase = await createClient();

  const { data: chapter } = await supabase
    .from("chapters")
    .select("title, content, stories(title, cover_url)")
    .eq("story_id", id)
    .eq("order_index", Number(orderIndex))
    .maybeSingle();

  if (!chapter) return {};

  const storyData = Array.isArray(chapter.stories) ? chapter.stories[0] : (chapter.stories as any);
  const storyTitle = storyData?.title || "סיפור";
  const chapterTitle = chapter.title || `פרק ${orderIndex}`;
  const fullTitle = `${chapterTitle} | ${storyTitle}`;

  const rawContent = typeof chapter.content === "string" ? chapter.content : "";
  const description = rawContent
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155) || `קרא את ${chapterTitle} מתוך "${storyTitle}" בספריית LUMOS IL`;

  const imageUrl = storyData?.cover_url || `${BASE}/images/og-image.png`;
  const url = `${BASE}/library/${id}/${orderIndex}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: chapterTitle,
    description,
    url,
    inLanguage: "he",
    isPartOf: {
      "@type": "Book",
      name: storyTitle,
      url: `${BASE}/library/${id}`,
    },
    publisher: {
      "@type": "Organization",
      name: "LUMOS IL",
      url: BASE,
    },
  };

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: `${fullTitle} | LUMOS IL`,
      description,
      url,
      type: "article",
      locale: "he_IL",
      siteName: "LUMOS IL",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: chapterTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${fullTitle} | LUMOS IL`,
      description,
      images: [imageUrl],
    },
    alternates: { canonical: url },
    other: {
      "application/ld+json": JSON.stringify(jsonLd),
    },
  };
}

export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
