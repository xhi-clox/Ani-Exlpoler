export type CatalogCategory =
  | "ANIME"
  | "MANGA"
  | "MANHWA"
  | "MANHUA"
  | "NOVEL"
  | "MOVIE"
  | "TV"
  | "GAME"
  | "MUSIC"
  | "ARTIST";

export interface CatalogItem {
  /** Provider-scoped identifier. */
  id: string;
  category: CatalogCategory;
  title: string;
  subtitle: string;
  image: string | null;
  description: string;
  year: string | null;
  /** Normalised to a 0–10 scale. */
  rating: number | null;
  externalUrl: string | null;
  source: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CatalogSearchResult {
  category: CatalogCategory;
  query: string;
  page: number;
  hasNextPage: boolean;
  source: string;
  results: CatalogItem[];
}

export interface CatalogFeaturedResult {
  category: CatalogCategory;
  source: string;
  results: CatalogItem[];
}

export interface CatalogCategoryMeta {
  id: CatalogCategory;
  label: string;
  singular: string;
  blurb: string;
  source: string;
  accent: string;
}
