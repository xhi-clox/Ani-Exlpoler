import { apiRequest } from "./client";
import type {
  UserProfile,
  AnalysisListResponse,
  TopAnimeEntry,
  CharacterEntry,
  Collection,
  CollectionItem,
  FavoriteWorkEntry,
  ProfileQuoteEntry,
  PinnedWork,
  PinnedQuote,
  TasteDimensionEntry,
  CurrentlyIntoEntry,
  InterestEntry,
} from "../types";

export interface ProfileUpdate {
  username?: string;
  display_name?: string;
  bio?: string;
  pronouns?: string;
  avatar_url?: string;
  banner_url?: string;
  location?: string;
  languages?: string;
  website_url?: string;
  instagram?: string;
  twitter?: string;
  mal_username?: string;
  currently_reading_title?: string;
  currently_reading_chapter?: string;
  currently_exploring?: string;
  favorite_theme?: string;
  profile_mood?: string;
  interests?: InterestEntry[];
  taste_dna?: TasteDimensionEntry[];
  pinned_work?: PinnedWork;
  pinned_quote?: PinnedQuote;
  currently_into?: CurrentlyIntoEntry[];
  traits?: string[];
}

export type ProfileUpdateResponse = Partial<UserProfile> & {
  avatar_url?: string;
  avatarUrl: string;
  username: string;
};

export function getProfile(username: string): Promise<UserProfile> {
  return apiRequest(`/users/${encodeURIComponent(username)}`);
}

export function updateProfile(username: string, data: ProfileUpdate): Promise<ProfileUpdateResponse> {
  return apiRequest(`/users/${encodeURIComponent(username)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function getUserAnalyses(username: string, page = 1): Promise<AnalysisListResponse> {
  return apiRequest(`/users/${encodeURIComponent(username)}/analyses?page=${page}`);
}

export function getFollowers(username: string): Promise<{ results: { username: string; avatar_url: string }[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/followers`);
}

export function getFollowing(username: string): Promise<{ results: { username: string; avatar_url: string }[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/following`);
}

export function followUser(username: string): Promise<void> {
  return apiRequest(`/users/${encodeURIComponent(username)}/follow`, { method: "POST" });
}

export function unfollowUser(username: string): Promise<void> {
  return apiRequest(`/users/${encodeURIComponent(username)}/follow`, { method: "DELETE" });
}

export function getTopAnime(username: string): Promise<{ results: TopAnimeEntry[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/top-anime`);
}

export function setTopAnime(
  username: string,
  items: { anime_id: number; title: string; image_url?: string }[],
): Promise<{ results: TopAnimeEntry[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/top-anime`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export function upvoteProfile(username: string): Promise<{ profileUpvoteCount: number }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/upvote-taste`, { method: "POST" });
}

export function removeProfileUpvote(username: string): Promise<{ profileUpvoteCount: number }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/upvote-taste`, { method: "DELETE" });
}

export function getCollections(username: string): Promise<{ results: Collection[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/collections`);
}

export function createCollection(username: string, title: string, description?: string): Promise<Collection> {
  return apiRequest(`/users/${encodeURIComponent(username)}/collections`, {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

export function updateCollection(
  id: string,
  data: { title?: string; description?: string },
): Promise<Collection> {
  return apiRequest(`/collections/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCollection(id: string): Promise<{ message: string }> {
  return apiRequest(`/collections/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function addCollectionItem(
  id: string,
  item: { anime_id: number; title: string; image_url?: string },
): Promise<CollectionItem> {
  return apiRequest(`/collections/${encodeURIComponent(id)}/items`, {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export function removeCollectionItem(id: string, itemId: string): Promise<{ message: string }> {
  return apiRequest(`/collections/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
}

export function likeCollection(id: string): Promise<{ likeCount: number; likedByMe: boolean }> {
  return apiRequest(`/collections/${encodeURIComponent(id)}/like`, { method: "POST" });
}

export function unlikeCollection(id: string): Promise<{ likeCount: number; likedByMe: boolean }> {
  return apiRequest(`/collections/${encodeURIComponent(id)}/like`, { method: "DELETE" });
}

export function getTopCharacters(username: string): Promise<{ results: CharacterEntry[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/top-characters`);
}

export function setTopCharacters(
  username: string,
  items: { character_id: number; name: string; image_url?: string; anime_name?: string; note?: string; label?: string }[],
): Promise<{ results: CharacterEntry[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/top-characters`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export function getFavoriteWorks(username: string): Promise<{ results: FavoriteWorkEntry[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/favorite-works`);
}

export function setFavoriteWorks(
  username: string,
  items: {
    title: string;
    type?: string;
    meta?: string;
    rating?: string;
    image_url?: string;
    anime_id?: number | null;
  }[],
): Promise<{ results: FavoriteWorkEntry[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/favorite-works`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export function getProfileQuotes(username: string): Promise<{ results: ProfileQuoteEntry[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/quotes`);
}

export function setProfileQuotes(
  username: string,
  items: {
    text: string;
    attribution?: string;
    source?: string;
    favorite?: boolean;
    original?: boolean;
  }[],
): Promise<{ results: ProfileQuoteEntry[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/quotes`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}
