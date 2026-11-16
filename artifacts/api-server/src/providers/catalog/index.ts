import type {
  CatalogCategory,
  CatalogCategoryMeta,
  CatalogFeaturedResult,
  CatalogItem,
  CatalogSearchResult,
} from "./types";
import { anilistFeatured, anilistSearch } from "./anilist";
import { jikanFeatured, jikanSearch } from "./jikanCatalog";
import { openLibraryFeatured, openLibrarySearch } from "./openlibrary";
import { hasTmdb, tmdbFeatured, tmdbSearch } from "./tmdb";
import { tvmazeFeatured, tvmazeSearch } from "./tvmaze";
import { wikidataMovieSearch } from "./wikidata";
import { itunesArtistSearch, itunesSongSearch, itunesTopMovies, itunesTopSongs, itunesTopTv, itunesTvSearch } from "./itunes";
import { cheapSharkDeals, cheapSharkSearch, freeToGameFeatured, hasRawg, rawgFeatured, rawgSearch } from "./games";
import { deezerArtistSearch, deezerChartArtists, deezerChartTracks, deezerTrackSearch } from "./deezer";

export type { CatalogCategory, CatalogCategoryMeta, CatalogItem, CatalogFeaturedResult, CatalogSearchResult } from "./types";
export { stripHtml } from "./http";

export const CATALOG_CATEGORIES: CatalogCategoryMeta[] = [
  {
    id: "ANIME",
    label: "Anime",
    singular: "anime",
    blurb: "Japanese animation, films and series",
    source: "AniList · Jikan",
    accent: "#38C8E0",
  },
  {
    id: "MANGA",
    label: "Manga",
    singular: "manga",
    blurb: "Japanese comics and graphic novels",
    source: "AniList · Jikan",
    accent: "#A78BFA",
  },
  {
    id: "MANHWA",
    label: "Manhwa",
    singular: "manhwa",
    blurb: "Korean webcomics and print comics",
    source: "AniList",
    accent: "#F472B6",
  },
  {
    id: "MANHUA",
    label: "Manhua",
    singular: "manhua",
    blurb: "Chinese comics and webcomics",
    source: "AniList",
    accent: "#FB923C",
  },
  {
    id: "NOVEL",
    label: "Novels",
    singular: "novel",
    blurb: "Books, literature and light reading",
    source: "Open Library",
    accent: "#FCD34D",
  },
  {
    id: "MOVIE",
    label: "Movies",
    singular: "movie",
    blurb: "Films, cinema and documentaries",
    source: "TMDB · Wikidata · iTunes",
    accent: "#60A5FA",
  },
  {
    id: "TV",
    label: "TV Series",
    singular: "TV series",
    blurb: "Shows, seasons and episodes",
    source: "TMDB · TVmaze · iTunes",
    accent: "#34D399",
  },
  {
    id: "GAME",
    label: "Games",
    singular: "game",
    blurb: "Video games across every platform",
    source: "RAWG · CheapShark · FreeToGame",
    accent: "#F87171",
  },
  {
    id: "MUSIC",
    label: "Music",
    singular: "track",
    blurb: "Songs, albums and soundtracks",
    source: "Deezer · iTunes",
    accent: "#C084FC",
  },
  {
    id: "ARTIST",
    label: "Artists",
    singular: "artist",
    blurb: "Musicians, bands and composers",
    source: "Deezer · iTunes",
    accent: "#FB7185",
  },
];

const CATEGORY_IDS = new Set<string>(CATALOG_CATEGORIES.map((category) => category.id));

export function isCatalogCategory(value: unknown): value is CatalogCategory {
  return typeof value === "string" && CATEGORY_IDS.has(value.toUpperCase());
}

export function parseCatalogCategory(value: unknown): CatalogCategory | null {
  if (typeof value !== "string") return null;
  const category = value.toUpperCase();
  return CATEGORY_IDS.has(category) ? (category as CatalogCategory) : null;
}

export function getCatalogCategory(category: CatalogCategory): CatalogCategoryMeta {
  return CATALOG_CATEGORIES.find((entry) => entry.id === category) ?? CATALOG_CATEGORIES[0];
}

type ProviderResult = { items: CatalogItem[]; hasNextPage: boolean };
type SearchProvider = { name: string; run: () => Promise<ProviderResult> };

function searchProviders(category: CatalogCategory, query: string, page: number): SearchProvider[] {
  switch (category) {
    case "ANIME":
      return [
        { name: "anilist", run: () => anilistSearch(category, query, page) },
        { name: "jikan", run: () => jikanSearch(category, query, page) },
      ];
    case "MANGA":
    case "MANHWA":
    case "MANHUA":
      return [
        { name: "anilist", run: () => anilistSearch(category, query, page) },
        { name: "jikan", run: () => jikanSearch(category, query, page) },
      ];
    case "NOVEL":
      return [{ name: "openlibrary", run: () => openLibrarySearch(query, page) }];
    case "MOVIE": {
      const providers: SearchProvider[] = [];
      if (hasTmdb()) providers.push({ name: "tmdb", run: () => tmdbSearch("MOVIE", query, page) });
      providers.push({ name: "wikidata", run: () => wikidataMovieSearch(query, page) });
      return providers;
    }
    case "TV": {
      const providers: SearchProvider[] = [];
      if (hasTmdb()) providers.push({ name: "tmdb", run: () => tmdbSearch("TV", query, page) });
      providers.push(
        { name: "tvmaze", run: () => tvmazeSearch(query, page) },
        { name: "itunes", run: () => itunesTvSearch(query, page) },
      );
      return providers;
    }
    case "GAME": {
      const providers: SearchProvider[] = [];
      if (hasRawg()) providers.push({ name: "rawg", run: () => rawgSearch(query, page) });
      providers.push({ name: "cheapshark", run: () => cheapSharkSearch(query, page) });
      return providers;
    }
    case "MUSIC":
      return [
        { name: "deezer", run: () => deezerTrackSearch(query, page) },
        { name: "itunes", run: () => itunesSongSearch(query, page) },
      ];
    case "ARTIST":
      return [
        { name: "deezer", run: () => deezerArtistSearch(query, page) },
        { name: "itunes", run: () => itunesArtistSearch(query, page) },
      ];
    default:
      return [];
  }
}

function featuredProviders(category: CatalogCategory): SearchProvider[] {
  switch (category) {
    case "ANIME":
    case "MANGA":
    case "MANHWA":
    case "MANHUA":
      return [
        { name: "anilist", run: () => anilistFeatured(category) },
        { name: "jikan", run: () => jikanFeatured(category) },
      ];
    case "NOVEL":
      return [{ name: "openlibrary", run: () => openLibraryFeatured() }];
    case "MOVIE": {
      const providers: SearchProvider[] = [];
      if (hasTmdb()) providers.push({ name: "tmdb", run: () => tmdbFeatured("MOVIE") });
      providers.push({ name: "itunes", run: () => itunesTopMovies() });
      return providers;
    }
    case "TV": {
      const providers: SearchProvider[] = [];
      if (hasTmdb()) providers.push({ name: "tmdb", run: () => tmdbFeatured("TV") });
      providers.push(
        { name: "tvmaze", run: () => tvmazeFeatured() },
        { name: "itunes", run: () => itunesTopTv() },
      );
      return providers;
    }
    case "GAME": {
      const providers: SearchProvider[] = [];
      if (hasRawg()) providers.push({ name: "rawg", run: () => rawgFeatured() });
      providers.push(
        { name: "freetogame", run: () => freeToGameFeatured() },
        { name: "cheapshark", run: () => cheapSharkDeals() },
      );
      return providers;
    }
    case "MUSIC":
      return [
        { name: "deezer", run: () => deezerChartTracks() },
        { name: "itunes", run: () => itunesTopSongs() },
      ];
    case "ARTIST":
      return [{ name: "deezer", run: () => deezerChartArtists() }];
    default:
      return [];
  }
}

// A provider that just failed hard (timeout, 5xx, network) is skipped for a
// while so one dead upstream cannot add a long timeout to every request.
const FAILURE_COOLDOWN_MS = 5 * 60_000;
const providerFailures = new Map<string, number>();

function isCoolingDown(name: string): boolean {
  const until = providerFailures.get(name);
  if (!until) return false;
  if (until <= Date.now()) {
    providerFailures.delete(name);
    return false;
  }
  return true;
}

async function runProviders(
  label: string,
  providers: SearchProvider[],
): Promise<{ source: string; items: CatalogItem[]; hasNextPage: boolean }> {
  const errors: string[] = [];
  const healthy = providers.filter((provider) => !isCoolingDown(provider.name));
  // Never skip everything: if every provider is cooling down, retry them all.
  const attempt = healthy.length > 0 ? healthy : providers;

  for (let index = 0; index < attempt.length; index += 1) {
    const provider = attempt[index];
    try {
      const result = await provider.run();
      providerFailures.delete(provider.name);
      if (result.items.length > 0 || index === attempt.length - 1) {
        return { source: provider.name, items: result.items, hasNextPage: result.hasNextPage };
      }
    } catch (err) {
      providerFailures.set(provider.name, Date.now() + FAILURE_COOLDOWN_MS);
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`${label} failed. ${errors.join(" | ") || "No providers configured"}`);
}

export async function searchCatalog(
  category: CatalogCategory,
  query: string,
  page = 1,
): Promise<CatalogSearchResult> {
  const providers = searchProviders(category, query, page);
  if (providers.length === 0) {
    return { category, query, page, hasNextPage: false, source: "none", results: [] };
  }

  const result = await runProviders(`Search for "${query}" in ${category}`, providers);
  return {
    category,
    query,
    page,
    source: result.source,
    hasNextPage: result.hasNextPage,
    results: result.items.filter((item) => item.title && item.title !== "Untitled"),
  };
}

export async function featuredCatalog(category: CatalogCategory): Promise<CatalogFeaturedResult> {
  const providers = featuredProviders(category);
  if (providers.length === 0) {
    return { category, source: "none", results: [] };
  }

  const result = await runProviders(`Featured ${category}`, providers);
  return {
    category,
    source: result.source,
    results: result.items.filter((item) => item.title && item.title !== "Untitled"),
  };
}
