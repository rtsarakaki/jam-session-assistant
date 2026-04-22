import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSessionBoundDataClient } from "@/lib/platform/database";
import { createAppNotification } from "@/lib/platform/notifications-service";
import { formatProfileListName } from "@/lib/platform/friends-candidates";
import { APP_FEATURE_USER_AGENDA, readAppFeatureFlagEnabled } from "@/lib/platform/app-feature-flags";

export type AgendaEventKind = "show" | "attending" | "recommendation";

export type AgendaEventItem = {
  id: string;
  authorId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  kind: AgendaEventKind;
  title: string;
  details: string | null;
  addressText: string;
  eventAt: string;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type AgendaEventRow = {
  id: string;
  author_id: string;
  kind: AgendaEventKind;
  title: string;
  details: string | null;
  address_text: string;
  event_at: string;
  video_url: string | null;
  created_at: string;
  updated_at: string;
};

type PgErrorLike = {
  code?: string;
  message?: string;
};

function isAgendaSchemaMissing(error: unknown): boolean {
  const e = error as PgErrorLike | undefined;
  if (e?.code === "42P01" || e?.code === "42703") return true;
  const msg = (e?.message ?? "").toLowerCase();
  if (!msg) return false;
  return msg.includes("user_agenda_events") || msg.includes("could not find the table") || msg.includes("schema cache");
}

async function isAgendaSchemaReady(client: Awaited<ReturnType<typeof createSessionBoundDataClient>>): Promise<boolean> {
  const { error } = await client.from("user_agenda_events").select("id").limit(1);
  if (!error) return true;
  if (isAgendaSchemaMissing(error)) return false;
  throw new Error(error.message);
}

export async function isAgendaFeatureEnabled(): Promise<boolean> {
  const client = await createSessionBoundDataClient();
  const flagged = await readAppFeatureFlagEnabled(client, APP_FEATURE_USER_AGENDA);
  if (flagged) return true;
  // Safety fallback: if schema already exists, feature is considered available.
  return isAgendaSchemaReady(client);
}

/** Same readiness as {@link isAgendaFeatureEnabled} but reuses an existing session client (e.g. channel activity merge). */
export async function isAgendaReadableWithSessionClient(client: SupabaseClient): Promise<boolean> {
  const flagged = await readAppFeatureFlagEnabled(client, APP_FEATURE_USER_AGENDA);
  if (flagged) return true;
  return isAgendaSchemaReady(client as Awaited<ReturnType<typeof createSessionBoundDataClient>>);
}

/** Agenda rows authored by `authorId`, newest `created_at` first, for `/app/user/[id]` activity merge. */
export async function listAgendaEventsByAuthorForActivities(
  client: SupabaseClient,
  authorId: string,
  limit: number,
): Promise<AgendaEventItem[]> {
  if (!(await isAgendaReadableWithSessionClient(client))) return [];
  const cap = Math.min(4000, Math.max(1, limit));
  const { data, error } = await client
    .from("user_agenda_events")
    .select("id, author_id, kind, title, details, address_text, event_at, video_url, created_at, updated_at")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(cap);
  if (error) {
    if (isAgendaSchemaMissing(error)) return [];
    throw new Error(error.message);
  }
  const rows = (data ?? []) as AgendaEventRow[];
  const profileById = await loadProfilesMap([...new Set(rows.map((r) => r.author_id))]);
  return rows.map((row) => mapAgendaEventRow(row, profileById));
}

function safeTrim(value: string | null | undefined): string | null {
  const next = (value ?? "").trim();
  return next ? next : null;
}

function normalizeHttpUrl(value: string | null | undefined): string | null {
  const next = safeTrim(value);
  if (!next) return null;
  if (!/^https?:\/\//i.test(next)) {
    throw new Error("Video link must start with http:// or https://");
  }
  return next;
}

function mapAgendaEventRow(
  row: AgendaEventRow,
  profileById: Map<string, { username: string | null; display_name: string | null; avatar_url: string | null }>,
): AgendaEventItem {
  const p = profileById.get(row.author_id);
  return {
    id: row.id,
    authorId: row.author_id,
    authorUsername: p?.username ?? null,
    authorDisplayName: p?.display_name ?? null,
    authorAvatarUrl: p?.avatar_url?.trim() || null,
    kind: row.kind,
    title: row.title,
    details: row.details,
    addressText: row.address_text,
    eventAt: row.event_at,
    videoUrl: row.video_url?.trim() || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadProfilesMap(userIds: string[]) {
  const profileById = new Map<
    string,
    { username: string | null; display_name: string | null; avatar_url: string | null }
  >();
  if (userIds.length === 0) return profileById;
  const client = await createSessionBoundDataClient();
  const { data } = await client
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);
  for (const row of data ?? []) {
    profileById.set(row.id as string, {
      username: (row as { username: string | null }).username ?? null,
      display_name: (row as { display_name: string | null }).display_name ?? null,
      avatar_url: (row as { avatar_url: string | null }).avatar_url ?? null,
    });
  }
  return profileById;
}

export async function listMyAgendaEvents(): Promise<AgendaEventItem[]> {
  const client = await createSessionBoundDataClient();
  const enabled = await isAgendaFeatureEnabled();
  if (!enabled) return [];
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data, error } = await client
    .from("user_agenda_events")
    .select("id, author_id, kind, title, details, address_text, event_at, video_url, created_at, updated_at")
    .eq("author_id", user.id)
    .order("event_at", { ascending: true });
  if (error) {
    if (isAgendaSchemaMissing(error)) return [];
    throw new Error(error.message);
  }
  const rows = (data ?? []) as AgendaEventRow[];
  const profileById = await loadProfilesMap([user.id]);
  return rows.map((row) => mapAgendaEventRow(row, profileById));
}

export async function listUpcomingAgendaEventsForFeed(): Promise<AgendaEventItem[]> {
  const client = await createSessionBoundDataClient();
  const enabled = await isAgendaFeatureEnabled();
  if (!enabled) return [];
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const now = new Date();
  const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { data: follows } = await client
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const authorIds = new Set<string>([user.id]);
  for (const row of follows ?? []) {
    const id = (row as { following_id: string }).following_id;
    if (id) authorIds.add(id);
  }
  const ids = [...authorIds];
  if (ids.length === 0) return [];
  const { data, error } = await client
    .from("user_agenda_events")
    .select("id, author_id, kind, title, details, address_text, event_at, video_url, created_at, updated_at")
    .in("author_id", ids)
    .gte("event_at", now.toISOString())
    .lte("event_at", until.toISOString())
    .order("event_at", { ascending: true })
    .limit(60);
  if (error) {
    if (isAgendaSchemaMissing(error)) return [];
    throw new Error(error.message);
  }
  const rows = (data ?? []) as AgendaEventRow[];
  const profileById = await loadProfilesMap([...new Set(rows.map((row) => row.author_id))]);
  return rows.map((row) => mapAgendaEventRow(row, profileById));
}

export async function listUpcomingAgendaEventsAll(limit = 120): Promise<AgendaEventItem[]> {
  const client = await createSessionBoundDataClient();
  const enabled = await isAgendaFeatureEnabled();
  if (!enabled) return [];
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const now = new Date();
  const { data, error } = await client
    .from("user_agenda_events")
    .select("id, author_id, kind, title, details, address_text, event_at, video_url, created_at, updated_at")
    .gte("event_at", now.toISOString())
    .order("event_at", { ascending: true })
    .limit(Math.max(1, Math.min(300, limit)));
  if (error) {
    if (isAgendaSchemaMissing(error)) return [];
    throw new Error(error.message);
  }
  const rows = (data ?? []) as AgendaEventRow[];
  const profileById = await loadProfilesMap([...new Set(rows.map((row) => row.author_id))]);
  return rows.map((row) => mapAgendaEventRow(row, profileById));
}

export async function createAgendaEvent(input: {
  kind: AgendaEventKind;
  title: string;
  details?: string | null;
  addressText: string;
  eventAtIso: string;
  videoUrl?: string | null;
}): Promise<void> {
  const client = await createSessionBoundDataClient();
  const enabled = await isAgendaFeatureEnabled();
  if (!enabled) throw new Error("Agenda feature is not available yet.");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const title = (input.title ?? "").trim();
  const addressText = (input.addressText ?? "").trim();
  const details = safeTrim(input.details);
  const videoUrl = normalizeHttpUrl(input.videoUrl);
  if (!title) throw new Error("Title is required.");
  if (!addressText) throw new Error("Address is required.");
  const eventDate = new Date(input.eventAtIso);
  if (Number.isNaN(eventDate.getTime())) throw new Error("Invalid event date.");

  const { data: createdRow, error } = await client
    .from("user_agenda_events")
    .insert({
      author_id: user.id,
      kind: input.kind,
      title,
      details,
      address_text: addressText,
      event_at: eventDate.toISOString(),
      video_url: videoUrl,
    })
    .select("id")
    .single();
  if (error) {
    if (isAgendaSchemaMissing(error)) throw new Error("Agenda feature is not available yet.");
    throw new Error(error.message);
  }
  const eventId = (createdRow as { id: string } | null)?.id ?? null;

  const daysUntil = (eventDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  if (daysUntil > 7 || daysUntil < 0) return;

  const { data: profile } = await client
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const actorLabel = formatProfileListName(
    (profile as { username?: string | null } | null)?.username ?? null,
    (profile as { display_name?: string | null } | null)?.display_name ?? null,
    user.id,
  );
  const { data: followers } = await client.from("profile_follows").select("follower_id").eq("following_id", user.id);
  for (const row of followers ?? []) {
    const recipientId = (row as { follower_id: string }).follower_id;
    await createAppNotification({
      recipientId,
      actorId: user.id,
      type: "agenda_upcoming",
      title: "Upcoming event this week",
      body: `${actorLabel}: ${title}`,
      resourcePath: eventId ? `/app/events#event-${eventId}` : "/app/events",
      metadata: {
        eventId,
        title,
        eventAt: eventDate.toISOString(),
        addressText,
        kind: input.kind,
      },
    }).catch(() => undefined);
  }
}

export async function deleteAgendaEvent(eventId: string): Promise<void> {
  const client = await createSessionBoundDataClient();
  const enabled = await isAgendaFeatureEnabled();
  if (!enabled) throw new Error("Agenda feature is not available yet.");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await client.from("user_agenda_events").delete().eq("id", eventId).eq("author_id", user.id);
  if (error) {
    if (isAgendaSchemaMissing(error)) throw new Error("Agenda feature is not available yet.");
    throw new Error(error.message);
  }
}

export async function updateAgendaEvent(input: {
  eventId: string;
  kind: AgendaEventKind;
  title: string;
  details?: string | null;
  addressText: string;
  eventAtIso: string;
  videoUrl?: string | null;
}): Promise<void> {
  const client = await createSessionBoundDataClient();
  const enabled = await isAgendaFeatureEnabled();
  if (!enabled) throw new Error("Agenda feature is not available yet.");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const title = (input.title ?? "").trim();
  const addressText = (input.addressText ?? "").trim();
  const details = safeTrim(input.details);
  const videoUrl = normalizeHttpUrl(input.videoUrl);
  if (!title) throw new Error("Title is required.");
  if (!addressText) throw new Error("Address is required.");
  const eventDate = new Date(input.eventAtIso);
  if (Number.isNaN(eventDate.getTime())) throw new Error("Invalid event date.");

  const { error } = await client
    .from("user_agenda_events")
    .update({
      kind: input.kind,
      title,
      details,
      address_text: addressText,
      event_at: eventDate.toISOString(),
      video_url: videoUrl,
    })
    .eq("id", input.eventId)
    .eq("author_id", user.id);
  if (error) {
    if (isAgendaSchemaMissing(error)) throw new Error("Agenda feature is not available yet.");
    throw new Error(error.message);
  }
}
