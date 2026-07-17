import { apiRequest } from "./client";
import type { UserProfile, AnalysisListResponse, TopAnimeEntry, CharacterEntry, Collection } from "../types";

export function getProfile(username: string): Promise<UserProfile> {
  return apiRequest(`/users/${encodeURIComponent(username)}`);
}

export function updateProfile(username: string, data: { bio?: string; pronouns?: string; avatar_url?: string }): Promise<void> {
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

export function setTopAnime(username: string, items: { anime_id: number; title: string; image_url?: string }[]): Promise<{ results: TopAnimeEntry[] }> {
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

export function getTopCharacters(username: string): Promise<{ results: CharacterEntry[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/top-characters`);
}

export function setTopCharacters(username: string, items: { character_id: number; name: string; image_url?: string; anime_name?: string }[]): Promise<{ results: CharacterEntry[] }> {
  return apiRequest(`/users/${encodeURIComponent(username)}/top-characters`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}
