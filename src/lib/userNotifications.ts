"use client";

export type NotificationActorProfile = {
  id?: string;
  full_name?: string | null;
  username?: string | null;
  house?: string | null;
  role?: string | null;
  user_groups?: { color?: string | null } | { color?: string | null }[] | null;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  actor_id: string | null;
  content: string;
  type: string;
  target_url: string;
  is_read: boolean;
  created_at: string;
  actor_profile?: NotificationActorProfile | NotificationActorProfile[] | null;
};

type NotificationLoadResult = {
  notifications: NotificationItem[];
  unreadCount: number;
  error: string | null;
};

function buildNotificationFingerprint(notification: NotificationItem) {
  const targetUrl = notification.target_url?.trim() || "";
  const content = notification.content?.trim() || "";

  if (notification.type !== "achievement") return null;
  if (!targetUrl.startsWith("/events/")) return null;
  if (!content) return null;

  return `${notification.type}|${targetUrl}|${content}`;
}

function collapseDuplicateNotifications(notifications: NotificationItem[]) {
  const seen = new Set<string>();

  return notifications.filter((notification) => {
    const fingerprint = buildNotificationFingerprint(notification);
    if (!fingerprint) return true;
    if (seen.has(fingerprint)) return false;

    seen.add(fingerprint);
    return true;
  });
}

export async function fetchUserNotifications(
  supabase: any,
  userId: string,
): Promise<NotificationLoadResult> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      notifications: [],
      unreadCount: 0,
      error: error.message,
    };
  }

  const baseNotifications = collapseDuplicateNotifications((data || []) as NotificationItem[]);
  const actorIds = [
    ...new Set(
      baseNotifications.filter((notification) => typeof notification.actor_id === "string" && notification.actor_id.length > 0)
        .map((notification) => notification.actor_id as string),
    ),
  ];

  if (actorIds.length === 0) {
    return {
      notifications: baseNotifications,
      unreadCount: baseNotifications.filter((notification) => !notification.is_read).length,
      error: null,
    };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, house, role, user_groups(name, color)")
    .in("id", actorIds);

  if (profilesError) {
    return {
      notifications: baseNotifications,
      unreadCount: baseNotifications.filter((notification) => !notification.is_read).length,
      error: null,
    };
  }

  const profileMap = Object.fromEntries((profiles || []).map((profile: any) => [profile.id, profile]));
  const notifications = baseNotifications.map((notification) => (
    notification.actor_id
      ? { ...notification, actor_profile: profileMap[notification.actor_id] || null }
      : notification
  ));

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.is_read).length,
    error: null,
  };
}
