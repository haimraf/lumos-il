import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
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

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createAdminClient() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
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

async function hasRecentSeedRun(supabase: SupabaseClient, now: Date) {
  const minHours = Number(process.env.FORUM_SEED_MIN_HOURS || DEFAULT_MIN_HOURS_BETWEEN_RUNS);
  const cutoff = new Date(now.getTime() - Math.max(1, minHours) * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("id, created_at")
    .eq("action", "forum_seed_thread_publish")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return Boolean(data?.length);
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
) {
  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .insert({
      forum_id: forum.id,
      author_id: profile.id,
      title: topic.title,
      prefix: topic.prefix,
      is_pinned: false,
      is_locked: false,
    })
    .select("id")
    .single<{ id: string }>();

  if (threadError) throw threadError;

  const { data: post, error: postError } = await supabase
    .from("forum_posts")
    .insert({
      thread_id: thread.id,
      user_id: profile.id,
      content: topic.content,
    })
    .select("id")
    .single<{ id: string }>();

  if (postError) {
    await supabase.from("threads").delete().eq("id", thread.id);
    throw postError;
  }

  return { threadId: thread.id, postId: post.id };
}

async function logSeedRun(
  supabase: SupabaseClient,
  forum: SeedForum,
  profile: SeedProfile,
  topic: SeedTopic,
  threadId: string,
  postId: string,
) {
  await supabase.from("admin_audit_logs").insert({
    actor_id: profile.id,
    actor_name: profile.full_name || "Lumos IL",
    actor_role: profile.role || null,
    action: "forum_seed_thread_publish",
    target_type: "thread",
    target_id: threadId,
    target_label: topic.title,
    details: {
      forum_id: forum.id,
      forum_slug: forum.slug,
      forum_name: forum.name,
      post_id: postId,
      seed_version: "forum-seed-v1",
    },
  });
}

export async function runForumSeed({
  dryRun = false,
  now = new Date(),
}: {
  dryRun?: boolean;
  now?: Date;
} = {}): Promise<ForumSeedResult> {
  try {
    const seedUserId = requireEnv("FORUM_SEED_USER_ID");
    const supabase = createAdminClient();
    const profile = await fetchProfile(supabase, seedUserId);

    if (!profile) {
      return { ok: true, status: "skipped", reason: "Seed user profile was not found." };
    }

    if (profile.status && BLOCKED_PROFILE_STATUSES.has(profile.status)) {
      return { ok: true, status: "skipped", reason: `Seed user status does not allow posting: ${profile.status}.` };
    }

    if (!dryRun && (await hasRecentSeedRun(supabase, now))) {
      return { ok: true, status: "skipped", reason: "A forum seed thread was already published recently." };
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

    const { threadId, postId } = await insertThreadAndPost(supabase, forum, profile, topic);
    await logSeedRun(supabase, forum, profile, topic, threadId, postId);

    return {
      ok: true,
      status: "published",
      forum: forumSummary,
      topic,
      threadId,
      postId,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown forum seed error.",
    };
  }
}

