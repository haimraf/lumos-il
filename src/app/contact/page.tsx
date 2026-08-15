import type { Metadata } from "next";
import ContactSupportPage from "@/components/contact/ContactSupportPage";
import { withCanonical } from "@/lib/seo";

export const metadata: Metadata = withCanonical(
  {
    // הכותרת מכוונת לכוונת "צור קשר" בלבד. את החיפושים על "הינשופייה" עצמה
    // משרת עכשיו /owlery, שנותן מידע ולא טופס — ראו את ההערה בראש אותו קובץ.
    title: "צור קשר — שלחו ינשוף לצוות",
    description:
      "פנייה לצוות טירת לומוס: דיווח על באגים, הצטרפות לצוות, שיתופי פעולה, הצעות עסקיות או כל שאלה אחרת. הפנייה מגיעה ישירות ללוח הבקרה ונענית בינשוף חוזר.",
    openGraph: {
      title: "צור קשר | LUMOS IL",
      description: "שלחו ינשוף לצוות הטירה, ואנחנו נדאג שהוא ינחת במקום הנכון.",
      url: "https://lumos-il.co.il/contact",
      siteName: "LUMOS IL",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "צור קשר | LUMOS IL",
      description: "שלחו ינשוף לצוות הטירה, ואנחנו נדאג שהוא ינחת במקום הנכון.",
    },
  },
  "/contact",
);

export default function ContactPage() {
  return <ContactSupportPage />;
}
