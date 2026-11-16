import type { CatalogItem } from "./types";
import { cachedJson, fetchJson, roundRating, stripHtml } from "./http";

const FIELDS = "key,title,author_name,first_publish_year,cover_i,subject,edition_count,ratings_average,ratings_count,language";

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number | null;
  cover_i?: number | null;
  subject?: string[];
  edition_count?: number | null;
  ratings_average?: number | null;
  ratings_count?: number | null;
  language?: string[];
};

function cover(coverId?: number | null): string | null {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
}

function mapDoc(doc: OpenLibraryDoc): CatalogItem {
  const authors = (doc.author_name ?? []).slice(0, 2).join(", ");
  const subjects = (doc.subject ?? []).slice(0, 3).join(" · ");
  const parts = [authors || null, doc.first_publish_year ? String(doc.first_publish_year) : null, subjects || null]
    .filter(Boolean)
    .join(" · ");

  return {
    id: (doc.key ?? "").replace("/works/", ""),
    category: "NOVEL",
    title: doc.title || "Untitled",
    subtitle: parts,
    image: cover(doc.cover_i),
    description: stripHtml(subjects, 500),
    year: doc.first_publish_year ? String(doc.first_publish_year) : null,
    rating: doc.ratings_average ? roundRating(doc.ratings_average * 2) : null,
    externalUrl: doc.key ? `https://openlibrary.org${doc.key}` : null,
    source: "openlibrary",
    metadata: {
      authors: authors || null,
      editions: doc.edition_count ?? null,
      ratingsCount: doc.ratings_count ?? null,
      languages: (doc.language ?? []).slice(0, 4).join(", ") || null,
    },
  };
}

export function openLibrarySearch(
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  const cacheKey = `openlibrary:search:${query.toLowerCase()}:${page}`;
  return cachedJson(cacheKey, 300_000, async () => {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("q", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", "20");
    url.searchParams.set("fields", FIELDS);

    const data = await fetchJson<{
      numFound?: number;
      docs?: OpenLibraryDoc[];
    }>(url.toString());

    const docs = data.docs ?? [];
    return {
      items: docs.filter((doc) => doc.title).map(mapDoc),
      hasNextPage: (data.numFound ?? 0) > page * 20,
    };
  });
}

export function openLibraryFeatured(): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson("openlibrary:featured", 600_000, async () => {
    const data = await fetchJson<{ works?: OpenLibraryDoc[] }>(
      "https://openlibrary.org/trending/daily.json?limit=20",
    );
    return {
      items: (data.works ?? []).filter((doc) => doc.title).map(mapDoc),
      hasNextPage: false,
    };
  });
}
