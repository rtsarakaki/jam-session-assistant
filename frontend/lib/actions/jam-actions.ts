"use server";

import { createSessionBoundDataClient } from "@/lib/platform/database";

export type JamParticipantSearchScope = "friends" | "all";

export type JamParticipantSearchResult = {
  id: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  isFriend: boolean;
  label: string;
};

type SearchRpcRow = {
  profile_id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  is_friend: boolean;
};

function toLabel(row: SearchRpcRow): string {
  const display = row.display_name?.trim();
  const username = row.username?.trim();
  const email = row.email?.trim();
  if (display && username) return `${display} (@${username})`;
  if (display) return display;
  if (username) return `@${username}`;
  return email ?? row.profile_id.slice(0, 8);
}

export async function searchJamParticipantsAction(input: {
  query: string;
  scope: JamParticipantSearchScope;
  limit?: number;
}): Promise<{ error: string | null; results: JamParticipantSearchResult[] }> {
  const client = await createSessionBoundDataClient();

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Not signed in.", results: [] };

  const { data, error } = await client.rpc("search_jam_participants", {
    p_query: input.query,
    p_scope: input.scope,
    p_limit: input.limit ?? 50,
  });

  if (error) return { error: error.message, results: [] };

  const rows = (data ?? []) as SearchRpcRow[];
  return {
    error: null,
    results: rows.map((row) => ({
      id: row.profile_id,
      username: row.username,
      displayName: row.display_name,
      email: row.email,
      isFriend: !!row.is_friend,
      label: toLabel(row),
    })),
  };
}
