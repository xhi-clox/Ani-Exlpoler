import type { CatalogItem } from "./types";
import { cachedJson, fetchJson, stripHtml } from "./http";

type WdSearch = {
  search?: { id?: string; label?: string; description?: string }[];
};

type WdEntity = {
  id?: string;
  labels?: { en?: { value?: string } };
  descriptions?: { en?: { value?: string } };
  claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
  sitelinks?: { enwiki?: { title?: string } };
};

function claimValue(entity: WdEntity, property: string): unknown {
  return entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value;
}

function imageUrl(fileName: unknown): string | null {
  if (typeof fileName !== "string" || !fileName) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=600`;
}

function yearValue(entity: WdEntity): string | null {
  const value = claimValue(entity, "P577");
  if (value && typeof value === "object" && "time" in value) {
    const time = (value as { time?: unknown }).time;
    if (typeof time === "string") {
      const match = time.match(/[+-](\d{4})/);
      if (match) return match[1];
    }
  }
  return null;
}

function mapEntity(entity: WdEntity): CatalogItem {
  const description = entity.descriptions?.en?.value || "";
  const wikiTitle = entity.sitelinks?.enwiki?.title;
  const id = entity.id || "";
  const year = yearValue(entity);

  return {
    id,
    category: "MOVIE",
    title: entity.labels?.en?.value || "Untitled",
    subtitle: description,
    image: imageUrl(claimValue(entity, "P18")),
    description: stripHtml(description, 500),
    year,
    rating: null,
    externalUrl: wikiTitle
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, "_"))}`
      : `https://www.wikidata.org/wiki/${id}`,
    source: "wikidata",
    metadata: {
      wikidataId: id,
      wikipedia: wikiTitle ?? null,
    },
  };
}

export function wikidataMovieSearch(
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  // Wikidata search is a single relevance-ranked batch; pagination is not exposed.
  if (page > 1) return Promise.resolve({ items: [], hasNextPage: false });

  return cachedJson(`wikidata:movie:${query.toLowerCase()}`, 300_000, async () => {
    const searchUrl = new URL("https://www.wikidata.org/w/api.php");
    searchUrl.searchParams.set("action", "wbsearchentities");
    searchUrl.searchParams.set("search", query);
    searchUrl.searchParams.set("language", "en");
    searchUrl.searchParams.set("uselang", "en");
    searchUrl.searchParams.set("type", "item");
    searchUrl.searchParams.set("limit", "20");
    searchUrl.searchParams.set("format", "json");

    const search = await fetchJson<WdSearch>(searchUrl.toString());
    const hits = (search.search ?? []).filter((hit) => {
      const description = hit.description ?? "";
      return Boolean(hit.id) && /film|movie|cinema/i.test(description);
    }).slice(0, 20);

    if (hits.length === 0) return { items: [], hasNextPage: false };

    const entitiesUrl = new URL("https://www.wikidata.org/w/api.php");
    entitiesUrl.searchParams.set("action", "wbgetentities");
    entitiesUrl.searchParams.set("ids", hits.map((hit) => hit.id).join("|"));
    entitiesUrl.searchParams.set("props", "labels|descriptions|claims|sitelinks");
    entitiesUrl.searchParams.set("languages", "en");
    entitiesUrl.searchParams.set("sitefilter", "enwiki");
    entitiesUrl.searchParams.set("format", "json");

    const entities = await fetchJson<{ entities?: Record<string, WdEntity> }>(entitiesUrl.toString());
    const items = Object.values(entities.entities ?? {}).map(mapEntity);
    return { items, hasNextPage: false };
  });
}
