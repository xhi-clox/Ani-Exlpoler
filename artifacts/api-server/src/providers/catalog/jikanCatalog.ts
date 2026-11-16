import type { CatalogCategory, CatalogItem } from "./types";
import { cachedJson, fetchJson, roundRating, stripHtml } from "./http";

const JIKAN = "https://api.jikan.moe/v4";

type JikanEntry = {
  mal_id?: number;
  title?: string;
  title_english?: string | null;
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
  synopsis?: string | null;
  year?: number | null;
  aired?: { prop?: { from?: { year?: number | null } } };
  published?: { prop?: { from?: { year?: number | null } } };
  score?: number | null;
  url?: string | null;
  type?: string | null;
  status?: string | null;
  episodes?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  genres?: { name?: string }[];
};

function mapEntry(entry: JikanEntry, category: CatalogCategory): CatalogItem {
  const genres = (entry.genres ?? []).map((genre) => genre.name).filter(Boolean) as string[];
  const year =
    entry.year ??
    entry.aired?.prop?.from?.year ??
    entry.published?.prop?.from?.year ??
    null;
  const parts = [entry.type || null, year ? String(year) : null, genres.slice(0, 2).join(" · ") || null]
    .filter(Boolean)
    .join(" · ");

  return {
    id: String(entry.mal_id ?? ""),
    category,
    title: entry.title_english || entry.title || "Untitled",
    subtitle: parts,
    image: entry.images?.jpg?.large_image_url || entry.images?.jpg?.image_url || null,
    description: stripHtml(entry.synopsis, 900),
    year: year ? String(year) : null,
    rating: entry.score ? roundRating(entry.score) : null,
    externalUrl: entry.url ?? null,
    source: "jikan",
    metadata: {
      format: entry.type ?? null,
      status: entry.status ?? null,
      episodes: entry.episodes ?? null,
      chapters: entry.chapters ?? null,
      volumes: entry.volumes ?? null,
      genres: genres.join(", "),
    },
  };
}

async function jikanPage(
  category: CatalogCategory,
  path: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  const cacheKey = `jikan:${category}:${path}:${page}`;
  return cachedJson(cacheKey, path.includes("q=") ? 300_000 : 600_000, async () => {
    const data = await fetchJson<{
      data?: JikanEntry[];
      pagination?: { has_next_page?: boolean };
    }>(`${JIKAN}${path}`, {}, 4_000);
    return {
      items: (data.data ?? []).map((entry) => mapEntry(entry, category)),
      hasNextPage: Boolean(data.pagination?.has_next_page),
    };
  });
}

export function jikanSearch(
  category: CatalogCategory,
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  const resource = category === "ANIME" ? "anime" : "manga";
  return jikanPage(
    category,
    `/${resource}?q=${encodeURIComponent(query)}&page=${page}&limit=20&sfw`,
    page,
  );
}

export function jikanFeatured(
  category: CatalogCategory,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  const resource = category === "ANIME" ? "anime" : "manga";
  return jikanPage(category, `/top/${resource}?page=1&limit=20&sfw`, 1);
}
