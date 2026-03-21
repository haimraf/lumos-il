import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "פורומים",
  description: "האולם הגדול של LUMOS IL — שיחות, אשכולות ודיונים בין קוסמי ישראל.",
  openGraph: {
    title: "פורומים | LUMOS IL",
    description: "האולם הגדול של LUMOS IL — שיחות, אשכולות ודיונים בין קוסמי ישראל.",
    type: "website",
  },
};

export default function ForumsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "DiscussionForumPosting",
            "name": "פורומים — LUMOS IL",
            "description": "האולם הגדול של קהילת הקוסמים הישראלית",
            "url": "https://lumos-il.co.il/forums",
            "inLanguage": "he",
            "publisher": {
              "@type": "Organization",
              "name": "LUMOS IL",
              "url": "https://lumos-il.co.il",
            },
          }),
        }}
      />
      {children}
    </>
  );
}
