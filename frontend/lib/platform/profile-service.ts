import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";
import { validateProfileBio } from "@/lib/validation/profile-fields";
import { normalizeUsername, validateUsername } from "@/lib/validation/username";
import { validateName } from "@/lib/validation/user-fields";

export type UserProfile = {
  id: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  instruments: string[];
  updatedAt: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  instruments: string[] | null;
  updated_at: string;
};

function mapRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    instruments: Array.isArray(row.instruments) ? row.instruments : [],
    updatedAt: row.updated_at,
  };
}

/** Perfil do utilizador autenticado (RLS). */
export async function getMyProfile(): Promise<UserProfile | null> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client
    .from("profiles")
    .select("id, username, display_name, bio, instruments, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return mapRow(data as ProfileRow);
}

export type UpsertProfileInput = {
  displayName: string;
  username: string;
  bio: string;
  instruments: string[];
};

export async function upsertMyProfile(input: UpsertProfileInput): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const displayTrim = input.displayName.trim();
  if (displayTrim) {
    const nameErr = validateName(displayTrim);
    if (nameErr) throw new Error(nameErr);
  }

  const bioTrim = input.bio.trim();
  const bioErr = validateProfileBio(bioTrim);
  if (bioErr) throw new Error(bioErr);

  const usernameRaw = input.username.trim();
  let usernameOut: string | null = null;
  if (usernameRaw) {
    const uErr = validateUsername(usernameRaw);
    if (uErr) throw new Error(uErr);
    usernameOut = normalizeUsername(usernameRaw);
    const { data: taken, error: qErr } = await client
      .from("profiles")
      .select("id")
      .eq("username", usernameOut)
      .maybeSingle();
    if (qErr) throw new Error(qErr.message);
    if (taken && taken.id !== user.id) {
      throw new Error("This username is already taken.");
    }
  }

  const { error } = await client.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayTrim ? displayTrim : null,
      username: usernameOut,
      bio: bioTrim ? bioTrim : null,
      instruments: input.instruments,
    },
    { onConflict: "id" },
  );

  if (error) {
    if (error.code === "23505") {
      throw new Error("This username is already taken.");
    }
    throw new Error(error.message);
  }
}
