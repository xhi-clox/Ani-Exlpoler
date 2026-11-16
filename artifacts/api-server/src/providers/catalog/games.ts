import type { CatalogItem } from "./types";
import { cachedJson, fetchJson, firstYear, roundRating, stripHtml, uniqueBy } from "./http";

type RawgGame = {
  id?: number;
  slug?: string;
  name?: string;
  background_image?: string | null;
  released?: string | null;
  rating?: number | null;
  ratings_count?: number | null;
  metacritic?: number | null;
  short_description?: string | null;
  description_raw?: string | null;
  genres?: { name?: string }[];
  platforms?: { platform?: { name?: string } }[];
  website?: string | null;
};

type CheapSharkGame = {
  gameID?: string;
  steamAppID?: string | null;
  cheapest?: string;
  cheapestDealID?: string;
  external?: string;
  thumb?: string;
};

type CheapSharkDeal = {
  internalName?: string;
  title?: string;
  dealID?: string;
  storeID?: string;
  gameID?: string;
  salePrice?: string;
  normalPrice?: string;
  savings?: string;
  metacriticScore?: string;
  steamRatingText?: string;
  steamAppID?: string | null;
  releaseDate?: number;
  dealRating?: string;
  thumb?: string;
};

type FreeToGame = {
  id?: number;
  title?: string;
  thumbnail?: string;
  short_description?: string;
  game_url?: string;
  genre?: string;
  platform?: string;
  publisher?: string;
  developer?: string;
  release_date?: string;
};

export function hasRawg(): boolean {
  return Boolean(process.env.RAWG_API_KEY);
}

function rawgUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`https://api.rawg.io/api${path}`);
  url.searchParams.set("key", process.env.RAWG_API_KEY || "");
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url.toString();
}

function mapRawg(game: RawgGame): CatalogItem {
  const genres = (game.genres ?? []).map((genre) => genre.name).filter(Boolean) as string[];
  const platforms = (game.platforms ?? [])
    .map((entry) => entry.platform?.name)
    .filter(Boolean)
    .slice(0, 2) as string[];
  const year = firstYear(game.released);
  const rating = game.metacritic ? roundRating(game.metacritic / 10) : game.rating ? roundRating(game.rating * 2) : null;

  return {
    id: String(game.id ?? game.slug ?? ""),
    category: "GAME",
    title: game.name || "Untitled",
    subtitle: [year, genres.slice(0, 2).join(" · ") || null, platforms.join(" / ") || null].filter(Boolean).join(" · "),
    image: game.background_image || null,
    description: stripHtml(game.short_description || game.description_raw, 900),
    year,
    rating,
    externalUrl: game.slug ? `https://rawg.io/games/${game.slug}` : game.website || null,
    source: "rawg",
    metadata: {
      metacritic: game.metacritic ?? null,
      ratingsCount: game.ratings_count ?? null,
      genres: genres.join(", "),
      platforms: platforms.join(", "),
    },
  };
}

function dealUrl(steamAppId?: string | null, dealId?: string): string | null {
  if (steamAppId) return `https://store.steampowered.com/app/${steamAppId}`;
  if (dealId) return `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(dealId)}`;
  return null;
}

function mapCheapSharkGame(game: CheapSharkGame): CatalogItem {
  return {
    id: String(game.gameID ?? ""),
    category: "GAME",
    title: game.external || "Untitled",
    subtitle: [game.cheapest ? `From $${game.cheapest}` : null, game.steamAppID ? "Steam" : null].filter(Boolean).join(" · "),
    image: game.thumb || null,
    description: game.cheapest ? `Best current price: $${game.cheapest}` : "",
    year: null,
    rating: null,
    externalUrl: dealUrl(game.steamAppID, game.cheapestDealID),
    source: "cheapshark",
    metadata: {
      cheapest: game.cheapest ?? null,
      steamAppId: game.steamAppID ?? null,
    },
  };
}

function mapFreeToGame(game: FreeToGame): CatalogItem {
  return {
    id: String(game.id ?? ""),
    category: "GAME",
    title: game.title || "Untitled",
    subtitle: [firstYear(game.release_date), game.genre || null, game.platform || null].filter(Boolean).join(" · "),
    image: game.thumbnail || null,
    description: stripHtml(game.short_description, 900),
    year: firstYear(game.release_date),
    rating: null,
    externalUrl: game.game_url || null,
    source: "freetogame",
    metadata: {
      genre: game.genre ?? null,
      platform: game.platform ?? null,
      publisher: game.publisher ?? null,
      developer: game.developer ?? null,
    },
  };
}

function mapDeal(deal: CheapSharkDeal): CatalogItem {
  return {
    id: String(deal.gameID ?? deal.dealID ?? ""),
    category: "GAME",
    title: deal.title || deal.internalName || "Untitled",
    subtitle: [deal.salePrice ? `$${deal.salePrice}` : null, deal.savings ? `${Math.round(Number(deal.savings))}% off` : null, deal.steamRatingText || null]
      .filter(Boolean)
      .join(" · "),
    image: deal.thumb || null,
    description: deal.salePrice && deal.normalPrice ? `On sale for $${deal.salePrice} (was $${deal.normalPrice}).` : "",
    year: deal.releaseDate ? String(new Date(deal.releaseDate * 1000).getFullYear()) : null,
    rating: deal.dealRating ? roundRating(deal.dealRating) : deal.metacriticScore ? roundRating(Number(deal.metacriticScore) / 10) : null,
    externalUrl: dealUrl(deal.steamAppID, deal.dealID),
    source: "cheapshark",
    metadata: {
      salePrice: deal.salePrice ?? null,
      normalPrice: deal.normalPrice ?? null,
      savings: deal.savings ?? null,
    },
  };
}

export function rawgSearch(
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson(`rawg:search:${query.toLowerCase()}:${page}`, 300_000, async () => {
    const data = await fetchJson<{ results?: RawgGame[]; next?: string | null }>(
      rawgUrl("/games", { search: query, page: String(page), page_size: "20" }),
    );
    return {
      items: (data.results ?? []).filter((game) => game.id).map(mapRawg),
      hasNextPage: Boolean(data.next),
    };
  });
}

export function rawgFeatured(): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson("rawg:featured", 600_000, async () => {
    const data = await fetchJson<{ results?: RawgGame[] }>(
      rawgUrl("/games", { ordering: "-added", page_size: "20" }),
    );
    return { items: (data.results ?? []).filter((game) => game.id).map(mapRawg), hasNextPage: false };
  });
}

export function cheapSharkSearch(
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  if (page > 1) return Promise.resolve({ items: [], hasNextPage: false });

  return cachedJson(`cheapshark:search:${query.toLowerCase()}`, 300_000, async () => {
    const data = await fetchJson<CheapSharkGame[]>(
      `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(query)}&limit=20`,
    );
    return {
      items: uniqueBy(data.filter((game) => game.gameID).map(mapCheapSharkGame), (item) => item.id),
      hasNextPage: false,
    };
  });
}

export function freeToGameFeatured(): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson("freetogame:featured", 600_000, async () => {
    const data = await fetchJson<FreeToGame[]>("https://www.freetogame.com/api/games?platform=pc");
    return {
      items: uniqueBy(data.filter((game) => game.id).map(mapFreeToGame), (item) => item.id).slice(0, 20),
      hasNextPage: false,
    };
  });
}

export function cheapSharkDeals(): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson("cheapshark:deals", 300_000, async () => {
    const data = await fetchJson<CheapSharkDeal[]>(
      "https://www.cheapshark.com/api/1.0/deals?storeID=1&pageSize=24&sortBy=Deal%20Rating",
    );
    return {
      items: uniqueBy(data.filter((deal) => deal.title).map(mapDeal), (item) => item.id),
      hasNextPage: false,
    };
  });
}
