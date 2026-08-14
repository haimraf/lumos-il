import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getCanonicalUrl } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: forum } = await supabase
    .from("forums")
    .select("name, description")
    .eq("slug", slug)
    .maybeSingle();

  const title = forum?.name || slug;
  const description = forum?.description || `אשכולות ודיונים בפורום ${title} בתוך קהילת LUMOS IL בעברית.`;
  const url = getCanonicalUrl(`/forums/${slug}`);

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
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | LUMOS IL`,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default function ForumCategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}