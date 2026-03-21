import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";

const HOUSE_HE: Record<string, string> = {
  Gryffindor: "גריפינדור",
  Slytherin:  "סלית'רין",
  Ravenclaw:  "רייבנקלו",
  Hufflepuff: "הפלפאף",
};

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, house, avatar_url")
    .eq("id", id)
    .single();

  if (!profile) return { title: "פרופיל קוסם" };

  const houseHe = HOUSE_HE[profile.house] || profile.house || "";
  const title = `${profile.full_name} — ${houseHe}`;
  const description = `פרופיל הקוסם ${profile.full_name} מבית ${houseHe} ב-LUMOS IL.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | LUMOS IL`,
      description,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
      type: "profile",
    },
  };
}

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
