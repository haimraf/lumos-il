import { createClient as createSupabaseServerClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildForumSeedTopic } from "@/lib/forumSeedTopics";
import type { SeedForum, SeedProfile, SeedTopic } from "@/lib/forumSeedTopics";

const DEFAULT_MIN_HOURS_BETWEEN_RUNS = 20;
const RECENT_THREAD_LIMIT = 120;
const EXCLUDED_FORUM_SLUGS = new Set(["feedback-and-suggestions"]);
const BLOCKED_PROFILE_STATUSES = new Set(["banned", "cooling", "suspended"]);

type ForumSeedResult =
  | {
      ok: true;
      status: "dry_run" | "published";
      forum: Pick<SeedForum, "id" | "slug" | "name">;
      topic: SeedTopic;
      threadId?: string;
      postId?: string;
    }
  | {
      ok: true;
      status: "skipped";
      reason: string;
    }
  | {
      ok: false;
      status: "error";
      error: string;
    };

type ThreadSummary = {
  id: string;
  title: string | null;
  created_at: string | null;
};

type SeedThreadRpcResult = {
  ok?: boolean;
  reason?: string;
  thread_id?: string;
  post_id?: string;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createServerClient() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createSupabaseServerClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string) {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length >= 3),
  );
}

function similarity(left: string, right: string) {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1;
  }

  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function isDuplicateTopic(topic: SeedTopic, threads: ThreadSummary[]) {
  const normalizedTitle = normalizeText(topic.title);

  return threads.some((thread) => {
    const title = normalizeText(thread.title || "");
    if (!title) return false;

    return title === normalizedTitle || similarity(title, normalizedTitle) >= 0.72;
  });
}

function rotateForums(forums: SeedForum[], now: Date) {
  if (forums.length <= 1) return forums;

  const dayIndex = Math.floor(now.getTime() / 86400000);
  const offset = dayIndex % forums.length;
  return [...forums.slice(offset), ...forums.slice(0, offset)];
}

function isEligibleForum(forum: SeedForum, profile: SeedProfile) {
  if (EXCLUDED_FORUM_SLUGS.has(forum.slug)) return false;
  if (forum.staff_only_create) return false;
  if (forum.house_restriction && forum.house_restriction !== profile.house) return false;

  const requiredYear = Number(forum.min_year || 0);
  const profileYear = Number(profile.year || 0);
  if (requiredYear > 0 && profileYear < requiredYear) return false;

  return true;
}

async function fetchProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, house, year, status")
    .eq("id", userId)
    .maybeSingle<SeedProfile>();

  if (error) throw error;
  return data;
}

async function fetchEligibleForums(supabase: SupabaseClient, profile: SeedProfile) {
  const { data, error } = await supabase
    .from("forums")
    .select("id, slug, name, description, house_restriction, min_year, staff_only_create")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data || []) as SeedForum[]).filter((forum) => isEligibleForum(forum, profile));
}

async function fetchRecentThreads(supabase: SupabaseClient, forumId: string) {
  const { data, error } = await supabase
    .from("threads")
    .select("id, title, created_at")
    .eq("forum_id", forumId)
    .order("created_at", { ascending: false })
    .limit(RECENT_THREAD_LIMIT);

  if (error) throw error;
  return (data || []) as ThreadSummary[];
}

async function chooseTopic(supabase: SupabaseClient, forums: SeedForum[], profile: SeedProfile, now: Date) {
  for (const forum of rotateForums(forums, now)) {
    const topic = buildForumSeedTopic(forum, profile, now);
    const recentThreads = await fetchRecentThreads(supabase, forum.id);
    if (!isDuplicateTopic(topic, recentThreads)) {
      return { forum, topic };
    }
  }

  return null;
}

async function insertThreadAndPost(
  supabase: SupabaseClient,
  forum: SeedForum,
  profile: SeedProfile,
  topic: SeedTopic,
  cronSecret: string,
) {
  const minHours = Math.max(1, Number(process.env.FORUM_SEED_MIN_HOURS || DEFAULT_MIN_HOURS_BETWEEN_RUNS));
  const { data, error } = await supabase.rpc("create_forum_seed_thread_secure", {
    p_cron_secret: cronSecret,
    p_author_id: profile.id,
    p_forum_id: forum.id,
    p_title: topic.title,
    p_content: topic.content,
    p_prefix: topic.prefix,
    p_min_hours: minHours,
  });

  if (error) throw error;

  const result = data as SeedThreadRpcResult | null;
  if (!result?.ok) {
    return {
      skippedReason: result?.reason || "Forum seed RPC skipped without a reason.",
    };
  }

  if (!result.thread_id || !result.post_id) {
    throw new Error("Forum seed RPC did not return created ids.");
  }

  return { threadId: result.thread_id, postId: result.post_id };
}

export async function runForumSeed({
  dryRun = false,
  now = new Date(),
  cronSecret,
}: {
  dryRun?: boolean;
  now?: Date;
  cronSecret: string;
}): Promise<ForumSeedResult> {
  try {
    const seedUserId = requireEnv("FORUM_SEED_USER_ID");
    const supabase = createServerClient();
    const profile = await fetchProfile(supabase, seedUserId);

    if (!profile) {
      return { ok: true, status: "skipped", reason: "Seed user profile was not found." };
    }

    if (profile.status && BLOCKED_PROFILE_STATUSES.has(profile.status)) {
      return { ok: true, status: "skipped", reason: `Seed user status does not allow posting: ${profile.status}.` };
    }

    const forums = await fetchEligibleForums(supabase, profile);
    if (!forums.length) {
      return { ok: true, status: "skipped", reason: "No eligible forums were found for the seed user." };
    }

    const selection = await chooseTopic(supabase, forums, profile, now);
    if (!selection) {
      return { ok: true, status: "skipped", reason: "No non-duplicate seed topic was available." };
    }

    const { forum, topic } = selection;
    const forumSummary = { id: forum.id, slug: forum.slug, name: forum.name };

    if (dryRun) {
      return { ok: true, status: "dry_run", forum: forumSummary, topic };
    }

    const publishResult = await insertThreadAndPost(supabase, forum, profile, topic, cronSecret);
    if ("skippedReason" in publishResult) {
      return {
        ok: true,
        status: "skipped",
        reason: publishResult.skippedReason || "Forum seed RPC skipped without a reason.",
      };
    }

    return {
      ok: true,
      status: "published",
      forum: forumSummary,
      topic,
      threadId: publishResult.threadId,
      postId: publishResult.postId,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown forum seed error.",
    };
  }
}
