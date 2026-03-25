export type HouseId = "Gryffindor" | "Slytherin" | "Ravenclaw" | "Hufflepuff";

export type HousePalette = {
  id: HouseId;
  label: string;
  shortLabel: string;
  icon: string;
  primary: string;
  secondary: string;
  accent: string;
  contrast: string;
  readable: string;
};

export const HOUSE_IDS: HouseId[] = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"];

export const HOUSE_PALETTES: Record<HouseId, HousePalette> = {
  Gryffindor: {
    id: "Gryffindor",
    label: "גריפינדור",
    shortLabel: "GRY",
    icon: "🦁",
    primary: "#740001",
    secondary: "#D3A625",
    accent: "#D3A625",
    contrast: "#F6E7B3",
    readable: "#D3A625",
  },
  Slytherin: {
    id: "Slytherin",
    label: "סלית'רין",
    shortLabel: "SLY",
    icon: "🐍",
    primary: "#1A472A",
    secondary: "#5D5D5D",
    accent: "#5D5D5D",
    contrast: "#D2D2D2",
    readable: "#D2D2D2",
  },
  Ravenclaw: {
    id: "Ravenclaw",
    label: "רייבנקלו",
    shortLabel: "RAV",
    icon: "🦅",
    primary: "#0E1A40",
    secondary: "#946B2D",
    accent: "#946B2D",
    contrast: "#D8B98E",
    readable: "#D8B98E",
  },
  Hufflepuff: {
    id: "Hufflepuff",
    label: "הפלפאף",
    shortLabel: "HUF",
    icon: "🦡",
    primary: "#EEB939",
    secondary: "#27251F",
    accent: "#27251F",
    contrast: "#FFF2B8",
    readable: "#EEB939",
  },
};

const HOUSE_ALIASES: Record<string, HouseId> = {
  gryffindor: "Gryffindor",
  "גריפינדור": "Gryffindor",
  slytherin: "Slytherin",
  "סלית׳רין": "Slytherin",
  "סלית'רין": "Slytherin",
  ravenclaw: "Ravenclaw",
  "רייבנקלו": "Ravenclaw",
  hufflepuff: "Hufflepuff",
  "הפלפאף": "Hufflepuff",
};

export type HouseVisualTheme = {
  palette: HousePalette;
  surface: string;
  surfaceStrong: string;
  border: string;
  mutedBorder: string;
  glow: string;
  softGlow: string;
  text: string;
  softText: string;
  badgeText: string;
  badgeBackground: string;
  badgeBorder: string;
  progressStart: string;
  progressEnd: string;
  shadow: string;
};

export function isHouseId(value: string | null | undefined): value is HouseId {
  return value === "Gryffindor" || value === "Slytherin" || value === "Ravenclaw" || value === "Hufflepuff";
}

export function resolveHouseId(value: string | null | undefined): HouseId | null {
  if (!value) return null;
  if (isHouseId(value)) return value;

  const normalized = value.trim();
  return HOUSE_ALIASES[normalized] || HOUSE_ALIASES[normalized.toLowerCase()] || null;
}

export function getHousePalette(house: string | null | undefined): HousePalette | null {
  const houseId = resolveHouseId(house);
  if (!houseId) return null;
  return HOUSE_PALETTES[houseId];
}

export function getHouseLabel(house: string | null | undefined) {
  return getHousePalette(house)?.label || null;
}

export function getHouseShortLabel(house: string | null | undefined) {
  return getHousePalette(house)?.shortLabel || null;
}

export function getHouseIcon(house: string | null | undefined) {
  return getHousePalette(house)?.icon || null;
}

export function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized;

  const parsed = Number.parseInt(expanded, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `${r}, ${g}, ${b}`;
}

export function withAlpha(hex: string, alpha: number) {
  const safeAlpha = Math.min(1, Math.max(0, alpha));
  return `rgba(${hexToRgb(hex)}, ${safeAlpha})`;
}

export function mixHex(baseHex: string, targetHex: string, weight = 0.5) {
  const safeWeight = Math.min(1, Math.max(0, weight));
  const base = hexToRgb(baseHex).split(",").map((value) => Number.parseInt(value.trim(), 10));
  const target = hexToRgb(targetHex).split(",").map((value) => Number.parseInt(value.trim(), 10));

  const mixChannel = (index: number) =>
    Math.round((base[index] * (1 - safeWeight)) + (target[index] * safeWeight))
      .toString(16)
      .padStart(2, "0");

  return `#${mixChannel(0)}${mixChannel(1)}${mixChannel(2)}`;
}

export function getHouseVisualTheme(house: string | null | undefined): HouseVisualTheme | null {
  const palette = getHousePalette(house);
  if (!palette) return null;

  const shadowColor = palette.id === "Hufflepuff" ? palette.secondary : palette.readable;
  return {
    palette,
    surface: `linear-gradient(135deg, ${withAlpha(palette.primary, 0.12)}, ${withAlpha(palette.secondary, 0.08)})`,
    surfaceStrong: `linear-gradient(135deg, ${withAlpha(palette.primary, 0.22)}, ${withAlpha(palette.secondary, 0.16)})`,
    border: withAlpha(palette.readable, 0.42),
    mutedBorder: withAlpha(palette.readable, 0.24),
    glow: withAlpha(shadowColor, 0.32),
    softGlow: withAlpha(shadowColor, 0.18),
    text: palette.readable,
    softText: palette.contrast,
    badgeText: palette.id === "Hufflepuff" ? palette.secondary : palette.contrast,
    badgeBackground: withAlpha(palette.primary, 0.16),
    badgeBorder: withAlpha(palette.readable, 0.32),
    progressStart: palette.primary,
    progressEnd: palette.secondary,
    shadow: `0 0 30px ${withAlpha(shadowColor, 0.2)}`,
  };
}

export function getHouseAccentColor(house: string | null | undefined) {
  return getHousePalette(house)?.accent || "rgba(255,255,255,0.7)";
}

export function getHousePrimaryColor(house: string | null | undefined) {
  return getHousePalette(house)?.primary || "rgba(255,255,255,0.7)";
}

export function getHouseSecondaryColor(house: string | null | undefined) {
  return getHousePalette(house)?.secondary || "rgba(255,255,255,0.7)";
}

export function getHouseReadableColor(house: string | null | undefined) {
  return getHousePalette(house)?.readable || "rgba(255,255,255,0.7)";
}
