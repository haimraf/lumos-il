import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type LegacyThreadRedirectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LegacyThreadRedirectPage({ params }: LegacyThreadRedirectPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("threads")
    .select("id, forums(slug)")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const forumRelation = Array.isArray(data.forums) ? data.forums[0] : data.forums;
  const forumSlug = forumRelation?.slug;

  if (!forumSlug) {
    redirect("/forums");
  }

  redirect(`/forums/${forumSlug}/${id}`);
}
