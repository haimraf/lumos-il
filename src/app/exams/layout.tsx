import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "בחינות הוגוורטס",
    description: "גשו לבחינות O.W.L ו-N.E.W.T של הוגוורטס ב-LUMOS IL. הוכיחו את ידיעתכם בעולם הארי פוטר וזכו בתואר.",
    keywords: ["OWL", "NEWT", "בחינות", "הוגוורטס", "הארי פוטר", "lumos IL"],
    openGraph: {
        title: "בחינות הוגוורטס | LUMOS IL",
        description: "גשו לבחינות O.W.L ו-N.E.W.T והוכיחו את ידיעתכם.",
        url: "https://lumos-il.co.il/exams",
        siteName: "LUMOS IL",
        type: "website",
        images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "בחינות הוגוורטס — LUMOS IL" }],
    },
};

export default function ExamsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
