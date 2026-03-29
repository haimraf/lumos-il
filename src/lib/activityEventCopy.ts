import { getHouseDisplayLabel } from "@/lib/houses";

export function getHouseSortedTitle(house: string | null | undefined, fallbackTitle?: string | null) {
  if (!house) {
    return fallbackTitle || "המצנפת קראה";
  }

  return `המצנפת קראה אל ${getHouseDisplayLabel(house, house)}`;
}
