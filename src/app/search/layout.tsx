import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "חיפוש",
    description: "חפשו קוסמים, פאנפיקים, כתבות ואשכולות בקהילת LUMOS IL.",
    openGraph: {
        title: "חיפוש | LUMOS IL",
        description: "חפשו קוסמים, פאנפיקים, כתבות ואשכולות.",
        url: "https://lumos-il.co.il/search",
        siteName: "LUMOS IL",
        type: "website",
    },
    robots: { index: false, follow: false },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
