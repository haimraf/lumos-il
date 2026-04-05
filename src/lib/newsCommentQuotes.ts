type QuotableComment = {
  user_id?: string | null;
  content?: string | null;
  profiles?: {
    full_name?: string | null;
  } | null;
};

export type ParsedNewsCommentQuote = {
  userId: string;
  author: string;
  body: string;
  remainder: string;
};

const QUOTE_OPEN = "[owl-quote]";
const QUOTE_CLOSE = "[/owl-quote]";

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

export function parseNewsCommentQuote(content: string): ParsedNewsCommentQuote | null {
  const normalized = normalizeText(content);
  const match = normalized.match(/^\[owl-quote\]\n([^\n]+)\n([^\n]+)\n([\s\S]*?)\n\[\/owl-quote\]\n*([\s\S]*)$/);

  if (!match) return null;

  return {
    userId: match[1].trim(),
    author: match[2].trim(),
    body: match[3].trim(),
    remainder: match[4].trim(),
  };
}

export function stripNewsCommentQuote(content: string) {
  return parseNewsCommentQuote(content)?.remainder ?? normalizeText(content);
}

export function buildNewsCommentQuoteMarkup(comment: QuotableComment) {
  const author = comment.profiles?.full_name?.trim() || "קוסם או מכשפה";
  const userId = comment.user_id?.trim();
  const body = normalizeText(comment.content || "");

  if (!userId || !body) return "";

  return `${QUOTE_OPEN}\n${userId}\n${author}\n${body}\n${QUOTE_CLOSE}`;
}

export function insertNewsCommentQuote(currentValue: string, comment: QuotableComment) {
  const quoteMarkup = buildNewsCommentQuoteMarkup(comment);
  if (!quoteMarkup) return currentValue;

  const remainder = stripNewsCommentQuote(currentValue);
  return remainder ? `${quoteMarkup}\n\n${remainder}` : `${quoteMarkup}\n\n`;
}
