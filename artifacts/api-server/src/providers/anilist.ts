import type { AnimeProvider, AnimeResult, AnimeListResponse, AnimeInfo, Episode } from "./types";

const ANILIST = "https://graphql.anilist.co";

async function anilistQuery(query: string, variables: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(ANILIST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json()) as { data?: unknown; errors?: unknown };
  if (!res.ok || json.errors) {
    throw new Error(`AniList → ${res.status}${json.errors ? " (GraphQL error)" : ""}`);
  }
  return json.data;
}

type PageMedia = {
  id: number;
  idMal: number | null;
  title: { romaji?: string; english?: string; native?: string };
  coverImage?: { large?: string };
  startDate?: { year?: number };
  episodes?: number | null;
  format?: string;
  status?: string;
  genres?: string[];
  description?: string;
  seasonYear?: number;
  rankings?: { rank: number; type: string }[];
};

const LIST_QUERY = `
query ($page: Int, $perPage: Int, $sort: [MediaSort], $season: MediaSeason, $seasonYear: Int, $search: String, $isAdult: Boolean) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage currentPage }
    media(sort: $sort, season: $season, seasonYear: $seasonYear, search: $search, type: ANIME, isAdult: $isAdult) {
      id idMal
      title { romaji english }
      coverImage { large }
      episodes
      format
      status
      genres
      description
      startDate { year }
      rankings { rank type }
    }
  }
}
`;

const INFO_QUERY = `
query ($id: Int, $isAdult: Boolean) {
    Media(id: $id, type: ANIME, isAdult: $isAdult) {
    id idMal
    title { romaji english }
    coverImage { large }
    episodes
    format
    status
    genres
    description
    startDate { year month day }
    rankings { rank type }
  }
}
`;

const INFO_BY_MAL_QUERY = `
query ($idMal: Int, $isAdult: Boolean) {
  Page(page: 1, perPage: 1) {
    media(idMal: $idMal, type: ANIME, isAdult: $isAdult) {
      id idMal
      title { romaji english }
      coverImage { large }
      episodes
      format
      status
      genres
      description
      startDate { year month day }
      rankings { rank type }
    }
  }
}
`;

function resolveTitle(title: { romaji?: string; english?: string; native?: string }): string {
  return title.english || title.romaji || title.native || "Unknown";
}

function resolveId(media: PageMedia): string {
  return media.idMal ? String(media.idMal) : `al${media.id}`;
}

function resolveImage(media: PageMedia): string | null {
  return media.coverImage?.large ?? null;
}

function resolveYear(media: PageMedia): string | null {
  return media.startDate?.year ? String(media.startDate.year) : media.seasonYear ? String(media.seasonYear) : null;
}

function mapMedia(media: PageMedia): AnimeResult {
  return {
    id: resolveId(media),
    title: resolveTitle(media.title),
    image: resolveImage(media),
    releaseDate: resolveYear(media),
    type: media.format ?? null,
    totalEpisodes: media.episodes ?? null,
  };
}

function getCurrentSeason(): { season: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  let season: string;
  if (month >= 1 && month <= 3) season = "WINTER";
  else if (month >= 4 && month <= 6) season = "SPRING";
  else if (month >= 7 && month <= 9) season = "SUMMER";
  else season = "FALL";
  return { season, year };
}

function getNextSeason(current: string): string {
  const seasons = ["WINTER", "SPRING", "SUMMER", "FALL"];
  const idx = seasons.indexOf(current);
  return seasons[(idx + 1) % 4];
}

function dedupeMedia(media: PageMedia[]): PageMedia[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  return media.filter((m) => {
    const idKey = resolveId(m);
    if (seenIds.has(idKey)) return false;
    seenIds.add(idKey);
    const titleKey = (m.title?.english || m.title?.romaji || "").toLowerCase().trim();
    if (!m.idMal && titleKey && seenTitles.has(titleKey)) return false;
    if (titleKey) seenTitles.add(titleKey);
    return true;
  });
}

export const anilistProvider: AnimeProvider = {
  name: "anilist",

  async getTrending(page = 1) {
    const data = (await anilistQuery(LIST_QUERY, {
      page,
      perPage: 20,
      sort: ["TRENDING_DESC", "POPULARITY_DESC"],
      isAdult: false,
    })) as {
      Page: { pageInfo: { hasNextPage: boolean; currentPage: number }; media: PageMedia[] };
    };
    return {
      currentPage: data.Page.pageInfo.currentPage,
      hasNextPage: data.Page.pageInfo.hasNextPage,
      results: dedupeMedia(data.Page.media).map(mapMedia),
    };
  },

  async getRecent(page = 1) {
    const { season, year } = getCurrentSeason();
    const data = (await anilistQuery(LIST_QUERY, {
      page,
      perPage: 20,
      season,
      seasonYear: year,
      sort: ["UPDATED_AT_DESC"],
      isAdult: false,
    })) as {
      Page: { pageInfo: { hasNextPage: boolean; currentPage: number }; media: PageMedia[] };
    };
    return {
      currentPage: data.Page.pageInfo.currentPage,
      hasNextPage: data.Page.pageInfo.hasNextPage,
      results: dedupeMedia(data.Page.media).map(mapMedia),
    };
  },

  async getUpcoming(page = 1) {
    const { season, year } = getCurrentSeason();
    const nextSeason = getNextSeason(season);
    const nextYear = nextSeason === "WINTER" && season !== "WINTER" ? year + 1 : year;
    const data = (await anilistQuery(LIST_QUERY, {
      page,
      perPage: 20,
      season: nextSeason,
      seasonYear: nextYear,
      sort: ["START_DATE"],
      isAdult: false,
    })) as {
      Page: { pageInfo: { hasNextPage: boolean; currentPage: number }; media: PageMedia[] };
    };
    return {
      currentPage: data.Page.pageInfo.currentPage,
      hasNextPage: data.Page.pageInfo.hasNextPage,
      results: dedupeMedia(data.Page.media).map(mapMedia),
    };
  },

  async search(q: string, page = 1) {
    const data = (await anilistQuery(LIST_QUERY, {
      page,
      perPage: 20,
      search: q,
      sort: ["SEARCH_MATCH"],
    })) as {
      Page: { pageInfo: { hasNextPage: boolean; currentPage: number }; media: PageMedia[] };
    };
    return {
      currentPage: data.Page.pageInfo.currentPage,
      hasNextPage: data.Page.pageInfo.hasNextPage,
      results: dedupeMedia(data.Page.media).map(mapMedia),
    };
  },

  async getAnimeInfo(id: string): Promise<AnimeInfo> {
    const isAnilistId = id.startsWith("al");
    const numId = isAnilistId ? parseInt(id.slice(2), 10) : parseInt(id, 10);

    let m: PageMedia & { startDate: { year: number; month: number; day: number } };

    if (isAnilistId) {
      const data = (await anilistQuery(INFO_QUERY, { id: numId })) as {
        Media: PageMedia & { startDate: { year: number; month: number; day: number } };
      };
      if (!data?.Media) throw new Error("Anime not found");
      m = data.Media;
    } else {
      const data = (await anilistQuery(INFO_BY_MAL_QUERY, { idMal: numId })) as {
        Page: { media: (PageMedia & { startDate: { year: number; month: number; day: number } })[] };
      };
      if (!data?.Page?.media?.length) throw new Error("Anime not found");
      m = data.Page.media[0];
    }

    let episodeList: Episode[] = [];
    if (m.episodes) {
      episodeList = Array.from({ length: m.episodes }, (_, i) => ({
        number: i + 1,
        title: null,
        aired: m.startDate?.year
          ? new Date(m.startDate.year, (m.startDate.month || 1) - 1, m.startDate.day || 1).toISOString()
          : null,
      }));
    }

    return {
      id: resolveId(m),
      title: resolveTitle(m.title),
      image: resolveImage(m),
      description: m.description?.replace(/<[^>]*>/g, "") ?? null,
      releaseDate: resolveYear(m),
      status: m.status ?? null,
      genres: m.genres ?? [],
      type: m.format ?? null,
      totalEpisodes: m.episodes ?? null,
      episodes: episodeList,
    };
  },
};
