import type { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";
import { getNewsArticleUrl } from "@/lib/seo";
import {
  fetchLiveEventCatalog,
  getLiveEventCatalogStatus,
  getLiveEventHref,
} from "@/lib/liveEvent";

const BASE = "https://lumos-il.co.il";

type ThreadSitemapRow = {
  id: string;
  updated_at: string | null;
  forums: { slug: string | null }[] | { slug: string | null } | null;
};

type NewsSitemapRow = {
  id: string;
  created_at: string | null;
};

type StorySitemapRow = {
  id: string;
  updated_at: string | null;
};

type ChapterSitemapRow = {
  story_id: string;
  order_index: number;
  updated_at: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const [{ data: forums }, { data: threads }, { data: newsArticles }, { data: stories }, { data: chapters }, liveEvents] = await Promise.all([
    supabase.from("forums").select("slug, updated_at"),
    supabase
      .from("threads")
      .select("id, forum_id, updated_at, forums(slug)")
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("news")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("stories")
      .select("id, updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(300),
    supabase
      .from("chapters")
      .select("story_id, order_index, updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(1000),
    fetchLiveEventCatalog(supabase),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                         lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/home`,               lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/forums`,             lastModified: new Date(), changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE}/news`,               lastModified: new Date(), changeFrequency: "daily",   priority: 0.85 },
    { url: `${BASE}/library`,            lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/house-cup`,          lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/arena`,              lastModified: new Date(), changeFrequency: "hourly",  priority: 0.75 },
    { url: `${BASE}/great-hall`,         lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/map`,                lastModified: new Date(), changeFrequency: "hourly",  priority: 0.65 },
    { url: `${BASE}/quests`,             lastModified: new Date(), changeFrequency: "daily",   priority: 0.65 },
    { url: `${BASE}/shop`,               lastModified: new Date(), changeFrequency: "weekly",  priority: 0.6 },
    { url: `${BASE}/ollivanders`,        lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/faq`,                lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/about`,              lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/rules`,              lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const eventRoutes: MetadataRoute.Sitemap = (liveEvents || [])
    .filter((event) => {
      const status = getLiveEventCatalogStatus(event);
      return status !== "draft" && status !== "archived";
    })
    .map((event) => {
      const status = getLiveEventCatalogStatus(event);
      const lastModifiedValue = event.updated_at || event.created_at;

      return {
        url: `${BASE}${getLiveEventHref(event)}`,
        lastModified: lastModifiedValue ? new Date(lastModifiedValue) : new Date(),
        changeFrequency: status === "live" || status === "upcoming" ? ("daily" as const) : ("monthly" as const),
        priority: status === "live" || status === "upcoming" ? 0.88 : 0.62,
      };
    });

  const forumRoutes: MetadataRoute.Sitemap = (forums || []).map(f => ({
    url: `${BASE}/forums/${f.slug}`,
    lastModified: f.updated_at ? new Date(f.updated_at) : new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const threadRoutes: MetadataRoute.Sitemap = ((threads || []) as ThreadSitemapRow[]).map((t) => {
    const forumSlug = Array.isArray(t.forums) ? t.forums[0]?.slug : t.forums?.slug;

    return {
    url: `${BASE}/forums/${forumSlug}/${t.id}`,
    lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
    changeFrequency: "daily" as const, // עודכן מ-weekly ל-daily
    priority: 0.8, // עודכן מ-0.6 ל-0.8
  }}).filter((route) => !route.url.includes("undefined"));

  const newsRoutes: MetadataRoute.Sitemap = ((newsArticles || []) as NewsSitemapRow[]).map((n) => ({
    url: getNewsArticleUrl(n.id),
    lastModified: n.created_at ? new Date(n.created_at) : new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const storyRoutes: MetadataRoute.Sitemap = ((stories || []) as StorySitemapRow[]).map((s) => ({
    url: `${BASE}/library/${s.id}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const chapterRoutes: MetadataRoute.Sitemap = ((chapters || []) as ChapterSitemapRow[]).map((c) => ({
    url: `${BASE}/library/${c.story_id}/${c.order_index}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...eventRoutes, ...forumRoutes, ...threadRoutes, ...newsRoutes, ...storyRoutes, ...chapterRoutes];
}
