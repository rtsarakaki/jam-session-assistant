/** Query-string routes for `/app/covers` (song scope vs artist scope). */

export function coverGallerySongHref(songId: string): string {
  return `/app/covers?songId=${encodeURIComponent(songId)}`;
}

/** All cover cards for any catalog song with this exact `songs.artist` value. */
export function coverGalleryArtistHref(artist: string): string {
  return `/app/covers?artist=${encodeURIComponent(artist.trim())}`;
}

/** Artist gallery UI with a single-song filter (same cards as song-only, different nav context). */
export function coverGalleryArtistWithSongHref(artist: string, songId: string): string {
  return `/app/covers?artist=${encodeURIComponent(artist.trim())}&songId=${encodeURIComponent(songId)}`;
}
