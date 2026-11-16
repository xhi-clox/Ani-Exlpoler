import { apiRequest } from "./client";
import type {
  CatalogCategory,
  CatalogCategoryMeta,
  CatalogFeaturedResponse,
  CatalogSearchResponse,
} from "../types";

export interface CatalogCategoriesResponse {
  results: CatalogCategoryMeta[];
  providers: {
    tmdb: boolean;
    rawg: boolean;
  };
}

const cache = new Map<string, unknown>();

export function getCatalogCategories(): Promise<CatalogCategoriesResponse> {
  return apiRequest("/catalog/categories");
}

export function searchCatalog(
  category: CatalogCategory,
  query: string,
  page = 1,
): Promise<CatalogSearchResponse> {
  const key = `search:${category}:${query.toLowerCase()}:${page}`;
  return apiRequest(
    `/catalog/search?category=${encodeURIComponent(category)}&q=${encodeURIComponent(query)}&page=${page}`,
  );
}

export function getFeaturedCatalog(category: CatalogCategory): Promise<CatalogFeaturedResponse> {
  const key = `featured:${category}`;
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached as CatalogFeaturedResponse);

  return apiRequest<CatalogFeaturedResponse>(
    `/catalog/featured?category=${encodeURIComponent(category)}`,
  ).then((response) => {
    cache.set(key, response);
    return response;
  });
}

/** Debounced catalog search helper used by the studio search fields. */
export function createCatalogSearcher(
  delayMs = 320,
): {
  search: (category: CatalogCategory, query: string) => Promise<CatalogSearchResponse>;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let sequence = 0;

  return {
    search(category, query) {
      const current = ++sequence;
      return new Promise((resolve, reject) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          searchCatalog(category, query)
            .then((response) => {
              if (current === sequence) resolve(response);
            })
            .catch((error: unknown) => {
              if (current === sequence) reject(error);
            });
        }, delayMs);
      });
    },
    cancel() {
      sequence += 1;
      if (timer) clearTimeout(timer);
    },
  };
}
