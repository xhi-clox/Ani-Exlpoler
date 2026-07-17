import type { AnimeProvider, AnimeResult, AnimeListResponse, AnimeInfo, Episode } from "./types";

const JIKAN = "https://api.jikan.moe/v4";

async function jikanFetch(path: string): Promise<unknown> {
  const res = await fetch(`${JIKAN}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Jikan ${path} → ${res.status}`);
  return res.json();
}

type JikanAnime = {
  mal_id: number;
  title: string;
  images?: { jpg?: { image_url?: string } };
  aired?: { from?: string };
  type?: string;
  status?: string;
  genres?: { name: string }[];
  synopsis?: string;
  episodes?: number | null;
};

function mapAnime(a: JikanAnime): AnimeResult {
  return {
    id: String(a.mal_id),
    title: a.title,
    image: a.images?.jpg?.image_url ?? null,
    releaseDate: a.aired?.from ? new Date(a.aired.from).getFullYear().toString() : null,
    type: a.type ?? null,
    totalEpisodes: a.episodes ?? null,
  };
}

async function fetchList(path: string, page: number): Promise<AnimeListResponse> {
  const data = (await jikanFetch(`${path}?page=${page}&limit=20`)) as {
    data: JikanAnime[];
    pagination: { has_next_page: boolean; current_page: number };
  };
  const seen = new Set<number>();
  return {
    currentPage: data.pagination.current_page,
    hasNextPage: data.pagination.has_next_page,
    results: data.data.filter((a) => {
      if (seen.has(a.mal_id)) return false;
      seen.add(a.mal_id);
      return true;
    }).map(mapAnime),
  };
}

export const jikanProvider: AnimeProvider = {
  name: "jikan",

  async getTrending(page = 1) {
    return fetchList("/top/anime", page);
  },

  async getRecent(page = 1) {
    return fetchList("/seasons/now", page);
  },

  async getUpcoming(page = 1) {
    return fetchList("/seasons/upcoming", page);
  },

  async search(q: string, page = 1) {
    return fetchList(`/anime?q=${encodeURIComponent(q)}`, page);
  },

  async getAnimeInfo(id: string): Promise<AnimeInfo> {
    const [infoData, epsData] = await Promise.all([
      jikanFetch(`/anime/${id}`) as Promise<{ data: JikanAnime }>,
      jikanFetch(`/anime/${id}/episodes?page=1`) as Promise<{
        data: { mal_id: number; title: string; aired: string; number: number }[];
        pagination: { last_visible_page: number };
      }>,
    ]);

    const a = infoData.data;

    const allEpsPromises: Promise<{ data: { mal_id: number; title: string; aired: string; number: number }[] }>[] =
      [Promise.resolve(epsData)];

    const totalPages = epsData.pagination?.last_visible_page ?? 1;
    for (let p = 2; p <= Math.min(totalPages, 5); p++) {
      allEpsPromises.push(
        jikanFetch(`/anime/${id}/episodes?page=${p}`) as Promise<{
          data: { mal_id: number; title: string; aired: string; number: number }[];
          pagination: { last_visible_page: number };
        }>
      );
    }

    const allEpsResults = await Promise.all(allEpsPromises);
    const episodes: Episode[] = allEpsResults.flatMap((r) =>
      (r.data ?? []).map((ep, idx) => ({
        number: ep.number || idx + 1,
        title: ep.title ?? null,
        aired: ep.aired ?? null,
      }))
    );

    return {
      id: String(a.mal_id),
      title: a.title,
      image: a.images?.jpg?.image_url ?? null,
      description: a.synopsis ?? null,
      releaseDate: a.aired?.from ? new Date(a.aired.from).getFullYear().toString() : null,
      status: a.status ?? null,
      genres: (a.genres ?? []).map((g) => g.name),
      type: a.type ?? null,
      totalEpisodes: a.episodes ?? null,
      episodes,
    };
  },
};
