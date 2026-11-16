import type { CatalogItem } from "./types";
import { cachedJson, fetchJson, firstYear, roundRating, stripHtml, uniqueBy } from "./http";

const ITUNES = "https://itunes.apple.com";

type ItunesResult = {
  wrapperType?: string;
  kind?: string;
  artistId?: number;
  collectionId?: number;
  trackId?: number;
  artistName?: string;
  collectionName?: string;
  trackName?: string;
  artworkUrl100?: string;
  artistViewUrl?: string;
  collectionViewUrl?: string;
  trackViewUrl?: string;
  previewUrl?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  trackTimeMillis?: number;
  averageUserRating?: number;
  userRatingCount?: number;
};

type LegacyEntry = {
  "im:name"?: { label?: string };
  "im:artist"?: { label?: string };
  "im:image"?: { label?: string }[];
  "im:collection"?: { "im:name"?: { label?: string } };
  "im:releaseDate"?: { label?: string };
  "im:price"?: { label?: string };
  "im:contentType"?: { attributes?: { label?: string } };
  summary?: { label?: string };
  rights?: { label?: string };
  link?: { attributes?: { href?: string } };
  id?: { attributes?: { "im:id"?: string } };
  category?: { attributes?: { label?: string } };
};

function image(url: string | undefined, size = 600): string | null {
  if (!url) return null;
  return url.replace(/\/\d+x\d+bb\.(jpg|png)$/, `/${size}x${size}bb.$1`);
}

function mapSong(item: ItunesResult): CatalogItem {
  return {
    id: String(item.trackId ?? item.collectionId ?? ""),
    category: "MUSIC",
    title: item.trackName || item.collectionName || "Untitled",
    subtitle: [item.artistName, item.collectionName].filter(Boolean).join(" · "),
    image: image(item.artworkUrl100),
    description: [item.primaryGenreName, item.collectionName].filter(Boolean).join(" · "),
    year: firstYear(item.releaseDate),
    rating: item.averageUserRating ? roundRating(item.averageUserRating * 2) : null,
    externalUrl: item.trackViewUrl || item.collectionViewUrl || null,
    source: "itunes",
    metadata: {
      artist: item.artistName ?? null,
      album: item.collectionName ?? null,
      genre: item.primaryGenreName ?? null,
      preview: item.previewUrl ?? null,
      durationMs: item.trackTimeMillis ?? null,
    },
  };
}

function mapArtist(item: ItunesResult): CatalogItem {
  return {
    id: String(item.artistId ?? ""),
    category: "ARTIST",
    title: item.artistName || "Unknown artist",
    subtitle: item.primaryGenreName || "Artist",
    image: null,
    description: item.primaryGenreName || "",
    year: null,
    rating: null,
    externalUrl: item.artistViewUrl || null,
    source: "itunes",
    metadata: { genre: item.primaryGenreName ?? null },
  };
}

function mapTv(item: ItunesResult): CatalogItem {
  const show = item.artistName || item.collectionName || "Untitled";
  const season = item.collectionName && item.collectionName !== show ? item.collectionName : "";

  return {
    id: String(item.collectionId ?? item.artistId ?? ""),
    category: "TV",
    title: show,
    subtitle: [season || null, item.primaryGenreName || null].filter(Boolean).join(" · "),
    image: image(item.artworkUrl100),
    description: season || item.primaryGenreName || "",
    year: firstYear(item.releaseDate),
    rating: item.averageUserRating ? roundRating(item.averageUserRating * 2) : null,
    externalUrl: item.collectionViewUrl || item.artistViewUrl || null,
    source: "itunes",
    metadata: {
      show: show,
      season: season || null,
      genre: item.primaryGenreName ?? null,
    },
  };
}

async function itunesSearch(
  params: Record<string, string>,
  page: number,
  map: (item: ItunesResult) => CatalogItem,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  const limit = 20;
  const url = new URL(`${ITUNES}/search`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String((page - 1) * limit));
  url.searchParams.set("country", "US");

  const data = await fetchJson<{ results?: ItunesResult[] }>(url.toString());
  const results = (data.results ?? []).filter((item) => item.wrapperType !== "collection" || item.collectionId);
  const items = uniqueBy(results.map(map).filter((item) => item.id), (item) => item.id);
  return { items, hasNextPage: results.length >= limit };
}

export function itunesSongSearch(
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson(`itunes:song:${query.toLowerCase()}:${page}`, 300_000, () =>
    itunesSearch({ term: query, media: "music", entity: "song" }, page, mapSong),
  );
}

export function itunesArtistSearch(
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson(`itunes:artist:${query.toLowerCase()}:${page}`, 300_000, () =>
    itunesSearch({ term: query, media: "music", entity: "musicArtist" }, page, mapArtist),
  );
}

export function itunesTvSearch(
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson(`itunes:tv:${query.toLowerCase()}:${page}`, 300_000, () =>
    itunesSearch({ term: query, media: "tvShow", entity: "tvSeason" }, page, mapTv),
  );
}

function legacyEntryId(entry: LegacyEntry): string {
  return entry.id?.attributes?.["im:id"] || entry.link?.attributes?.href || entry["im:name"]?.label || "";
}

function legacyImage(entry: LegacyEntry): string | null {
  const images = entry["im:image"] ?? [];
  const last = images[images.length - 1]?.label;
  if (!last) return null;
  return last.replace(/\/\d+x\d+bb\.(jpg|png)$/, "/600x900bb.$1");
}

function mapLegacyMovie(entry: LegacyEntry): CatalogItem {
  return {
    id: legacyEntryId(entry),
    category: "MOVIE",
    title: entry["im:name"]?.label || "Untitled",
    subtitle: [entry["im:artist"]?.label, firstYear(entry["im:releaseDate"]?.label)].filter(Boolean).join(" · "),
    image: legacyImage(entry),
    description: stripHtml(entry.summary?.label, 900),
    year: firstYear(entry["im:releaseDate"]?.label),
    rating: null,
    externalUrl: entry.link?.attributes?.href || null,
    source: "itunes",
    metadata: {
      director: entry["im:artist"]?.label ?? null,
      price: entry["im:price"]?.label ?? null,
      genre: entry.category?.attributes?.label ?? null,
    },
  };
}

function mapLegacyTv(entry: LegacyEntry): CatalogItem {
  const show = entry["im:collection"]?.["im:name"]?.label || entry["im:artist"]?.label || entry["im:name"]?.label || "Untitled";
  return {
    id: legacyEntryId(entry),
    category: "TV",
    title: show,
    subtitle: [entry["im:name"]?.label, firstYear(entry["im:releaseDate"]?.label)].filter(Boolean).join(" · "),
    image: legacyImage(entry),
    description: stripHtml(entry.summary?.label, 900),
    year: firstYear(entry["im:releaseDate"]?.label),
    rating: null,
    externalUrl: entry.link?.attributes?.href || null,
    source: "itunes",
    metadata: {
      episode: entry["im:name"]?.label ?? null,
      genre: entry.category?.attributes?.label ?? null,
    },
  };
}

async function legacyFeed(path: string): Promise<LegacyEntry[]> {
  const data = await fetchJson<{ feed?: { entry?: LegacyEntry[] } }>(
    `${ITUNES}/us/rss/${path}/limit=25/json`,
  );
  return data.feed?.entry ?? [];
}

export function itunesTopMovies(): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson("itunes:featured:movies", 600_000, async () => {
    const entries = await legacyFeed("topmovies");
    return { items: entries.map(mapLegacyMovie).filter((item) => item.id), hasNextPage: false };
  });
}

export function itunesTopTv(): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson("itunes:featured:tv", 600_000, async () => {
    const entries = await legacyFeed("toptvepisodes");
    return { items: uniqueBy(entries.map(mapLegacyTv).filter((item) => item.id), (item) => item.id), hasNextPage: false };
  });
}

type MarketingResult = {
  id?: string;
  name?: string;
  artistName?: string;
  artworkUrl100?: string;
  url?: string;
  releaseDate?: string;
  genre?: string;
  genres?: { name?: string }[];
  kind?: string;
};

export function itunesTopSongs(): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson("itunes:featured:songs", 600_000, async () => {
    const data = await fetchJson<{ feed?: { results?: MarketingResult[] } }>(
      "https://rss.applemarketingtools.com/api/v2/us/music/most-played/25/songs.json",
    );
    const results = data.feed?.results ?? [];
    const items = results.map((entry): CatalogItem => {
      const genre = entry.genre || entry.genres?.[0]?.name || "";
      return {
        id: String(entry.id ?? ""),
        category: "MUSIC",
        title: entry.name || "Untitled",
        subtitle: [entry.artistName, genre].filter(Boolean).join(" · "),
        image: image(entry.artworkUrl100),
        description: genre,
        year: firstYear(entry.releaseDate),
        rating: null,
        externalUrl: entry.url ?? null,
        source: "itunes",
        metadata: {
          artist: entry.artistName ?? null,
          genre: genre || null,
        },
      };
    });
    return { items: items.filter((item) => item.title !== "Untitled"), hasNextPage: false };
  });
}
