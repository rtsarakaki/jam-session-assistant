import "server-only";

import { getAvatarImageUrl } from "@/lib/auth/user-display";
import { normalizeAppLocale, type AppLocale } from "@/lib/i18n/locales";
import { createSessionBoundDataClient } from "@/lib/platform/database";
import { validateProfileBio } from "@/lib/validation/profile-fields";
import { normalizeUsername, validateUsername } from "@/lib/validation/username";
import { validateName } from "@/lib/validation/user-fields";

export type UserProfile = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  instruments: string[];
  preferredLocale: AppLocale;
  updatedAt: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instruments: string[] | null;
  preferred_locale: string | null;
  updated_at: string;
};

type PgErrorLike = {
  code?: string;
  message?: string;
};

function isPreferredLocaleSchemaMissing(error: unknown): boolean {
  const e = error as PgErrorLike | undefined;
  if (e?.code === "42703") return true;
  const msg = (e?.message ?? "").toLowerCase();
  return msg.includes("preferred_locale") || msg.includes("schema cache");
}

function mapRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url?.trim() || null,
    bio: row.bio,
    instruments: Array.isArray(row.instruments) ? row.instruments : [],
    preferredLocale: normalizeAppLocale(row.preferred_locale),
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
    .select("id, username, display_name, avatar_url, bio, instruments, preferred_locale, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    if (!isPreferredLocaleSchemaMissing(error)) {
      throw new Error(error.message);
    }
    const { data: legacyData, error: legacyError } = await client
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, instruments, updated_at")
      .eq("id", user.id)
      .maybeSingle();
    if (legacyError) throw new Error(legacyError.message);
    if (!legacyData) return null;
    return mapRow({ ...(legacyData as ProfileRow), preferred_locale: null });
  }
  if (!data) return null;
  return mapRow(data as ProfileRow);
}

export type UpsertProfileInput = {
  displayName: string;
  username: string;
  bio: string;
  instruments: string[];
  preferredLocale: AppLocale;
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

  const sessionAvatar = getAvatarImageUrl(user);

  const payload = {
    id: user.id,
    display_name: displayTrim ? displayTrim : null,
    username: usernameOut,
    avatar_url: sessionAvatar,
    bio: bioTrim ? bioTrim : null,
    instruments: input.instruments,
    preferred_locale: input.preferredLocale,
  };

  const { error } = await client.from("profiles").upsert(
    {
      ...payload,
    },
    { onConflict: "id" },
  );

  if (error) {
    if (isPreferredLocaleSchemaMissing(error)) {
      const legacyPayload = {
        id: payload.id,
        display_name: payload.display_name,
        username: payload.username,
        avatar_url: payload.avatar_url,
        bio: payload.bio,
        instruments: payload.instruments,
      };
      const { error: legacyError } = await client.from("profiles").upsert(legacyPayload, { onConflict: "id" });
      if (!legacyError) return;
      if (legacyError.code === "23505") {
        throw new Error("This username is already taken.");
      }
      throw new Error(legacyError.message);
    }
    if (error.code === "23505") {
      throw new Error("This username is already taken.");
    }
    throw new Error(error.message);
  }
}
