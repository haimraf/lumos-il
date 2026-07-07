import type { Metadata } from "next";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { getCanonicalUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ id: string }>;
};

type StoryProfileRow = { full_name?: string | null };
type StoryProfile = StoryProfileRow | StoryProfileRow[] | null;
type StoryRow = {
  title?: string | null;
  description?: string | null;
  cover_url?: string | null;
  profiles?: StoryProfile;
};

function normalizeProfile(profile: StoryProfile): StoryProfileRow | null {
  return Array.isArray(profile) ? profile[0] ?? null : profile;
}

function stripHtml(value: string | null | undefined) {
  return String(value || "").replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
}

async function getStory(id: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("stories")
    .select("title, description, cover_url, profiles:author_id(full_name)")
    .eq("id", id)
    .maybeSingle();
  return (data as StoryRow | null) || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const story = await getStory(id);

  if (!story) {
    return {
      title: "סיפור לא נמצא | LUMOS IL",
      robots: { index: false, follow: true },
    };
  }

  const title = story.title || "סיפור בספריית LUMOS IL";
  const cleanDescription = stripHtml(story.description).slice(0, 160) || "פאנפיק בעברית מתוך ספריית LUMOS IL וקהילת הארי פוטר בישראל.";
  const authorName = normalizeProfile(story.profiles || null)?.full_name || "כותבי הטירה";
  const imageUrl = story.cover_url || "https://lumos-il.co.il/images/og-image.png";
  const url = getCanonicalUrl(`/library/${id}`);

  return {
    title: `${title} | LUMOS IL`,
    description: cleanDescription,
    authors: [{ name: authorName }],
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | LUMOS IL`,
      description: cleanDescription,
      url,
      siteName: "LUMOS IL",
      locale: "he_IL",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | LUMOS IL`,
      description: cleanDescription,
      images: [imageUrl],
    },
  };
}

export default async function StoryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await getStory(id);
  const title = story?.title || "סיפור בלומוס IL";
  const cleanDescription = stripHtml(story?.description).slice(0, 160) || "סיפור קהילתי בעברית בספריית LUMOS IL.";
  const authorName = normalizeProfile(story?.profiles || null)?.full_name || "כותבי הטירה";
  const imageUrl = story?.cover_url || "https://lumos-il.co.il/images/og-image.png";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    author: { "@type": "Person", name: authorName },
    image: imageUrl,
    description: cleanDescription,
    url: `https://lumos-il.co.il/library/${id}`,
    inLanguage: "he-IL",
    genre: ["Fan Fiction", "Fantasy"],
    isPartOf: {
      "@type": "CollectionPage",
      name: "ספריית הפאנפיקים של LUMOS IL",
      url: "https://lumos-il.co.il/library",
    },
    publisher: {
      "@type": "Organization",
      name: "LUMOS IL",
      url: "https://lumos-il.co.il",
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