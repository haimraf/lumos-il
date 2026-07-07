import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getCanonicalUrl } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string; id: string }>;
  children: React.ReactNode;
}

type ThreadProfileRow = { full_name?: string | null };
type ThreadProfile = ThreadProfileRow | ThreadProfileRow[] | null;
type ThreadRow = { title?: string | null; content?: string | null; created_at?: string | null; profiles?: ThreadProfile };

function normalizeProfile(profile: ThreadProfile): ThreadProfileRow | null {
  return Array.isArray(profile) ? profile[0] ?? null : profile;
}

function stripHtml(value: string | null | undefined) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function getThread(slug: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("threads")
    .select("title, content, created_at, profiles(full_name)")
    .eq("id", id)
    .maybeSingle();
  return { data: data as ThreadRow | null, slug, id };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const { data: thread } = await getThread(slug, id);

  const title = thread?.title || "אשכול פורום";
  const description = stripHtml(thread?.content).slice(0, 160) || `דיון בפורום ${slug} בתוך קהילת LUMOS IL בעברית.`;
  const url = getCanonicalUrl(`/forums/${slug}/${id}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | LUMOS IL`,
      description,
      url,
      siteName: "LUMOS IL",
      locale: "he_IL",
      type: "article",
      images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | LUMOS IL`,
      description,
      images: ["/images/og-image.png"],
    },
  };
}

export default async function ThreadLayout({ params, children }: Props) {
  const { slug, id } = await params;
  const { data: thread } = await getThread(slug, id);

  const title = thread?.title || "אשכול פורום";
  const author = normalizeProfile(thread?.profiles || null)?.full_name;
  const description = stripHtml(thread?.content).slice(0, 160) || `דיון בפורום ${slug} בתוך קהילת LUMOS IL בעברית.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: title,
    description,
    url: `https://lumos-il.co.il/forums/${slug}/${id}`,
    inLanguage: "he-IL",
    datePublished: thread?.created_at,
    ...(author ? { author: { "@type": "Person", name: author } } : {}),
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