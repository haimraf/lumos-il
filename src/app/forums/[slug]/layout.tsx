import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";

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
    const description = forum?.description || `אשכולות ודיונים בפורום ${title} — קהילת LUMOS IL`;

    return {
        title,
        description,
        openGraph: {
            title: `${title} | LUMOS IL`,
            description,
            url: `https://lumos-il.co.il/forums/${slug}`,
            siteName: "LUMOS IL",
            type: "website",
        },
    };
}

export default function ForumCategoryLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
