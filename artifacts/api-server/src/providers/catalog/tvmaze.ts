import type { CatalogItem } from "./types";
import { cachedJson, fetchJson, roundRating, stripHtml, uniqueBy } from "./http";

type TvMazeShow = {
  id?: number;
  url?: string;
  name?: string;
  type?: string;
  language?: string;
  genres?: string[];
  status?: string;
  premiered?: string | null;
  rating?: { average?: number | null };
  network?: { name?: string } | null;
  webChannel?: { name?: string } | null;
  image?: { medium?: string; original?: string } | null;
  summary?: string | null;
};

function mapShow(show: TvMazeShow): CatalogItem {
  const year = show.premiered?.slice(0, 4) ?? null;
  const genres = show.genres ?? [];
  const channel = show.network?.name || show.webChannel?.name || null;
  const parts = [year, channel, genres.slice(0, 2).join(" · ") || null].filter(Boolean).join(" · ");

  return {
    id: String(show.id ?? ""),
    category: "TV",
    title: show.name || "Untitled",
    subtitle: parts,
    image: show.image?.original || show.image?.medium || null,
    description: stripHtml(show.summary, 900),
    year,
    rating: show.rating?.average ? roundRating(show.rating.average) : null,
    externalUrl: show.url ?? null,
    source: "tvmaze",
    metadata: {
      type: show.type ?? null,
      status: show.status ?? null,
      language: show.language ?? null,
      genres: genres.join(", "),
    },
  };
}

export function tvmazeSearch(
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  // TVmaze has no pagination on search; page 1 only.
  if (page > 1) return Promise.resolve({ items: [], hasNextPage: false });

  return cachedJson(`tvmaze:search:${query.toLowerCase()}`, 300_000, async () => {
    const data = await fetchJson<{ score?: number; show?: TvMazeShow }[]>(
      `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`,
    );
    const shows = data.map((entry) => entry.show).filter((show): show is TvMazeShow => Boolean(show?.id));
    return {
      items: uniqueBy(shows, (show) => String(show.id)).map(mapShow),
      hasNextPage: false,
    };
  });
}

export function tvmazeFeatured(): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson("tvmaze:featured", 600_000, async () => {
    const today = new Date().toISOString().slice(0, 10);
    const data = await fetchJson<{ show?: TvMazeShow }[]>(
      `https://api.tvmaze.com/schedule?country=US&date=${today}`,
    );
    const shows = data.map((entry) => entry.show).filter((show): show is TvMazeShow => Boolean(show?.id));
    return {
      items: uniqueBy(shows, (show) => String(show.id)).slice(0, 20).map(mapShow),
      hasNextPage: false,
    };
  });
}
