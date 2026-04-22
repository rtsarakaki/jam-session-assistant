/** Who to show in `/app/covers`: everyone you can see in the feed, or only people you follow. */
export type CoverGalleryScope = "all" | "friends";

function buildCoverGalleryQuery(input: {
  songId?: string | null;
  artist?: string | null;
  scope?: CoverGalleryScope;
}): string {
  const sp = new URLSearchParams();
  if (input.songId?.trim()) sp.set("songId", input.songId.trim());
  if (input.artist?.trim()) sp.set("artist", input.artist.trim());
  if (input.scope === "friends") sp.set("scope", "friends");
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Full path + query for the covers gallery. */
export function coverGalleryHref(input: {
  songId?: string | null;
  artist?: string | null;
  scope?: CoverGalleryScope;
}): string {
  return `/app/covers${buildCoverGalleryQuery(input)}`;
}

export function coverGallerySongHref(songId: string, scope: CoverGalleryScope = "all"): string {
  return coverGalleryHref({ songId, scope });
}

/** Posts linked to any catalog row with this exact `songs.artist`. */
export function coverGalleryArtistHref(artist: string, scope: CoverGalleryScope = "all"): string {
  return coverGalleryHref({ artist: artist.trim(), scope });
}

export function coverGalleryArtistWithSongHref(
  artist: string,
  songId: string,
  scope: CoverGalleryScope = "all",
): string {
  return coverGalleryHref({ artist: artist.trim(), songId, scope });
}
