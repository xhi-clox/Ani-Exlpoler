import { apiRequest } from "./client";
import type { StreamingSource, LinkReport } from "../types";

export async function getSources(animeId: number, episode?: number): Promise<{ results: StreamingSource[] }> {
  let path = `/anime/${animeId}/sources`;
  if (episode !== undefined) path += `?episode=${episode}`;
  return apiRequest(path);
}

export async function submitSource(data: {
  anime_id: number;
  episode_number?: number;
  site_name: string;
  site_url: string;
  language?: string;
  quality?: string;
}): Promise<StreamingSource> {
  return apiRequest(`/anime/${data.anime_id}/sources`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function reportSource(sourceId: string, data: {
  report_type: LinkReport["reportType"];
  notes?: string;
}): Promise<{ message: string }> {
  return apiRequest(`/sources/${sourceId}/report`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
