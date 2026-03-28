import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";

const HOUSE_HE: Record<string, string> = {
  Gryffindor: "גריפינדור",
  Slytherin:  "סלית'רין",
  Ravenclaw:  "רייבנקלו",
  Hufflepuff: "הפלפאף",
};

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

async function getProfile(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, house, avatar_url, role, wand_type, patronus")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);

  if (!profile) return { title: "דף קוסם" };

  const houseHe = HOUSE_HE[profile.house] || profile.house || "";
  const title = `${profile.full_name} — ${houseHe}`;
  const description = `דף הקוסם של ${profile.full_name} מבית ${houseHe} ב-LUMOS IL.${profile.wand_type ? ` שרביט: ${profile.wand_type}.` : ""}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | LUMOS IL`,
      description,
      images: profile.avatar_url ? [{ url: profile.avatar_url, alt: `אווטאר של ${profile.full_name}` }] : [{ url: "/images/og-image.png" }],
      type: "profile",
      url: `https://lumos-il.co.il/wizard/${id}`,
    },
    twitter: {
      card: "summary",
      title: `${title} | LUMOS IL`,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : ["/images/og-image.png"],
    },
  };
}

export default async function WizardLayout({ params, children }: Props) {
  const { id } = await params;
  const profile = await getProfile(id);

  if (!profile) return <>{children}</>;

  const houseHe = HOUSE_HE[profile.house] || profile.house || "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": profile.full_name,
    "description": `דמות קסומה מבית ${houseHe} בקהילת LUMOS IL`,
    "url": `https://lumos-il.co.il/wizard/${id}`,
    "inLanguage": "he",
    ...(profile.avatar_url ? { "image": profile.avatar_url } : {}),
    "memberOf": {
      "@type": "Organization",
      "name": `בית ${houseHe} — LUMOS IL`,
      "url": "https://lumos-il.co.il",
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
