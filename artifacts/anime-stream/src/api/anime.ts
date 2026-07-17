import { apiRequest } from "./client";

export interface AnimeResult {
  id: string;
  title: string;
  image: string | null;
  releaseDate: string | null;
  type: string | null;
  totalEpisodes: number | null;
}

export interface AnimeListResponse {
  currentPage: number;
  hasNextPage: boolean;
  results: AnimeResult[];
}

export interface AnimeInfo {
  id: string;
  title: string;
  image: string | null;
  description: string | null;
  releaseDate: string | null;
  status: string | null;
  genres: string[];
  type: string | null;
  totalEpisodes: number | null;
}

export function searchAnime(q: string, page = 1): Promise<AnimeListResponse> {
  return apiRequest(`/anime/search?q=${encodeURIComponent(q)}&page=${page}`);
}

export function getAnimeInfo(id: number): Promise<AnimeInfo> {
  return apiRequest(`/anime/${id}`);
}

export interface CharacterSearchResult {
  characterId: number;
  name: string;
  imageUrl: string | null;
  animeName: string | null;
}

export function searchCharacters(q: string): Promise<{ results: CharacterSearchResult[] }> {
  return apiRequest(`/anime/search-characters?q=${encodeURIComponent(q)}`);
}
