import type { SupabaseClient } from "@supabase/supabase-js";

export const LIVE_EVENT_SETTINGS_KEY = "passover_event";
export const LIVE_EVENTS_CATALOG_KEY = "live_events_catalog";

type JsonObject = Record<string, unknown>;

export type LiveEventReward = JsonObject & {
  rank?: number;
  title?: string;
  description?: string;
  galleons?: number;
  points?: number;
  icon?: string | null;
  group_name?: string;
  group_color?: string;
  group_display_order?: number;
};

export type LiveEventMission = JsonObject & {
  title?: string;
  description?: string;
  href?: string;
  icon?: string;
  color?: string;
  points?: number;
  event_type?: string;
};

export type LiveEventSettings = JsonObject & {
  active: boolean;
  start_date: string;
  end_date: string;
  endDate: string;
  slug: string;
  title: string;
  eventName: string;
  tagline: string;
  description: string;
  support_forum_href: string;
  year: number;
  missions: LiveEventMission[];
  rewards: LiveEventReward[];
};

export type LiveEventCatalogEntry = LiveEventSettings & {
  id: string;
  created_at: string;
  updated_at: string;
  completed_at: string;
  archived: boolean;
  featured: boolean;
  rewards_distributed: boolean;
};

export type LiveEventPhase = "inactive" | "upcoming" | "live" | "ended";
export type LiveEventCatalogStatus = "draft" | "upcoming" | "live" | "ended" | "archived";

function asObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toEventSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getFallbackId(index = 0) {
  return `live-event-${index + 1}`;
}

function getUniqueSlug(baseSlug: string, seen: Set<string>, fallback: string) {
  const normalizedBase = toEventSlug(baseSlug) || fallback;
  let nextSlug = normalizedBase;
  let suffix = 2;

  while (seen.has(nextSlug)) {
    nextSlug = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }

  seen.add(nextSlug);
  return nextSlug;
}

function normalizeAndUniqifyCatalogSlugs(events: LiveEventCatalogEntry[]) {
  const seen = new Set<string>();
  return events.map((event, index) => ({
    ...event,
    slug: getUniqueSlug(event.slug, seen, `event-${index + 1}`),
  }));
}

export function getDefaultLiveEventSettings(): LiveEventSettings {
  return {
    active: false,
    start_date: "",
    end_date: "",
    endDate: "",
    slug: "passover",
    title: "איוונט בטירה",
    eventName: "",
    tagline: "",
    description: "",
    support_forum_href: "/forums/feedback-and-suggestions",
    year: new Date().getFullYear(),
    missions: [],
    rewards: [],
  };
}

export function getDefaultLiveEventCatalogEntry(index = 0): LiveEventCatalogEntry {
  return {
    ...getDefaultLiveEventSettings(),
    id: getFallbackId(index),
    slug: `event-${index + 1}`,
    created_at: "",
    updated_at: "",
    completed_at: "",
    archived: false,
    featured: false,
    rewards_distributed: false,
  };
}

export function normalizeLiveEventSettings(value: unknown): LiveEventSettings {
  const defaults = getDefaultLiveEventSettings();
  const raw = asObject(value);
  const startDate = asString(raw.start_date) || asString(raw.startDate);
  const endDate = asString(raw.endDate) || asString(raw.end_date);
  const eventName = asString(raw.eventName) || asString(raw.title);
  const title = asString(raw.title) || eventName || defaults.title;
  const slug = asString(raw.slug) || toEventSlug(eventName || title) || defaults.slug;
  const tagline = asString(raw.tagline);
  const description = asString(raw.description);
  const supportForumHref = asString(raw.support_forum_href) || defaults.support_forum_href;

  const missions = Array.isArray(raw.missions)
    ? raw.missions.map((entry) => asObject(entry) as LiveEventMission)
    : defaults.missions;

  const rewards = Array.isArray(raw.rewards)
    ? raw.rewards.map((entry) => asObject(entry) as LiveEventReward)
    : defaults.rewards;

  return {
    ...defaults,
    ...raw,
    active: raw.active === true,
    start_date: startDate,
    end_date: endDate,
    endDate,
    slug,
    title,
    eventName: eventName || title,
    tagline,
    description,
    support_forum_href: supportForumHref,
    year: asNumber(raw.year, defaults.year),
    missions,
    rewards,
  };
}

export function normalizeLiveEventCatalogEntry(
  value: unknown,
  index = 0,
): LiveEventCatalogEntry {
  const defaults = getDefaultLiveEventCatalogEntry(index);
  const raw = asObject(value);
  const settings = normalizeLiveEventSettings(value);
  const label = getLiveEventLabel(settings);
  const slug = asString(raw.slug) || settings.slug || toEventSlug(label) || defaults.slug;
  const id = asString(raw.id) || slug || defaults.id;

  return {
    ...defaults,
    ...settings,
    id,
    slug,
    created_at: asString(raw.created_at),
    updated_at: asString(raw.updated_at),
    completed_at: asString(raw.completed_at),
    archived: asBoolean(raw.archived, false),
    featured: asBoolean(raw.featured, false),
    rewards_distributed: asBoolean(raw.rewards_distributed, false),
  };
}

function hasLiveEventContent(settings: LiveEventSettings) {
  const defaults = getDefaultLiveEventSettings();
  return Boolean(
    settings.active
      || settings.start_date
      || settings.endDate
      || settings.end_date
      || settings.eventName
      || settings.tagline
      || settings.description
      || settings.missions.length
      || settings.rewards.length
      || settings.title !== defaults.title,
  );
}

export function normalizeLiveEventCatalog(
  value: unknown,
  legacyCurrent?: unknown,
): LiveEventCatalogEntry[] {
  if (Array.isArray(value)) {
    return normalizeAndUniqifyCatalogSlugs(
      value.map((entry, index) => normalizeLiveEventCatalogEntry(entry, index)),
    );
  }

  const normalizedLegacy = normalizeLiveEventSettings(legacyCurrent);
  if (!hasLiveEventContent(normalizedLegacy)) return [];

  return normalizeAndUniqifyCatalogSlugs([
    normalizeLiveEventCatalogEntry({
      ...normalizedLegacy,
      id: "legacy-passover-event",
      slug: "passover",
      featured: true,
    }),
  ]);
}

export function mergeLiveEventSettings(
  current: unknown,
  patch: Partial<LiveEventSettings> = {},
): LiveEventSettings {
  return normalizeLiveEventSettings({
    ...normalizeLiveEventSettings(current),
    ...patch,
  });
}

export function getLiveEventLabel(settings: LiveEventSettings | null | undefined) {
  const normalized = normalizeLiveEventSettings(settings);
  return normalized.eventName || normalized.title;
}

export function getLiveEventStart(settings: LiveEventSettings | null | undefined) {
  const normalized = normalizeLiveEventSettings(settings);
  return normalized.start_date;
}

export function getLiveEventEnd(settings: LiveEventSettings | null | undefined) {
  const normalized = normalizeLiveEventSettings(settings);
  return normalized.endDate || normalized.end_date;
}

export function getLiveEventPhase(
  settings: LiveEventSettings | null | undefined,
  now = Date.now(),
): LiveEventPhase {
  const normalized = normalizeLiveEventSettings(settings);
  if (!normalized.active) return "inactive";

  const startMs = Date.parse(getLiveEventStart(normalized));
  const endMs = Date.parse(getLiveEventEnd(normalized));

  if (Number.isFinite(endMs) && now > endMs) return "ended";
  if (Number.isFinite(startMs) && now < startMs) return "upcoming";

  return "live";
}

export function getLiveEventCatalogStatus(
  event: LiveEventCatalogEntry | null | undefined,
  now = Date.now(),
): LiveEventCatalogStatus {
  const normalized = normalizeLiveEventCatalogEntry(event, 0);
  if (normalized.archived) return "archived";

  const phase = getLiveEventPhase(normalized, now);
  if (phase === "live") return "live";
  if (phase === "upcoming") return "upcoming";
  if (phase === "ended" || normalized.completed_at || normalized.rewards_distributed) return "ended";

  return "draft";
}

export function sortLiveEventCatalog(
  events: LiveEventCatalogEntry[],
  now = Date.now(),
) {
  const statusPriority: Record<LiveEventCatalogStatus, number> = {
    live: 0,
    upcoming: 1,
    draft: 2,
    ended: 3,
    archived: 4,
  };

  return normalizeAndUniqifyCatalogSlugs([...events]).sort((left, right) => {
    const leftStatus = getLiveEventCatalogStatus(left, now);
    const rightStatus = getLiveEventCatalogStatus(right, now);

    if (statusPriority[leftStatus] !== statusPriority[rightStatus]) {
      return statusPriority[leftStatus] - statusPriority[rightStatus];
    }

    const leftTime = Date.parse(left.start_date || left.endDate || left.updated_at || left.created_at || "");
    const rightTime = Date.parse(right.start_date || right.endDate || right.updated_at || right.created_at || "");

    if (leftStatus === "ended" || leftStatus === "archived") {
      return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    }

    return (Number.isFinite(leftTime) ? leftTime : 0) - (Number.isFinite(rightTime) ? rightTime : 0);
  });
}

export function pickFeaturedLiveEvent(
  events: LiveEventCatalogEntry[],
  now = Date.now(),
) {
  const sorted = sortLiveEventCatalog(events, now);
  const liveEvents = sorted.filter((event) => getLiveEventCatalogStatus(event, now) === "live");
  const upcomingEvents = sorted.filter((event) => getLiveEventCatalogStatus(event, now) === "upcoming");

  return (
    liveEvents.find((event) => event.featured)
    || liveEvents[0]
    || upcomingEvents.find((event) => event.featured)
    || upcomingEvents[0]
    || sorted.find((event) => event.featured && getLiveEventCatalogStatus(event, now) !== "archived")
    || sorted.find((event) => getLiveEventCatalogStatus(event, now) !== "archived")
    || null
  );
}

export function buildLiveEventLegacyMirror(
  event: LiveEventCatalogEntry | LiveEventSettings | null | undefined,
) {
  if (!event) return getDefaultLiveEventSettings();
  return normalizeLiveEventSettings(event);
}

export function getLiveEventHref(
  event: LiveEventCatalogEntry | LiveEventSettings | null | undefined,
) {
  const normalized = normalizeLiveEventSettings(event);
  return `/events/${normalized.slug || "passover"}`;
}

export function isLiveEventOpen(
  settings: LiveEventSettings | null | undefined,
  now = Date.now(),
) {
  return getLiveEventPhase(settings, now) === "live";
}

export function isLiveEventVisible(
  settings: LiveEventSettings | null | undefined,
  now = Date.now(),
) {
  const phase = getLiveEventPhase(settings, now);
  return phase === "upcoming" || phase === "live";
}

export function getProfileLiveEventPoints(
  profile: Record<string, unknown> | null | undefined,
) {
  if (!profile) return 0;

  const eventPoints = asNumber(profile.event_points, 0);
  const legacyPoints = asNumber(profile.passover_points, 0);

  return Math.max(eventPoints, legacyPoints);
}

function getLeaderboardTimestamp(value: unknown) {
  if (typeof value !== "string" || !value) return Number.POSITIVE_INFINITY;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

export function compareLiveEventParticipants(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
) {
  const pointDelta = getProfileLiveEventPoints(right) - getProfileLiveEventPoints(left);
  if (pointDelta !== 0) return pointDelta;

  const createdAtDelta = getLeaderboardTimestamp(left.created_at) - getLeaderboardTimestamp(right.created_at);
  if (createdAtDelta !== 0) return createdAtDelta;

  return asString(left.full_name).localeCompare(asString(right.full_name), "he");
}

export async function fetchLiveEventCatalog(
  supabase: SupabaseClient,
): Promise<LiveEventCatalogEntry[]> {
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", [LIVE_EVENTS_CATALOG_KEY, LIVE_EVENT_SETTINGS_KEY]);

  const catalogSetting = data?.find((row) => row.key === LIVE_EVENTS_CATALOG_KEY);
  const legacySetting = data?.find((row) => row.key === LIVE_EVENT_SETTINGS_KEY);

  return normalizeLiveEventCatalog(catalogSetting?.value, legacySetting?.value);
}

export async function fetchFeaturedLiveEvent(
  supabase: SupabaseClient,
): Promise<LiveEventCatalogEntry | null> {
  const catalog = await fetchLiveEventCatalog(supabase);
  return pickFeaturedLiveEvent(catalog);
}

export async function fetchLiveEventBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<LiveEventCatalogEntry | null> {
  const normalizedSlug = toEventSlug(slug);
  if (!normalizedSlug) return null;

  const catalog = await fetchLiveEventCatalog(supabase);
  return catalog.find((event) => event.slug === normalizedSlug) || null;
}

export async function fetchLiveEventSettings(
  supabase: SupabaseClient,
): Promise<LiveEventSettings> {
  const catalog = await fetchLiveEventCatalog(supabase);
  const featured = pickFeaturedLiveEvent(catalog);

  if (featured) return buildLiveEventLegacyMirror(featured);

  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", LIVE_EVENT_SETTINGS_KEY)
    .maybeSingle();

  return normalizeLiveEventSettings(data?.value);
}
