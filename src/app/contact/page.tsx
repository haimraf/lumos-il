import type { Metadata } from "next";
import ContactSupportPage from "@/components/contact/ContactSupportPage";

export const metadata: Metadata = {
  title: "הינשופייה (צור קשר) | LUMOS IL",
  description: "שלחו ינשוף לצוות הטירה. דיווח על באגים, הצטרפות למסדר, הצעות או סתם מחשבות להגיגית - אנחנו כאן.",
  openGraph: {
    title: "הינשופייה - צור קשר | LUMOS IL",
    description: "שלחו ינשוף לצוות הטירה. אנחנו כבר נדאג שהוא ינחת במקום הנכון.",
    // אם יש לכם תמונה של ינשופייה או משהו קסום אחר, שווה להוסיף כאן:
    // images: ['/images/owlery-og.jpg'], 
  }
};

export default function ContactPage() {
  return <ContactSupportPage />;
}