import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: "בחינות הוגוורטס",
  description: "גשו לבחינות O.W.L ו-N.E.W.T של LUMOS IL, בדקו ידע בעולם הארי פוטר וזכו בתואר קהילתי בתוך הטירה.",
  keywords: ["OWL", "NEWT", "בחינות", "הוגוורטס", "הארי פוטר", "lumos IL", "חידון הארי פוטר"],
  openGraph: {
    title: "בחינות הוגוורטס | LUMOS IL",
    description: "בחינות O.W.L ו-N.E.W.T בעברית למעריצות ומעריצי הארי פוטר.",
    url: "https://lumos-il.co.il/exams",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "בחינות הוגוורטס - LUMOS IL" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "בחינות הוגוורטס | LUMOS IL",
    description: "בחינות O.W.L ו-N.E.W.T בעברית למעריצות ומעריצי הארי פוטר.",
    images: ["/images/og-image.png"],
  },
}, "/exams");

export default function ExamsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}