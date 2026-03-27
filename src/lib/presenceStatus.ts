import type { SupabaseClient } from "@supabase/supabase-js";

export type PresenceStatus = "online" | "afk";

export type OnlinePresenceRow = {
  id: string;
  user_name: string | null;
  house: string | null;
  current_path: string | null;
  location_label: string | null;
  last_seen: string | null;
  presence_type: string | null;
  presence_status: PresenceStatus;
  last_active_at: string | null;
};

type FetchOnlinePresenceOptions = {
  cutoffIso?: string;
  limit?: number;
  memberOnly?: boolean;
  orderAscending?: boolean;
};

type PresenceQueryRow = Partial<OnlinePresenceRow> & Record<string, unknown>;

const BASE_SELECT = "id, user_name, house, current_path, location_label, last_seen, presence_type";
const EXTENDED_SELECT = `${BASE_SELECT}, presence_status, last_active_at`;

export const AFK_IDLE_MS = 3 * 60 * 1000;

const LOCATION_LABEL_ALIASES: Record<string, string> = {
  "ברחבת הכניסה": "רחבת הכניסה",
  "במפת הקונדסאים": "מפת הקונדסאים",
  "בנביא היומי": "הנביא היומי",
  "בחדר המועדון": "חדר המועדון",
  "בסמטת דיאגון": "סמטת דיאגון",
  "במסדרונות": "המסדרונות",
};

export function isMissingPresenceColumnsError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || "");
  return message.includes("presence_status") || message.includes("last_active_at");
}

function normalizePresenceStatus(value: unknown): PresenceStatus {
  return typeof value === "string" && value.trim().toLowerCase() === "afk" ? "afk" : "online";
}

function normalizePresenceRow(row: PresenceQueryRow): OnlinePresenceRow {
  return {
    id: String(row?.id || ""),
    user_name: row?.user_name ?? null,
    house: row?.house ?? null,
    current_path: row?.current_path ?? null,
    location_label: row?.location_label ?? null,
    last_seen: row?.last_seen ?? null,
    presence_type: row?.presence_type ?? null,
    presence_status: normalizePresenceStatus(row?.presence_status),
    last_active_at: row?.last_active_at ?? row?.last_seen ?? null,
  };
}

function normalizeTimestampValue(value: string | null | undefined) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed.replace(" ", "T")}Z`;
}

function getTimestamp(value: string | null | undefined) {
  const normalized = normalizeTimestampValue(value);
  const parsed = normalized ? new Date(normalized).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getPresenceFreshnessTimestamp(row: Pick<OnlinePresenceRow, "last_seen" | "last_active_at">) {
  return Math.max(getTimestamp(row.last_seen), getTimestamp(row.last_active_at));
}

export async function fetchOnlinePresenceRows(
  supabase: SupabaseClient,
  options: FetchOnlinePresenceOptions = {},
) {
  const run = async (selectClause: string) => {
    let query = supabase.from("online_users").select(selectClause);

    if (options.cutoffIso) {
      query = selectClause === EXTENDED_SELECT
        ? query.or(`last_seen.gte.${options.cutoffIso},last_active_at.gte.${options.cutoffIso}`)
        : query.gte("last_seen", options.cutoffIso);
    }

    if (options.memberOnly) {
      query = query.eq("presence_type", "member");
    }

    query = query.order("last_seen", { ascending: options.orderAscending ?? false });

    if (typeof options.limit === "number") {
      query = query.limit(options.limit);
    }

    return query;
  };

  let response = await run(EXTENDED_SELECT);
  let hasPresenceColumns = true;

  if (response.error && isMissingPresenceColumnsError(response.error)) {
    hasPresenceColumns = false;
    response = await run(BASE_SELECT);
  }

  return {
    rows: ((response.data as PresenceQueryRow[] | null) || []).map(normalizePresenceRow),
    hasPresenceColumns,
    error: response.error || null,
  };
}

export function getPresenceLabel(status: PresenceStatus) {
  return status === "afk" ? "AFK" : "פעיל";
}

export function getPresenceMeta(status: PresenceStatus) {
  if (status === "afk") {
    return {
      label: "AFK",
      textColor: "#fbbf24",
      borderColor: "rgba(251,191,36,0.28)",
      background: "rgba(251,191,36,0.12)",
      dotClassName: "bg-amber-400",
    };
  }

  return {
    label: "פעיל",
    textColor: "#34d399",
    borderColor: "rgba(52,211,153,0.24)",
    background: "rgba(52,211,153,0.10)",
    dotClassName: "bg-emerald-400",
  };
}

function normalizePresencePath(currentPath: string | null | undefined) {
  if (!currentPath || typeof currentPath !== "string") return "/map";
  const trimmed = currentPath.trim();
  if (!trimmed) return "/map";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function getFriendlyLabelFromPath(path: string) {
  if (path === "/" || path.startsWith("/home") || path.startsWith("/great-hall")) return "רחבת הכניסה";
  if (path.startsWith("/dashboard") || path.startsWith("/profile")) return "חדר המועדון";
  if (path.startsWith("/map")) return "מפת הקונדסאים";
  if (path.startsWith("/quests")) return "לוח הקווסטים";
  if (path.startsWith("/forums/thread/")) return "אשכול בפורום";
  if (path.startsWith("/forums")) return "המסדרונות";
  if (path.startsWith("/events/")) return "עמוד אירוע";
  if (path.startsWith("/library")) return "הספרייה";
  if (path.startsWith("/arena")) return "זירת הדו-קרב";
  if (path.startsWith("/news")) return "הנביא היומי";
  if (path.startsWith("/shop") || path.startsWith("/ollivanders")) return "סמטת דיאגון";
  if (path.startsWith("/wizard/")) return "פרופיל קוסם";
  if (path.startsWith("/chat")) return "אולם השיחות";
  return null;
}

function prettifyUnknownPath(path: string) {
  const segments = path.split("?")[0].split("#")[0].split("/").filter(Boolean);
  if (segments.length === 0) return "מפת הקונדסאים";

  const lastSegment = segments[segments.length - 1]
    .replace(/[-_]+/g, " ")
    .trim();

  return lastSegment || "עמוד פעיל";
}

export function getPresenceLocationInfo(
  row: Pick<OnlinePresenceRow, "current_path" | "location_label">,
) {
  const href = normalizePresencePath(row.current_path);
  const aliasedLabel = row.location_label
    ? (LOCATION_LABEL_ALIASES[row.location_label.trim()] || row.location_label.trim())
    : null;

  return {
    href,
    label: getFriendlyLabelFromPath(href) || aliasedLabel || prettifyUnknownPath(href),
    rawPath: href,
  };
}

export function comparePresenceRows(left: OnlinePresenceRow, right: OnlinePresenceRow) {
  if (left.presence_status !== right.presence_status) {
    return left.presence_status === "online" ? -1 : 1;
  }

  return getPresenceFreshnessTimestamp(right) - getPresenceFreshnessTimestamp(left);
}
