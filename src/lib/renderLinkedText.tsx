import type { ReactNode } from "react";

const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
const TRAILING_PUNCTUATION = /[),.!?;:]+$/;

function normalizeUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

function splitUrlAndSuffix(rawUrl: string) {
  const suffixMatch = rawUrl.match(TRAILING_PUNCTUATION);
  const suffix = suffixMatch?.[0] || "";
  const cleanUrl = suffix ? rawUrl.slice(0, -suffix.length) : rawUrl;
  return { cleanUrl, suffix };
}

export function renderLinkedText(text: string): ReactNode[] {
  if (!text) return [text];

  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const matchText = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndex));
    }

    const { cleanUrl, suffix } = splitUrlAndSuffix(matchText);

    nodes.push(
      <a
        key={`${cleanUrl}-${matchIndex}`}
        href={normalizeUrl(cleanUrl)}
        target="_blank"
        rel="noreferrer noopener nofollow"
        className="font-bold text-sky-700 underline decoration-sky-400/60 underline-offset-4 transition-colors hover:text-sky-900"
      >
        {cleanUrl}
      </a>,
    );

    if (suffix) {
      nodes.push(suffix);
    }

    lastIndex = matchIndex + matchText.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length ? nodes : [text];
}
