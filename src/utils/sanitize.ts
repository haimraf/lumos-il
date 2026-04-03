const BLOCK_ALLOWED_TAGS = new Set([
  "a", "b", "i", "u", "em", "strong", "s", "strike", "del",
  "p", "br", "hr", "ul", "ol", "li", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "span", "div", "pre", "code",
  "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td",
  "iframe", "video", "source",
  "sub", "sup", "mark", "small",
]);

const INLINE_ALLOWED_TAGS = new Set([
  "a", "b", "i", "u", "em", "strong", "s", "span", "br", "mark", "small", "sub", "sup",
]);

const ALLOWED_ATTRS = new Set([
  "href", "target", "rel", "src", "alt", "title", "width", "height",
  "class", "style", "id", "loading", "allow", "allowfullscreen",
  "frameborder", "colspan", "rowspan", "start", "type",
]);

const VOID_TAGS = new Set(["br", "hr", "img", "source"]);
const URL_ATTRS = new Set(["href", "src"]);
const NUMERIC_ATTRS = new Set(["width", "height", "colspan", "rowspan", "start"]);
const BOOLEAN_ATTRS = new Set(["allowfullscreen"]);
const SAFE_TARGETS = new Set(["_blank", "_self", "_parent", "_top"]);

const DANGEROUS_BLOCKS = /<(script|style|noscript|template)[^>]*>[\s\S]*?<\/\1\s*>/gi;
const HTML_COMMENTS = /<!--[\s\S]*?-->/g;
const TAG_PATTERN = /<\/?([a-zA-Z0-9:-]+)([^>]*)>/g;
const ATTR_PATTERN = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function normalizeUrl(rawValue: string) {
  const value = rawValue.trim();

  if (!value) return null;

  if (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("#") ||
    value.startsWith("?")
  ) {
    return value;
  }

  if (/^(?:https?:|mailto:|tel:)/i.test(value)) {
    return value;
  }

  return null;
}

function sanitizeStyle(rawValue: string) {
  const value = rawValue.trim();

  if (!value) return null;
  if (/url\s*\(|expression\s*\(|@import|javascript:/i.test(value)) return null;

  const cleaned = value.replace(/[<>`"]/g, "").trim();
  return cleaned || null;
}

function sanitizeTokenList(rawValue: string) {
  const cleaned = rawValue
    .trim()
    .replace(/[^\w\-: ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function sanitizeAttr(name: string, rawValue: string) {
  if (BOOLEAN_ATTRS.has(name)) return { name, value: "" };

  if (URL_ATTRS.has(name)) {
    const safeUrl = normalizeUrl(rawValue);
    return safeUrl ? { name, value: safeUrl } : null;
  }

  if (name === "style") {
    const safeStyle = sanitizeStyle(rawValue);
    return safeStyle ? { name, value: safeStyle } : null;
  }

  if (name === "class" || name === "id") {
    const safeTokens = sanitizeTokenList(rawValue);
    return safeTokens ? { name, value: safeTokens } : null;
  }

  if (name === "target") {
    const target = rawValue.trim().toLowerCase();
    return SAFE_TARGETS.has(target) ? { name, value: target } : null;
  }

  if (name === "rel") {
    const rel = rawValue
      .trim()
      .replace(/[^\w\- ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return rel ? { name, value: rel } : null;
  }

  if (NUMERIC_ATTRS.has(name)) {
    const numeric = rawValue.trim();
    return /^\d{1,4}%?$/.test(numeric) ? { name, value: numeric } : null;
  }

  const cleaned = rawValue.replace(/[\u0000-\u001F\u007F<>`"]/g, "").trim();
  return cleaned ? { name, value: cleaned } : null;
}

function mergeAnchorRel(attrs: Array<{ name: string; value: string }>) {
  const targetAttr = attrs.find((attr) => attr.name === "target");
  if (!targetAttr || targetAttr.value !== "_blank") return attrs;

  const relAttr = attrs.find((attr) => attr.name === "rel");
  const relTokens = new Set(
    (relAttr?.value ?? "")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );

  relTokens.add("noopener");
  relTokens.add("noreferrer");

  const relValue = Array.from(relTokens).join(" ");

  if (relAttr) {
    relAttr.value = relValue;
    return attrs;
  }

  return [...attrs, { name: "rel", value: relValue }];
}

function sanitizeTag(tagName: string, rawAttrs: string, allowedTags: Set<string>) {
  const tag = tagName.toLowerCase();
  if (!allowedTags.has(tag)) return "";

  const attrs: Array<{ name: string; value: string }> = [];
  let match: RegExpExecArray | null;

  ATTR_PATTERN.lastIndex = 0;
  while ((match = ATTR_PATTERN.exec(rawAttrs))) {
    const name = match[1]?.toLowerCase();
    if (!name || name.startsWith("on") || !ALLOWED_ATTRS.has(name)) {
      continue;
    }

    const rawValue = match[2] ?? match[3] ?? match[4] ?? "";
    const safeAttr = sanitizeAttr(name, rawValue);
    if (safeAttr) attrs.push(safeAttr);
  }

  const finalAttrs = tag === "a" ? mergeAnchorRel(attrs) : attrs;
  const serializedAttrs = finalAttrs
    .map((attr) => (BOOLEAN_ATTRS.has(attr.name) ? attr.name : `${attr.name}="${escapeAttr(attr.value)}"`))
    .join(" ");

  return serializedAttrs ? `<${tag} ${serializedAttrs}>` : `<${tag}>`;
}

function sanitizeMarkup(dirty: string, allowedTags: Set<string>) {
  if (!dirty) return dirty;

  const cleaned = dirty
    .replace(HTML_COMMENTS, "")
    .replace(DANGEROUS_BLOCKS, "");

  return cleaned.replace(TAG_PATTERN, (fullMatch, rawTagName: string, rawAttrs: string) => {
    const tagName = rawTagName.toLowerCase();
    const isClosing = fullMatch.startsWith("</");

    if (!allowedTags.has(tagName)) return "";
    if (isClosing) return VOID_TAGS.has(tagName) ? "" : `</${tagName}>`;

    return sanitizeTag(tagName, rawAttrs, allowedTags);
  });
}

/**
 * Sanitize user-generated HTML content, keeping safe formatting tags.
 */
export function sanitizeHtml(dirty: string): string {
  return sanitizeMarkup(dirty, BLOCK_ALLOWED_TAGS);
}

/**
 * Sanitize content that should only contain inline formatting (signatures, short bios).
 */
export function sanitizeInline(dirty: string): string {
  return sanitizeMarkup(dirty, INLINE_ALLOWED_TAGS);
}
