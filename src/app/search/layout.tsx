import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: "חיפוש בטירה",
  description: "חפשו קוסמות וקוסמים, פאנפיקים, כתבות, אשכולות ופעילות קהילה בתוך LUMOS IL.",
  openGraph: {
    title: "חיפוש בטירה | LUMOS IL",
    description: "חפשו פאנפיקים, כתבות, אשכולות ומשתתפים בטירה.",
    url: "https://lumos-il.co.il/search",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "חיפוש בטירה - LUMOS IL" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "חיפוש בטירה | LUMOS IL",
    description: "חפשו פאנפיקים, כתבות, אשכולות ומשתתפים בטירה.",
    images: ["/opengraph-image"],
  },
  robots: { index: false, follow: false },
}, "/search");

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}