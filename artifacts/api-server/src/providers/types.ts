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

export interface Episode {
  number: number;
  title: string | null;
  aired: string | null;
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
  episodes: Episode[];
}

export interface AnimeProvider {
  name: string;
  getTrending(page?: number): Promise<AnimeListResponse>;
  getRecent(page?: number): Promise<AnimeListResponse>;
  getUpcoming(page?: number): Promise<AnimeListResponse>;
  search(q: string, page?: number): Promise<AnimeListResponse>;
  getAnimeInfo(id: string): Promise<AnimeInfo>;
}
