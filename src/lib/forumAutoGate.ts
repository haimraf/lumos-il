import type { CanonSource } from "@/lib/wizardingCanon";

/**
 * השער האוטומטי של מנוע פרסום האשכולות.
 *
 * הדיפולט הפוך מהרגיל: אשכול מתפרסם לבד, והשער הוא זה שעוצר. לכן הכללים כאן
 * שמרניים בכוונה — כל ספק מוריד את הטיוטה ל-needs_review במקום לתת לה לעלות.
 * הכלל המרכזי הוא ביסוס: מספר שלא נמצא בצילום הנתונים נחשב טענה לא מבוססת.
 */

export type ForumDraftSourceKind = "site-data" | "canon" | "external";

export type ForumDraftSource = {
  kind: ForumDraftSourceKind;
  /** תיאור קריא לבן אדם, מוצג בפאנל הניהול */
  label: string;
  /** הפניה מדויקת: שם טבלה, ספר ופרק, מזהה שורה */
  ref?: string | null;
  url?: string | null;
  reliability?: "high" | "medium" | "low";
};

export type ForumDraftCandidate = {
  title: string;
  /** HTML כפי שיישמר ב-forum_posts.content */
  content: string;
  canonSource: CanonSource;
  sources: ForumDraftSource[];
  /** הנתונים הגולמיים שמהם נכתב האשכול — כל מספר בטקסט חייב להופיע כאן */
  dataSnapshot?: Record<string, unknown>;
  prefix?: string | null;
};

export type GateReason = {
  code: string;
  message: string;
};

export type GateVerdict = {
  status: "approved" | "needs_review";
  reasons: GateReason[];
};

export type GateOptions = {
  blockedKeywords?: string[];
  allowedLinkHosts?: string[];
  /** שמות חברי קהילה — אזכור של אדם ספציפי תמיד עובר דרך בן אדם */
  knownMemberNames?: string[];
  minTextLength?: number;
  maxTextLength?: number;
};

/**
 * ברירת מחדל לנושאים שלא מתפרסמים בלי עין אנושית: כסף וכלכלת המשחק, ענישה
 * והחלטות צוות, וכל מה שנשמע כמו הבטחה בשם האתר.
 */
export const DEFAULT_BLOCKED_KEYWORDS: readonly string[] = [
  "גלאון",
  "גלאונים",
  "פרס",
  "פרסים",
  "זכייה",
  "זוכה",
  "הגרלה",
  "תשלום",
  "מנוי",
  "כרטיס אשראי",
  "תרומה",
  "באן",
  "חסימה",
  "הרחקה",
  "השעיה",
  "עונש",
  "תלונה",
  "פיטורים",
  "התפטרות",
  "מדיניות פרטיות",
  "תנאי שימוש",
];

const DEFAULT_ALLOWED_LINK_HOSTS: readonly string[] = ["lumos-il.co.il", "www.lumos-il.co.il"];

const MIN_TEXT_LENGTH = 120;
const MAX_TEXT_LENGTH = 6000;

/** מסיר תגיות HTML כדי שהבדיקות ירוצו על מה שהמשתמש באמת קורא. */
export function stripHtml(value: string): string {
  return (value || "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** אוסף כל טוקן מספרי שמופיע בצילום הנתונים, בכל עומק. */
function collectSnapshotNumbers(value: unknown, sink: Set<string>): void {
  if (value === null || value === undefined) return;

  if (typeof value === "number") {
    sink.add(String(value));
    // מספר עשרוני נחשב מבוסס גם בצורתו המעוגלת
    if (Number.isFinite(value) && !Number.isInteger(value)) {
      sink.add(String(Math.round(value)));
    }
    return;
  }

  if (typeof value === "string") {
    for (const match of value.matchAll(/\d+/g)) sink.add(match[0]);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectSnapshotNumbers(item, sink);
    return;
  }

  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectSnapshotNumbers(item, sink);
    }
  }
}

/**
 * פירוק טקסט למילים שלמות.
 *
 * חשוב שההשוואה לשמות תהיה ברמת מילה ולא תת-מחרוזת: בקהילה יש שמות קצרים כמו
 * "ולן", "גיא" ו-Bar, שמופיעים כתת-מחרוזת בתוך מילים רגילות לגמרי ("ולנסות",
 * "גיאוגרפיה", "Barrier"). התאמת תת-מחרוזת הייתה מורידה כמעט כל אשכול לבדיקה
 * ידנית ומרוקנת את השער מתוכן.
 */
function tokenize(value: string): string[] {
  return [...(value || "").toLowerCase().matchAll(/[\p{L}\p{N}_]+/gu)].map((match) => match[0]);
}

/** אותיות השימוש שנדבקות לתחילת מילה בעברית ("לדנה", "ומאיה", "כשגיא"). */
const HEBREW_PREFIX_LETTERS = new Set(["ו", "ה", "ב", "ל", "מ", "כ", "ש"]);

/**
 * מחזיר את צורות הטוקן האפשריות אחרי הסרת אותיות שימוש.
 * עוצר כשהגזע מתקצר מדי מכדי להתאים לשם (שמות נבדקים רק מאורך 3 ומעלה).
 */
function tokenForms(token: string): string[] {
  const forms = [token];
  let current = token;

  for (let depth = 0; depth < 2; depth += 1) {
    if (current.length <= 3 || !HEBREW_PREFIX_LETTERS.has(current[0])) break;
    current = current.slice(1);
    forms.push(current);
  }

  return forms;
}

/** האם שם (מילה אחת או צירוף) מופיע בטקסט כמילה שלמה, גם עם אות שימוש בתחילתה. */
function containsWholeName(haystackTokens: string[], name: string): boolean {
  const nameTokens = tokenize(name);
  if (nameTokens.length === 0) return false;

  if (nameTokens.length === 1) {
    const needle = nameTokens[0];
    return haystackTokens.some((token) => tokenForms(token).includes(needle));
  }

  // בצירוף שמות רק המילה הראשונה יכולה לשאת אות שימוש.
  const phrase = ` ${nameTokens.join(" ")} `;
  const raw = ` ${haystackTokens.join(" ")} `;
  const stripped = ` ${haystackTokens.map((token) => tokenForms(token).at(-1) as string).join(" ")} `;

  return raw.includes(phrase) || stripped.includes(phrase);
}

function extractLinkHosts(html: string): string[] {
  const hosts: string[] = [];
  for (const match of (html || "").matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("/")) continue;
    try {
      hosts.push(new URL(raw).hostname.toLowerCase());
    } catch {
      hosts.push(raw.toLowerCase());
    }
  }
  return hosts;
}

/**
 * מכריע אם טיוטה עולה לבד או מחכה לצוות.
 * מחזיר approved רק אם אף כלל לא נדלק.
 */
export function evaluateForumDraft(
  draft: ForumDraftCandidate,
  options: GateOptions = {},
): GateVerdict {
  const reasons: GateReason[] = [];
  const add = (code: string, message: string) => reasons.push({ code, message });

  const blockedKeywords = options.blockedKeywords?.length
    ? options.blockedKeywords
    : [...DEFAULT_BLOCKED_KEYWORDS];
  const allowedHosts = (options.allowedLinkHosts?.length
    ? options.allowedLinkHosts
    : [...DEFAULT_ALLOWED_LINK_HOSTS]
  ).map((host) => host.toLowerCase());

  const title = (draft.title || "").trim();
  const text = stripHtml(draft.content || "");
  const haystack = `${title} ${text}`;

  // ── ביסוס ──
  const sources = Array.isArray(draft.sources) ? draft.sources : [];
  if (sources.length === 0) {
    add("ungrounded", "אין מקורות מצורפים לאשכול.");
  }

  const canonSource = draft.canonSource;
  if (canonSource !== "site") {
    const hasCanonRef = sources.some(
      (source) => source.kind === "canon" && Boolean(source.ref?.trim()),
    );
    if (!hasCanonRef) {
      add(
        "canon-without-ref",
        `האשכול מסומן כ-"${canonSource}" אבל אין מקור קאנוני עם הפניה מדויקת.`,
      );
    }
  }

  // כל מספר בטקסט חייב להיות עקיב לצילום הנתונים.
  const snapshotNumbers = new Set<string>();
  collectSnapshotNumbers(draft.dataSnapshot ?? {}, snapshotNumbers);
  const unsourcedNumbers = [
    ...new Set([...haystack.matchAll(/\d+/g)].map((match) => match[0])),
  ].filter((token) => !snapshotNumbers.has(token));

  if (unsourcedNumbers.length > 0) {
    add(
      "unsourced-figures",
      `מספרים שלא נמצאים בצילום הנתונים: ${unsourcedNumbers.slice(0, 8).join(", ")}.`,
    );
  }

  // ── תוכן רגיש ──
  // גם כאן ההשוואה היא ברמת מילה שלמה. התאמת תת-מחרוזת שברה שני מקרים אמיתיים:
  // "באן" נמצא בתוך "אזקבאן" (שם ספר קאנוני), ו-"פרס" נמצא בתוך "פרסום".
  // לכן צורות הרבים מופיעות במפורש ברשימה במקום להסתמך על התאמה חלקית.
  const haystackTokens = tokenize(haystack);
  const matchedKeywords = blockedKeywords.filter((keyword) =>
    containsWholeName(haystackTokens, keyword),
  );
  if (matchedKeywords.length > 0) {
    add("blocked-keyword", `מילות מפתח שדורשות עין אנושית: ${matchedKeywords.join(", ")}.`);
  }

  const memberNames = options.knownMemberNames ?? [];
  const mentionedMembers = memberNames.filter((name) => containsWholeName(haystackTokens, name));
  if (mentionedMembers.length > 0) {
    add(
      "mentions-member",
      `אזכור של חברי קהילה: ${mentionedMembers.slice(0, 5).join(", ")}.`,
    );
  }
  if (/@[\p{L}\p{N}_]{2,}/u.test(haystack)) {
    add("mention-syntax", "יש תגית @ בטקסט.");
  }

  // ── לינקים ──
  const externalHosts = extractLinkHosts(draft.content || "").filter(
    (host) => !allowedHosts.includes(host),
  );
  if (externalHosts.length > 0) {
    add("external-link", `לינקים לדומיינים חיצוניים: ${[...new Set(externalHosts)].join(", ")}.`);
  }

  // ── תקינות טכנית ──
  const minLength = options.minTextLength ?? MIN_TEXT_LENGTH;
  const maxLength = options.maxTextLength ?? MAX_TEXT_LENGTH;

  if (title.length < 2) {
    add("title-too-short", "הכותרת קצרה מדי.");
  }
  if (text.length < minLength) {
    add("too-short", `התוכן קצר מדי (${text.length} תווים, מינימום ${minLength}).`);
  }
  if (text.length > maxLength) {
    add("too-long", `התוכן ארוך מדי (${text.length} תווים, מקסימום ${maxLength}).`);
  }
  if (/\{\{|\}\}|__[A-Z_]+__/.test(draft.content || "")) {
    add("unfilled-template", "נשארו מצייני מקום שלא הוחלפו בתוכן.");
  }
  if (/<\s*(script|iframe|object|embed)\b/i.test(draft.content || "")) {
    add("unsafe-html", "התוכן מכיל תגיות שלא מורשות באשכול.");
  }

  return {
    status: reasons.length === 0 ? "approved" : "needs_review",
    reasons,
  };
}

/** תיאור קצר בעברית לכל קוד שער, לתצוגה בפאנל הניהול. */
export const GATE_REASON_LABELS: Record<string, string> = {
  ungrounded: "ללא מקורות",
  "canon-without-ref": "קאנון בלי הפניה",
  "unsourced-figures": "מספרים לא מבוססים",
  "blocked-keyword": "נושא רגיש",
  "mentions-member": "אזכור חבר קהילה",
  "mention-syntax": "תגית @",
  "external-link": "לינק חיצוני",
  "title-too-short": "כותרת קצרה",
  "too-short": "תוכן קצר",
  "too-long": "תוכן ארוך",
  "unfilled-template": "תבנית לא מלאה",
  "unsafe-html": "HTML לא בטוח",
};
