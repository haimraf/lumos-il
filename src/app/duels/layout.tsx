import type { Metadata } from "next";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical({
  title: "דו-קרב לחשים",
  description: "צפו בדו-קרב לחשים חי בין חברות וחברי קהילת LUMOS IL. כל מהלך בזמן אמת, עם אווירת טירה ונקודות קהילה.",
  openGraph: {
    title: "דו-קרב לחשים | LUMOS IL",
    description: "דו-קרב לחשים חי בין חברות וחברי קהילת LUMOS IL.",
    url: "https://lumos-il.co.il/duels",
    siteName: "LUMOS IL",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "דו-קרב לחשים - LUMOS IL" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "דו-קרב לחשים | LUMOS IL",
    description: "דו-קרב לחשים חי בין חברות וחברי קהילת LUMOS IL.",
    images: ["/images/og-image.png"],
  },
}, "/duels");

export default function DuelsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}