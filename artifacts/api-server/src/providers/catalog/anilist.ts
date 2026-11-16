import type { CatalogCategory, CatalogItem } from "./types";
import { cachedJson, fetchJson, roundRating, stripHtml } from "./http";

const ANILIST = "https://graphql.anilist.co";

type AniListMedia = {
  id: number;
  idMal?: number | null;
  title?: { romaji?: string; english?: string; native?: string };
  coverImage?: { large?: string; extraLarge?: string };
  description?: string | null;
  startDate?: { year?: number | null };
  averageScore?: number | null;
  siteUrl?: string | null;
  format?: string | null;
  status?: string | null;
  genres?: string[];
  chapters?: number | null;
  volumes?: number | null;
  episodes?: number | null;
};

type AniListPage = {
  Page?: {
    pageInfo?: { hasNextPage?: boolean };
    media?: AniListMedia[];
  };
};

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  coverImage { large extraLarge }
  description(asHtml: false)
  startDate { year }
  averageScore
  siteUrl
  format
  status
  genres
  chapters
  volumes
  episodes
`;

// AniList treats an explicit `countryOfOrigin: null` as a filter that matches
// nothing, so the clause has to be omitted entirely unless we actually filter.
function buildQuery(withCountry: boolean): string {
  return `
query ($page: Int, $perPage: Int, $search: String, $type: MediaType, $sort: [MediaSort]${withCountry ? ", $country: CountryCode" : ""}) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(search: $search, type: $type, ${withCountry ? "countryOfOrigin: $country, " : ""}sort: $sort, isAdult: false) {
      ${MEDIA_FIELDS}
    }
  }
}
`;
}

function mapMedia(media: AniListMedia, category: CatalogCategory): CatalogItem {
  const title = media.title?.english || media.title?.romaji || media.title?.native || "Untitled";
  const genres = media.genres ?? [];
  const parts = [media.format || null, media.startDate?.year ? String(media.startDate.year) : null, genres.slice(0, 2).join(" · ") || null]
    .filter(Boolean)
    .join(" · ");

  return {
    id: String(media.id),
    category,
    title,
    subtitle: parts,
    image: media.coverImage?.extraLarge || media.coverImage?.large || null,
    description: stripHtml(media.description, 900),
    year: media.startDate?.year ? String(media.startDate.year) : null,
    rating: media.averageScore ? roundRating(media.averageScore / 10) : null,
    externalUrl: media.siteUrl ?? null,
    source: "anilist",
    metadata: {
      malId: media.idMal ?? null,
      format: media.format ?? null,
      status: media.status ?? null,
      chapters: media.chapters ?? null,
      volumes: media.volumes ?? null,
      episodes: media.episodes ?? null,
      genres: genres.join(", "),
    },
  };
}

async function anilistPage(
  category: CatalogCategory,
  page: number,
  search?: string,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  const type = category === "ANIME" ? "ANIME" : "MANGA";
  const country =
    category === "MANGA" ? "JP" : category === "MANHWA" ? "KR" : category === "MANHUA" ? "CN" : null;
  const sort = search ? ["SEARCH_MATCH"] : ["TRENDING_DESC", "POPULARITY_DESC"];
  const cacheKey = `anilist:${category}:${search ? search.toLowerCase() : "featured"}:${page}`;

  return cachedJson(cacheKey, search ? 300_000 : 600_000, async () => {
    const data = await fetchJson<{ data?: AniListPage; errors?: unknown[] }>(ANILIST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: buildQuery(Boolean(country)),
        variables: {
          page,
          perPage: 20,
          search: search || null,
          type,
          ...(country ? { country } : {}),
          sort,
        },
      }),
    });

    if (data.errors?.length || !data.data?.Page) {
      throw new Error("AniList catalog query failed");
    }

    const media = data.data.Page.media ?? [];
    return {
      items: media.map((entry) => mapMedia(entry, category)),
      hasNextPage: Boolean(data.data.Page.pageInfo?.hasNextPage),
    };
  });
}

export function anilistSearch(
  category: CatalogCategory,
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return anilistPage(category, page, query);
}

export function anilistFeatured(
  category: CatalogCategory,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return anilistPage(category, 1);
}
