import type { SupabaseClient } from "@supabase/supabase-js";
import { HOUSE_IDS, getHouseDisplayLabel, resolveHouseId, type HouseId } from "@/lib/houses";

export type CommunityTitle =
  | "מדליק/ת האור"
  | "שומר/ת הלהבה"
  | "קול האולם הגדול"
  | "צייד/ת המשימות"
  | "חוקר/ת הטירה"
  | "ניצוץ קהילתי";

export type WeeklyHonoree = {
  userId: string;
  username: string;
  house: string | null;
  houseLabel: string;
  weeklyPoints: number;
  streakDays: number;
  earnedTitle: CommunityTitle;
  activityCount: number;
  badges: CommunityTitle[];
};

export type WeeklyMapTrail = {
  key: "greatHall" | "quests" | "forums" | "library" | "news";
  label: string;
  value: number;
  href: string;
  tone: string;
};

export type CommunityRecognitionSnapshot = {
  honorees: WeeklyHonoree[];
  pulse: {
    completedQuests: number;
    housePoints: Record<HouseId, number>;
    greatHallMessages: number;
    forumActivity: number;
    newsActivity: number;
    libraryActivity: number;
    totalActivity: number;
  };
  mapTrails: WeeklyMapTrail[];
  generatedAt: string;
};

type ActivityRow = {
  actor_id: string | null;
  actor_name: string | null;
  actor_house: string | null;
  event_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type MessageRow = {
  user_id: string | null;
  created_at: string | null;
  profiles:
    | { full_name?: string | null; house?: string | null }
    | { full_name?: string | null; house?: string | null }[]
    | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  house: string | null;
};

type UserAccumulator = {
  userId: string;
  username: string;
  house: string | null;
  weeklyPoints: number;
  activityCount: number;
  greatHall: number;
  quests: number;
  castleResearch: number;
  activeDates: Set<string>;
};

const ACTIVITY_LIMIT = 1200;
const GREAT_HALL_LIMIT = 600;

const EVENT_WEIGHTS: Record<string, number> = {
  arena_duel_completed: 15,
  duel_tied: 8,
  chapter_published: 8,
  forum_post_created: 4,
  forum_reply_created: 4,
  forum_thread_created: 8,
  library_chapter_read: 4,
  news_comment_created: 4,
  news_poll_voted: 3,
  quest_niffler_found: 20,
  quest_reward_claimed: 5,
  quest_snitch_caught: 15,
  quest_trivia_completed: 10,
  story_published: 12,
};

const QUEST_EVENT_TYPES = new Set([
  "quest_niffler_found",
  "quest_reward_claimed",
  "quest_snitch_caught",
  "quest_trivia_completed",
]);

const CASTLE_RESEARCH_EVENT_TYPES = new Set([
  "chapter_published",
  "forum_post_created",
  "forum_reply_created",
  "forum_thread_created",
  "library_chapter_read",
  "news_comment_created",
  "news_poll_voted",
  "story_published",
]);

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date: Date) {
  const dayStart = startOfUtcDay(date);
  const day = dayStart.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  dayStart.setUTCDate(dayStart.getUTCDate() - diffToMonday);
  return dayStart;
}

function isoDate(dateString: string | null) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeProfileRelation(profile: MessageRow["profiles"]) {
  return Array.isArray(profile) ? profile[0] : profile;
}

function displayName(rawName: string | null | undefined) {
  const name = String(rawName || "").trim();
  if (!name || name === "Wizard") return "דמות מהטירה";
  return name;
}

function eventPoints(event: ActivityRow) {
  const metadataPoints = Number(event.metadata?.points_awarded || event.metadata?.points || 0);
  if (Number.isFinite(metadataPoints) && metadataPoints > 0) return metadataPoints;
  return EVENT_WEIGHTS[event.event_type || ""] || 2;
}

function getOrCreateUser(
  users: Map<string, UserAccumulator>,
  userId: string,
  input: { username?: string | null; house?: string | null },
) {
  const existing = users.get(userId);
  if (existing) {
    if (input.username) existing.username = displayName(input.username);
    if (input.house) existing.house = input.house;
    return existing;
  }

  const next: UserAccumulator = {
    userId,
    username: displayName(input.username),
    house: input.house || null,
    weeklyPoints: 0,
    activityCount: 0,
    greatHall: 0,
    quests: 0,
    castleResearch: 0,
    activeDates: new Set<string>(),
  };
  users.set(userId, next);
  return next;
}

function consecutiveStreak(activeDates: Set<string>, now: Date) {
  if (activeDates.size === 0) return 0;

  const latestDate = Array.from(activeDates)
    .sort()
    .at(-1);
  if (!latestDate) return 0;

  const today = startOfUtcDay(now);
  const latest = startOfUtcDay(new Date(`${latestDate}T00:00:00.000Z`));
  const cursor = latest.getTime() > today.getTime() ? today : latest;
  const current = new Date(cursor);
  let streak = 0;

  while (activeDates.has(current.toISOString().slice(0, 10))) {
    streak += 1;
    current.setUTCDate(current.getUTCDate() - 1);
  }

  return streak;
}

function winnerIds(users: UserAccumulator[], metric: keyof Pick<UserAccumulator, "greatHall" | "quests" | "castleResearch">) {
  const top = Math.max(0, ...users.map((user) => user[metric]));
  if (top <= 0) return new Set<string>();
  return new Set(users.filter((user) => user[metric] === top).map((user) => user.userId));
}

function titlesForUser(
  user: UserAccumulator,
  streakDays: number,
  winners: {
    greatHall: Set<string>;
    quests: Set<string>;
    castleResearch: Set<string>;
  },
): CommunityTitle[] {
  const titles: CommunityTitle[] = [];

  if (streakDays >= 7) titles.push("שומר/ת הלהבה");
  else if (streakDays >= 3) titles.push("מדליק/ת האור");

  if (winners.greatHall.has(user.userId)) titles.push("קול האולם הגדול");
  if (winners.quests.has(user.userId)) titles.push("צייד/ת המשימות");
  if (winners.castleResearch.has(user.userId)) titles.push("חוקר/ת הטירה");

  return titles.length > 0 ? titles : ["ניצוץ קהילתי"];
}

function primaryTitle(titles: CommunityTitle[]) {
  const priority: CommunityTitle[] = [
    "שומר/ת הלהבה",
    "קול האולם הגדול",
    "צייד/ת המשימות",
    "חוקר/ת הטירה",
    "מדליק/ת האור",
    "ניצוץ קהילתי",
  ];

  return priority.find((title) => titles.includes(title)) || "ניצוץ קהילתי";
}

function createEmptyHousePoints(): Record<HouseId, number> {
  return {
    Gryffindor: 0,
    Slytherin: 0,
    Ravenclaw: 0,
    Hufflepuff: 0,
  };
}

export function getCommunityShareCopy(title: string) {
  return `קיבלתי עכשיו את התואר ${title} בלומוס 🪄 אתר קהילת הארי פוטר בעברית עם בתים, משימות ונקודות.`;
}

export async function fetchCommunityRecognition(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<CommunityRecognitionSnapshot> {
  const weekStartIso = startOfUtcWeek(now).toISOString();

  const [activityResponse, messagesResponse] = await Promise.all([
    supabase
      .from("activity_events")
      .select("actor_id, actor_name, actor_house, event_type, metadata, created_at")
      .eq("visibility", "public")
      .neq("event_type", "admin_test_event")
      .gte("created_at", weekStartIso)
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LIMIT),
    supabase
      .from("messages")
      .select("user_id, created_at, profiles(full_name, house)")
      .gte("created_at", weekStartIso)
      .order("created_at", { ascending: false })
      .limit(GREAT_HALL_LIMIT),
  ]);

  const activityRows = ((activityResponse.data || []) as ActivityRow[]).filter((row) => row.created_at);
  const messageRows = ((messagesResponse.data || []) as MessageRow[]).filter((row) => row.created_at);
  const users = new Map<string, UserAccumulator>();
  const profileIds = new Set<string>();
  const housePoints = createEmptyHousePoints();

  activityRows.forEach((event) => {
    if (event.actor_id) profileIds.add(event.actor_id);
  });
  messageRows.forEach((message) => {
    if (message.user_id) profileIds.add(message.user_id);
  });

  const profileMap = new Map<string, ProfileRow>();
  if (profileIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, house")
      .in("id", Array.from(profileIds));

    ((profiles as ProfileRow[] | null) || []).forEach((profile) => {
      profileMap.set(profile.id, profile);
    });
  }

  const pulse = {
    completedQuests: 0,
    housePoints,
    greatHallMessages: messageRows.length,
    forumActivity: 0,
    newsActivity: 0,
    libraryActivity: 0,
    totalActivity: activityRows.length + messageRows.length,
  };

  activityRows.forEach((event) => {
    if (!event.actor_id) return;

    const profile = profileMap.get(event.actor_id);
    const user = getOrCreateUser(users, event.actor_id, {
      username: profile?.full_name || event.actor_name,
      house: profile?.house || event.actor_house,
    });
    const date = isoDate(event.created_at);
    if (date) user.activeDates.add(date);

    const points = eventPoints(event);
    user.weeklyPoints += points;
    user.activityCount += 1;

    if (event.event_type && QUEST_EVENT_TYPES.has(event.event_type)) {
      user.quests += 1;
      pulse.completedQuests += 1;
    }

    if (event.event_type && CASTLE_RESEARCH_EVENT_TYPES.has(event.event_type)) {
      user.castleResearch += 1;
    }

    if (event.event_type?.startsWith("forum_")) pulse.forumActivity += 1;
    if (event.event_type?.startsWith("news_")) pulse.newsActivity += 1;
    if (
      event.event_type === "library_chapter_read" ||
      event.event_type === "story_published" ||
      event.event_type === "chapter_published"
    ) {
      pulse.libraryActivity += 1;
    }

    const houseId = resolveHouseId(user.house);
    if (houseId) pulse.housePoints[houseId] += points;
  });

  messageRows.forEach((message) => {
    if (!message.user_id) return;

    const profile = profileMap.get(message.user_id);
    const joinedProfile = normalizeProfileRelation(message.profiles);
    const user = getOrCreateUser(users, message.user_id, {
      username: profile?.full_name || joinedProfile?.full_name,
      house: profile?.house || joinedProfile?.house,
    });
    const date = isoDate(message.created_at);
    if (date) user.activeDates.add(date);

    user.greatHall += 1;
    user.weeklyPoints += 2;
    user.activityCount += 1;

    const houseId = resolveHouseId(user.house);
    if (houseId) pulse.housePoints[houseId] += 2;
  });

  const allUsers = Array.from(users.values());
  const winners = {
    greatHall: winnerIds(allUsers, "greatHall"),
    quests: winnerIds(allUsers, "quests"),
    castleResearch: winnerIds(allUsers, "castleResearch"),
  };

  const honorees = allUsers
    .map((user) => {
      const streakDays = consecutiveStreak(user.activeDates, now);
      const badges = titlesForUser(user, streakDays, winners);
      return {
        userId: user.userId,
        username: user.username,
        house: user.house,
        houseLabel: getHouseDisplayLabel(user.house, "טרם מוין/ה"),
        weeklyPoints: Math.round(user.weeklyPoints),
        streakDays,
        earnedTitle: primaryTitle(badges),
        activityCount: user.activityCount,
        badges,
      };
    })
    .sort((left, right) => {
      if (right.weeklyPoints !== left.weeklyPoints) return right.weeklyPoints - left.weeklyPoints;
      return right.activityCount - left.activityCount;
    })
    .slice(0, 6);

  const mapTrails: WeeklyMapTrail[] = [
    { key: "greatHall", label: "האולם הגדול", value: pulse.greatHallMessages, href: "/great-hall", tone: "amber" },
    { key: "quests", label: "משימות", value: pulse.completedQuests, href: "/quests", tone: "emerald" },
    { key: "forums", label: "פורומים", value: pulse.forumActivity, href: "/forums", tone: "sky" },
    { key: "library", label: "ספרייה", value: pulse.libraryActivity, href: "/library", tone: "violet" },
    { key: "news", label: "הנביא היומי", value: pulse.newsActivity, href: "/news", tone: "rose" },
  ];

  return {
    honorees,
    pulse,
    mapTrails,
    generatedAt: now.toISOString(),
  };
}

export { HOUSE_IDS };
