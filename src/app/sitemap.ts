import type { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";

const BASE = "https://lumos-il.co.il";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const [{ data: forums }, { data: threads }, { data: newsArticles }] = await Promise.all([
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

  const forumRoutes: MetadataRoute.Sitemap = (forums || []).map(f => ({
    url: `${BASE}/forums/${f.slug}`,
    lastModified: f.updated_at ? new Date(f.updated_at) : new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const threadRoutes: MetadataRoute.Sitemap = (threads || []).map((t: any) => ({
    url: `${BASE}/forums/${t.forums?.slug}/${t.id}`,
    lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  })).filter((r: any) => !r.url.includes("undefined"));

  const newsRoutes: MetadataRoute.Sitemap = (newsArticles || []).map((n: any) => ({
    url: `${BASE}/news?article=${n.id}`,
    lastModified: n.created_at ? new Date(n.created_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  return [...staticRoutes, ...forumRoutes, ...threadRoutes, ...newsRoutes];
}
