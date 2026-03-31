import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, ScrollText, User } from "lucide-react";
import NewsArticleEngagement from "@/components/news/NewsArticleEngagement";
import { createClient } from "@/utils/supabase/server";
import { sanitizeHtml } from "@/utils/sanitize";
import { getNewsArticlePath, getNewsArticleUrl, withCanonical } from "@/lib/seo";

type NewsArticle = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  image_url?: string | null;
  author_profile?:
    | {
        id: string;
        full_name?: string | null;
      }
    | {
        id: string;
        full_name?: string | null;
      }[]
    | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(text: string, length: number) {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}...`;
}

function getAuthorProfile(article: NewsArticle) {
  return Array.isArray(article.author_profile) ? article.author_profile[0] ?? null : article.author_profile;
}

function readingTime(html: string) {
  const words = stripHtml(html).split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

async function getArticle(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news")
    .select(`
      id,
      title,
      content,
      created_at,
      author,
      meta_title,
      meta_description,
      image_url,
      author_profile:profiles!news_author_id_fkey(
        id,
        full_name
      )
    `)
    .eq("id", id)
    .maybeSingle();

  return data as NewsArticle | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    return {
      title: "כתבה לא נמצאה | LUMOS IL",
      robots: { index: false, follow: true },
    };
  }

  const title = article.meta_title?.trim() || article.title;
  const description = article.meta_description?.trim() || truncate(stripHtml(article.content), 160);
  const image = article.image_url || "/images/og-image.png";
  const author = getAuthorProfile(article)?.full_name || article.author || "מערכת LUMOS IL";

  return withCanonical(
    {
      title,
      description,
      authors: [{ name: author }],
      openGraph: {
        title,
        description,
        url: getNewsArticleUrl(article.id),
        siteName: "LUMOS IL",
        type: "article",
        publishedTime: article.created_at,
        images: [{ url: image, width: 1200, height: 630, alt: article.title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    },
    getNewsArticlePath(article.id),
  );
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    notFound();
  }

  const authorProfile = getAuthorProfile(article);
  const authorLabel = authorProfile?.full_name || article.author || "מערכת LUMOS IL";
  const description = article.meta_description?.trim() || truncate(stripHtml(article.content), 220);
  const publishedAt = new Date(article.created_at);
  const publishedLabel = Number.isNaN(publishedAt.getTime())
    ? article.created_at
    : publishedAt.toLocaleDateString("he-IL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description,
    datePublished: article.created_at,
    dateModified: article.created_at,
    mainEntityOfPage: getNewsArticleUrl(article.id),
    author: {
      "@type": "Person",
      name: authorLabel,
    },
    publisher: {
      "@type": "Organization",
      name: "LUMOS IL",
      url: "https://lumos-il.co.il",
    },
    image: article.image_url || "https://lumos-il.co.il/images/og-image.png",
    inLanguage: "he",
  };

  return (
    <article className="w-full text-white" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <style>{`
        .news-article-prose { color: #2b1907; }
        .news-article-prose h1 { font-family: "Cinzel", serif; font-size: 2rem; margin: 1.5rem 0 1rem; color: #4a2400; }
        .news-article-prose h2 { font-family: "Cinzel", serif; font-size: 1.4rem; margin: 1.25rem 0 0.75rem; color: #6b3300; }
        .news-article-prose h3 { font-family: "Cinzel", serif; font-size: 1.15rem; margin: 1rem 0 0.65rem; color: #7c3f00; }
        .news-article-prose p { margin-bottom: 1rem; line-height: 1.9; }
        .news-article-prose ul, .news-article-prose ol { margin: 0 1.5rem 1rem 0; }
        .news-article-prose li { margin-bottom: 0.45rem; }
        .news-article-prose blockquote {
          margin: 1.25rem 0;
          border-right: 4px solid rgba(146, 64, 14, 0.45);
          background: rgba(146, 64, 14, 0.08);
          border-radius: 0 0.75rem 0.75rem 0;
          padding: 1rem 1.25rem;
          color: #5d2a00;
          font-style: italic;
        }
        .news-article-prose img { width: 100%; border-radius: 1rem; margin: 1.5rem 0; }
        .news-article-prose a { color: #92400e; text-decoration: underline; text-underline-offset: 2px; }
        .news-article-prose strong { color: #3d1500; }
      `}</style>

      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-cinzel font-black uppercase tracking-[0.22em] text-white/75 transition-all hover:border-white/20 hover:text-white"
        >
          <ChevronRight size={14} />
          חזרה לנביא היומי
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[10px] font-cinzel font-black uppercase tracking-[0.24em] text-amber-200/85">
          <ScrollText size={14} />
          כתבת נביא
        </div>
      </div>

      <div className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#e8d5a3] text-[#1e0e04] shadow-[0_32px_90px_rgba(0,0,0,0.35)]">
        {article.image_url && (
          <div className="h-[220px] w-full overflow-hidden md:h-[360px]">
            <img
              src={article.image_url}
              alt={article.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-6 md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e0e04]/10 pb-5">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-[#5d2a00]/70">
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                {publishedLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <ScrollText size={13} />
                {readingTime(article.content)} דקות קריאה
              </span>
              <span className="flex items-center gap-1.5">
                <User size={13} />
                {authorProfile?.id ? (
                  <Link href={`/wizard/${authorProfile.id}`} className="hover:underline">
                    {authorLabel}
                  </Link>
                ) : (
                  authorLabel
                )}
              </span>
            </div>
          </div>

          <header className="pt-6">
            <h1 className="font-cinzel text-3xl font-black leading-snug text-[#1e0e04] md:text-5xl">
              {article.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#5d2a00]/80 md:text-lg">
              {description}
            </p>
          </header>

          <div
            className="news-article-prose mt-8 text-base"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
          />

          <NewsArticleEngagement newsId={article.id} />
        </div>
      </div>
    </article>
  );
}
