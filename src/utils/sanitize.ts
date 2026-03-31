import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "a", "b", "i", "u", "em", "strong", "s", "strike", "del",
  "p", "br", "hr", "ul", "ol", "li", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "span", "div", "pre", "code",
  "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td",
  "iframe", "video", "source",
  "sub", "sup", "mark", "small",
];

const ALLOWED_ATTR = [
  "href", "target", "rel", "src", "alt", "title", "width", "height",
  "class", "style", "id", "loading", "allow", "allowfullscreen",
  "frameborder", "colspan", "rowspan", "start", "type",
];

const ALLOWED_URI_REGEXP = /^(?:https?|mailto):/i;

/**
 * Sanitize user-generated HTML content, keeping safe formatting tags.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return dirty;

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
  });
}

/**
 * Sanitize content that should only contain inline formatting (signatures, short bios).
 */
export function sanitizeInline(dirty: string): string {
  if (!dirty) return dirty;

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "u", "em", "strong", "s", "span", "a", "br", "mark", "small", "sub", "sup"],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style", "title"],
    ALLOWED_URI_REGEXP,
    ALLOW_DATA_ATTR: false,
  });
}
