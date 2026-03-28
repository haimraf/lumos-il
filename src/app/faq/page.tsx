import FAQPageClient from "@/components/FAQPageClient";
import { getFAQItems } from "@/lib/faq";

export default async function FAQPage() {
  const items = await getFAQItems();

  return <FAQPageClient items={items} />;
}
