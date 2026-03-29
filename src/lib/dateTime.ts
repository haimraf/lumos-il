type RelativeTimeOptions = {
  now?: number;
  invalidLabel?: string;
  yesterdayLabel?: string | null;
  maxRelativeDays?: number;
};

function formatHebrewCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function normalizeTimestampInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed.replace(" ", "T")}Z`;
}

export function parseAppTimestamp(value: string | null | undefined) {
  if (!value || typeof value !== "string") return null;

  const normalized = normalizeTimestampInput(value);
  if (!normalized) return null;

  const parsed = new Date(normalized).getTime();
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function formatHebrewRelativeTime(
  value: string | null | undefined,
  {
    now = Date.now(),
    invalidLabel = "לא ידוע",
    yesterdayLabel = "אתמול",
    maxRelativeDays,
  }: RelativeTimeOptions = {},
) {
  const timestamp = parseAppTimestamp(value);
  if (timestamp === null) return invalidLabel;

  const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diffSeconds < 60) return "ממש עכשיו";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `לפני ${formatHebrewCount(diffMinutes, "דקה", "דקות")}`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `לפני ${formatHebrewCount(diffHours, "שעה", "שעות")}`;

  const diffDays = Math.floor(diffHours / 24);
  if (yesterdayLabel && diffDays === 1) return yesterdayLabel;

  if (typeof maxRelativeDays === "number" && diffDays > maxRelativeDays) {
    return new Date(timestamp).toLocaleDateString("he-IL");
  }

  return `לפני ${formatHebrewCount(diffDays, "יום", "ימים")}`;
}
