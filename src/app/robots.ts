import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin-panel", "/dashboard", "/sorting", "/api/"],
      },
    ],
    sitemap: "https://lumos-il.co.il/sitemap.xml",
    host: "https://lumos-il.co.il",
  };
}
