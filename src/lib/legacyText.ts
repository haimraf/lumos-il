const LEGACY_TEXT_REPLACEMENTS = new Map<string, string>([
  ["ג¡", "⚡"],
  ["נ¦¦", "🦦"],
  ["נ“˜", "📝"],
  ["נ’°", "💰"],
  ["נ¦‰", "🦉"],
  ["ג¨", "✨"],
  ["נ×™", "🪙"],
  ["נ’", "💍"],
  ["נ×„", "🪄"],
  ["נ””", "🔔"],
  ["נ“¿", "📿"],
  ["ג“", "✓"],
]);

export function normalizeLegacyDisplayText(value: string | null | undefined) {
  if (typeof value !== "string" || value.length === 0) {
    return value ?? "";
  }

  let normalized = value;

  for (const [brokenValue, fixedValue] of LEGACY_TEXT_REPLACEMENTS) {
    normalized = normalized.replaceAll(brokenValue, fixedValue);
  }

  return normalized;
}
