import type { Metadata } from "next";
import ContactSupportPage from "@/components/contact/ContactSupportPage";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical(
  {
    title: "הינשופייה (צור קשר) | LUMOS IL",
    description:
      "שלחו ינשוף לצוות הטירה. דיווח על באגים, הצטרפות לצוות, שיתופי פעולה, הצעות עסקיות או כל פנייה אחרת מגיעים מכאן ישר ללוח הבקרה.",
    openGraph: {
      title: "הינשופייה - צור קשר | LUMOS IL",
      description: "שלחו ינשוף לצוות הטירה, ואנחנו נדאג שהוא ינחת במקום הנכון.",
      url: "https://lumos-il.co.il/contact",
      siteName: "LUMOS IL",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "הינשופייה - צור קשר | LUMOS IL",
      description: "שלחו ינשוף לצוות הטירה, ואנחנו נדאג שהוא ינחת במקום הנכון.",
    },
  },
  "/contact",
);

export default function ContactPage() {
  return <ContactSupportPage />;
}
