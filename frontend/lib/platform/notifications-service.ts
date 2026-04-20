import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";
import { formatProfileListName } from "@/lib/platform/friends-candidates";

export type AppNotificationType = "follow" | "like" | "comment" | "share" | "jam_created";

export type AppNotificationItem = {
  id: string;
  recipientId: string;
  actorId: string;
  actorLabel: string;
  actorAvatarUrl: string | null;
  type: AppNotificationType;
  title: string;
  body: string;
  resourcePath: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  resource_path: string | null;
  read_at: string | null;
  created_at: string;
};

type ProfileLite = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type PgErrorLike = {
  code?: string;
  message?: string;
};

function isNotificationSchemaMissing(error: unknown): boolean {
  const e = error as PgErrorLike | undefined;
  // 42P01: undefined_table, 42703: undefined_column
  if (e?.code === "42P01" || e?.code === "42703") return true;
  const msg = (e?.message ?? "").toLowerCase();
  if (!msg) return false;
  return (
    msg.includes("could not find the table") ||
    msg.includes("schema cache") ||
    msg.includes("app_notifications")
  );
}

function isNotificationTypeUnsupported(error: unknown): boolean {
  const e = error as PgErrorLike | undefined;
  // 23514: check_violation (e.g. old enum/check missing a newer notification type)
  return e?.code === "23514";
}

export async function cleanupReadNotificationsOlderThanMonth(): Promise<void> {
  const client = await createSessionBoundDataClient();
  const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await client
    .from("app_notifications")
    .delete()
    .lt("read_at", threshold);
  if (error) {
    if (isNotificationSchemaMissing(error)) return;
    throw new Error(error.message);
  }
}

export async function listMyNotifications(limit = 30): Promise<{ items: AppNotificationItem[]; unreadCount: number }> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  try {
    await cleanupReadNotificationsOlderThanMonth();
  } catch {
    // Keep app usable if cleanup fails for transient reasons.
  }

  const safeLimit = Math.max(1, Math.min(100, limit));
  const { data, error } = await client
    .from("app_notifications")
    .select("id, recipient_id, actor_id, type, title, body, resource_path, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) {
    if (isNotificationSchemaMissing(error)) {
      return { items: [], unreadCount: 0 };
    }
    throw new Error(error.message);
  }
  const rows = (data ?? []) as NotificationRow[];

  const actorIds = [...new Set(rows.map((r) => r.actor_id))];
  let actorProfiles = new Map<string, ProfileLite>();
  if (actorIds.length > 0) {
    const { data: profRows, error: profErr } = await client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", actorIds);
    if (profErr) {
      if (!isNotificationSchemaMissing(profErr)) {
        throw new Error(profErr.message);
      }
    }
    actorProfiles = new Map((profRows ?? []).map((r) => [(r as ProfileLite).id, r as ProfileLite]));
  }

  const { count, error: countErr } = await client
    .from("app_notifications")
    .select("*", { count: "exact", head: true })
    .is("read_at", null);
  if (countErr) {
    if (isNotificationSchemaMissing(countErr)) {
      return { items, unreadCount: 0 };
    }
    throw new Error(countErr.message);
  }

  const items = rows.map((row) => {
    const actor = actorProfiles.get(row.actor_id);
    return {
      id: row.id,
      recipientId: row.recipient_id,
      actorId: row.actor_id,
      actorLabel: formatProfileListName(actor?.username ?? null, actor?.display_name ?? null, row.actor_id),
      actorAvatarUrl: actor?.avatar_url?.trim() || null,
      type: row.type,
      title: row.title,
      body: row.body,
      resourcePath: row.resource_path,
      readAt: row.read_at,
      createdAt: row.created_at,
    } satisfies AppNotificationItem;
  });

  return { items, unreadCount: count ?? 0 };
}

export async function createAppNotification(input: {
  recipientId: string;
  actorId: string;
  type: AppNotificationType;
  title: string;
  body: string;
  resourcePath?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (input.recipientId === input.actorId) return;
  const client = await createSessionBoundDataClient();
  const { error } = await client.from("app_notifications").insert({
    recipient_id: input.recipientId,
    actor_id: input.actorId,
    type: input.type,
    title: input.title,
    body: input.body,
    resource_path: input.resourcePath ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    if (isNotificationSchemaMissing(error) || isNotificationTypeUnsupported(error)) return;
    throw new Error(error.message);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const client = await createSessionBoundDataClient();
  const { error } = await client
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);
  if (error) {
    if (isNotificationSchemaMissing(error)) return;
    throw new Error(error.message);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const client = await createSessionBoundDataClient();
  const { error } = await client
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) {
    if (isNotificationSchemaMissing(error)) return;
    throw new Error(error.message);
  }
}
