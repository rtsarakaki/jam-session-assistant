/**
 * Camada de plataforma: ponto único para auth/sessão exposto à aplicação.
 * Implementação actual: `lib/supabase/*`. Para trocar de backend, mantém estas APIs e substitui os adaptadores.
 */

export type { AuthUser } from "@/lib/platform/types";
export { getCachedAuthUser, requireAuthUser } from "@/lib/platform/session";
export { signInWithPassword, signUpWithPassword, signOutGlobal } from "@/lib/platform/credentials";
export type { SignInWithPasswordInput, SignUpWithPasswordInput } from "@/lib/platform/credentials";
export { createOAuthRouteSession, redirectPreservingAuthCookies } from "@/lib/platform/oauth-routes";
export { getMiddlewareAuth, type MiddlewareAuthResult } from "@/lib/supabase/middleware-auth";
export { pingAuthService } from "@/lib/platform/health";
export {
  createSessionBoundDataClient,
  createUserDataClient,
  createAdminDataClient,
} from "@/lib/platform/database";
export type { UserProfile } from "@/lib/platform/profile-service";
export { getMyProfile, upsertMyProfile } from "@/lib/platform/profile-service";
export type { FriendsSnapshot, PublicProfileCard } from "@/lib/platform/friends-service";
export { getFriendsSnapshot } from "@/lib/platform/friends-service";
export type { SongCatalogItem } from "@/lib/platform/songs-service";
export type { CreateSongCatalogInput, UpdateSongCatalogInput } from "@/lib/platform/songs-service";
export { createSongCatalogItem, getSongCatalog, updateSongCatalogItem } from "@/lib/platform/songs-service";
export type { CatalogSongOption, RepertoireEntry, RepertoireLevel, RepertoireSnapshot } from "@/lib/platform/repertoire-service";
export { addSongToMyRepertoire, getMyRepertoireSnapshot, removeSongFromMyRepertoire } from "@/lib/platform/repertoire-service";
export type { JamSongSuggestion } from "@/lib/platform/jam-service";
export { getJamSongSuggestions } from "@/lib/platform/jam-service";
export type { JamParticipantOption, JamSuggestionSeed, JamSuggestionSnapshot } from "@/lib/platform/jam-service";
export { getJamSuggestionSnapshot } from "@/lib/platform/jam-service";
export type {
  FeedFollowSuggestionItem,
  FriendFeedCommentItem,
  FriendFeedPostItem,
  FriendFeedPostLikerItem,
} from "@/lib/platform/feed-service";
export {
  addFriendFeedComment,
  createFriendFeedPost,
  deleteFriendFeedComment,
  deleteFriendFeedPost,
  listFeedFollowSuggestions,
  listFriendFeedCommentsForPost,
  listFriendFeedPostLikers,
  listFriendFeedPostsPage,
  repostFriendFeedPostToMyFeed,
  toggleFriendFeedPostLike,
  updateFriendFeedPost,
} from "@/lib/platform/feed-service";
