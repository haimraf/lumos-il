import { cache } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SITE_FAQ, type FAQItem } from "@/data/site-features-faq";

type FAQRow = {
  category: string;
  question: string;
  answer: string;
  display_order: number | null;
  created_at: string | null;
};

function faqKey(item: FAQItem) {
  return `${item.category}::${item.q}`.trim().toLowerCase();
}

function createPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const getFAQItems = cache(async (): Promise<FAQItem[]> => {
  const supabase = createPublicSupabase();

  if (!supabase) {
    return SITE_FAQ;
  }

  const { data, error } = await supabase
    .from("faq_items")
    .select("category, question, answer, display_order, created_at")
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    if (error) {
      console.warn("[faq] falling back to static FAQ:", error.message);
    }

    return SITE_FAQ;
  }

  const dbItems: FAQItem[] = (data as FAQRow[]).map((item) => ({
    category: item.category,
    q: item.question,
    a: item.answer,
  }));

  const staticKeys = new Set(SITE_FAQ.map(faqKey));
  const dbOverrides = new Map(dbItems.map((item) => [faqKey(item), item]));

  const mergedBase = SITE_FAQ.map((item) => dbOverrides.get(faqKey(item)) ?? item);
  const dbOnlyItems = dbItems.filter((item) => !staticKeys.has(faqKey(item)));

  return [...mergedBase, ...dbOnlyItems];
});
