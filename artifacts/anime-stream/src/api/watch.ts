import { apiRequest } from "./client";
import type { WatchEntry, WatchProgress } from "../types";

export async function getWatchHistory(): Promise<{ results: WatchEntry[] }> {
  return apiRequest("/watch");
}

export async function getContinueWatching(): Promise<{ results: WatchProgress[] }> {
  return apiRequest("/watch/continue");
}

export async function markWatched(animeId: number, episode: number, sourceId?: string): Promise<{ message: string }> {
  return apiRequest(`/watch/${animeId}/${episode}`, {
    method: "PUT",
    body: JSON.stringify({ source_id: sourceId }),
  });
}

export async function unwatch(animeId: number, episode: number): Promise<{ message: string }> {
  return apiRequest(`/watch/${animeId}/${episode}`, {
    method: "DELETE",
  });
}

export async function updateProgress(animeId: number, data: {
  current_episode?: number;
  total_episodes?: number;
  completed?: boolean;
}): Promise<WatchProgress> {
  return apiRequest(`/watch/${animeId}/progress`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
