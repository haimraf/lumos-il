import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "לוח הבקרה האישי | LUMOS IL",
  description: "לוח הבקרה האישי של LUMOS IL מרכז קווסטים, התקדמות, נקודות בית, התראות ופעילות קהילה בתוך הטירה.",
  alternates: { canonical: getCanonicalUrl("/dashboard") },
  robots: { index: false, follow: false },
  openGraph: {
    title: "לוח הבקרה האישי | LUMOS IL",
    description: "מרכז אישי לקווסטים, נקודות בית, פעילות קהילה והמשך המסע בטירה.",
    url: "https://lumos-il.co.il/dashboard",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "לוח הבקרה האישי של LUMOS IL" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "לוח הבקרה האישי | LUMOS IL",
    description: "מרכז אישי לקווסטים, נקודות בית והמשך המסע בטירה.",
    images: ["/images/og-image.png"],
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}