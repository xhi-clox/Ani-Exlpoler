import type { CatalogItem } from "./types";
import { cachedJson, fetchJson, roundRating, stripHtml } from "./http";

const TMDB = "https://api.themoviedb.org/3";

type TmdbEntry = {
  id?: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  overview?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  vote_average?: number | null;
  media_type?: string;
  original_language?: string;
};

export function hasTmdb(): boolean {
  return Boolean(process.env.TMDB_API_KEY || process.env.TMDB_ACCESS_TOKEN);
}

function tmdbRequest(path: string, params: Record<string, string> = {}) {
  const token = process.env.TMDB_ACCESS_TOKEN;
  const key = process.env.TMDB_API_KEY;
  const url = new URL(`${TMDB}${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  if (!token && key) url.searchParams.set("api_key", key);
  return fetchJson<{
    results?: TmdbEntry[];
    total_pages?: number;
    page?: number;
  }>(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function mapEntry(entry: TmdbEntry, category: "MOVIE" | "TV"): CatalogItem {
  const isTv = category === "TV" || entry.media_type === "tv";
  const date = entry.release_date || entry.first_air_date || "";
  const year = date.slice(0, 4);

  return {
    id: String(entry.id ?? ""),
    category,
    title: entry.title || entry.name || "Untitled",
    subtitle: [year || null, isTv ? "TV series" : "Film"].filter(Boolean).join(" · "),
    image: entry.poster_path ? `https://image.tmdb.org/t/p/w500${entry.poster_path}` : null,
    description: stripHtml(entry.overview, 900),
    year: year || null,
    rating: entry.vote_average ? roundRating(entry.vote_average) : null,
    externalUrl: entry.id ? `https://www.themoviedb.org/${isTv ? "tv" : "movie"}/${entry.id}` : null,
    source: "tmdb",
    metadata: {
      language: entry.original_language ?? null,
      type: isTv ? "TV" : "MOVIE",
    },
  };
}

export function tmdbSearch(
  category: "MOVIE" | "TV",
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  const cacheKey = `tmdb:search:${category}:${query.toLowerCase()}:${page}`;
  return cachedJson(cacheKey, 300_000, async () => {
    const resource = category === "TV" ? "tv" : "movie";
    const data = await tmdbRequest(`/search/${resource}`, {
      query,
      page: String(page),
      include_adult: "false",
    });
    return {
      items: (data.results ?? []).filter((entry) => entry.id).map((entry) => mapEntry(entry, category)),
      hasNextPage: page < (data.total_pages ?? 1),
    };
  });
}

export function tmdbFeatured(
  category: "MOVIE" | "TV",
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson(`tmdb:featured:${category}`, 600_000, async () => {
    const resource = category === "TV" ? "tv" : "movie";
    const data = await tmdbRequest(`/trending/${resource}/week`);
    return {
      items: (data.results ?? []).filter((entry) => entry.id).map((entry) => mapEntry(entry, category)),
      hasNextPage: false,
    };
  });
}
