import "server-only";

import { createSessionBoundDataClient } from "@/lib/platform/database";
import { validateName } from "@/lib/validation/user-fields";

export type UserProfile = {
  id: string;
  displayName: string | null;
  bio: string | null;
  primaryInstrument: string | null;
  updatedAt: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  bio: string | null;
  primary_instrument: string | null;
  updated_at: string;
};

function mapRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    bio: row.bio,
    primaryInstrument: row.primary_instrument,
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
    .select("id, display_name, bio, primary_instrument, updated_at")
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
  bio: string;
  primaryInstrument: string;
};

function normalizeUpsert(input: UpsertProfileInput) {
  const displayTrim = input.displayName.trim();
  if (displayTrim) {
    const nameErr = validateName(displayTrim);
    if (nameErr) throw new Error(nameErr);
  }

  const bioTrim = input.bio.trim();
  if (bioTrim.length > 500) {
    throw new Error("Bio must be at most 500 characters.");
  }

  const instTrim = input.primaryInstrument.trim();
  if (instTrim.length > 80) {
    throw new Error("Primary instrument must be at most 80 characters.");
  }

  return {
    display_name: displayTrim ? displayTrim : null,
    bio: bioTrim ? bioTrim : null,
    primary_instrument: instTrim ? instTrim : null,
  };
}

/** Cria ou atualiza a linha do utilizador autenticado. */
export async function upsertMyProfile(input: UpsertProfileInput): Promise<void> {
  const client = await createSessionBoundDataClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const row = normalizeUpsert(input);
  const { error } = await client.from("profiles").upsert(
    {
      id: user.id,
      ...row,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
