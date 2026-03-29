import type { Metadata } from "next";

export const SITE_URL = "https://lumos-il.co.il";

export function getCanonicalUrl(path: string = "/") {
  return new URL(path, SITE_URL).toString();
}

export function getNewsArticlePath(articleId: string) {
  return `/news/${articleId}`;
}

export function getNewsArticleUrl(articleId: string) {
  return getCanonicalUrl(getNewsArticlePath(articleId));
}

export function withCanonical(metadata: Metadata, path: string): Metadata {
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: getCanonicalUrl(path),
    },
  };
}
