import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  Compass,
  ExternalLink,
  Flame,
  Gamepad2,
  Loader2,
  Mic2,
  Music,
  Search,
  Sparkles,
  Star,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { useLocation } from "wouter";
import { getCatalogCategories, getFeaturedCatalog, searchCatalog } from "../api/catalog";
import { CATALOG_CATEGORIES } from "../data/catalog";
import type { CatalogCategory, CatalogItem } from "../types";

const CATEGORY_ICONS: Record<CatalogCategory, LucideIcon> = {
  ANIME: Sparkles,
  MANGA: BookOpen,
  MANHWA: Flame,
  MANHUA: Compass,
  NOVEL: BookOpen,
  MOVIE: Clapperboard,
  TV: Tv,
  GAME: Gamepad2,
  MUSIC: Music,
  ARTIST: Mic2,
};

function CatalogCard({ item }: { item: CatalogItem }) {
  const [failed, setFailed] = useState(false);
  const href = item.externalUrl || undefined;

  return (
    <a
      href={href}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      className={`group min-w-0 ${href ? "" : "pointer-events-none"}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-[#1E2630] bg-[#0D1117]">
        {item.image && !failed ? (
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center px-3 text-center font-condensed text-2xl font-bold uppercase tracking-[0.16em] text-white/25"
            style={{ background: `linear-gradient(150deg, #101923, #0A0D12 70%)` }}
          >
            {item.title.slice(0, 1)}
          </div>
        )}

        {item.rating ? (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-[#FCD34D] backdrop-blur">
            <Star className="h-2.5 w-2.5 fill-current" />
            {item.rating.toFixed(1)}
          </span>
        ) : null}

        {item.year ? (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] text-[#CBD5E1] backdrop-blur">
            {item.year}
          </span>
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70" />
        <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-[#8A94A6]">
          {item.source}
        </span>
        {href ? (
          <span className="pointer-events-none absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[#8A94A6] opacity-0 transition-opacity group-hover:opacity-100">
            <ExternalLink className="h-3 w-3" />
          </span>
        ) : null}
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="line-clamp-2 text-[11.5px] font-medium leading-snug text-white">{item.title}</h3>
        <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-[#8A94A6]">
          {item.subtitle || item.description || "No description available."}
        </p>
      </div>
    </a>
  );
}

export default function Discover() {
  const [, setLocation] = useLocation();
  const [category, setCategory] = useState<CatalogCategory>("ANIME");
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<{ tmdb: boolean; rawg: boolean } | null>(null);

  const meta = useMemo(
    () => CATALOG_CATEGORIES.find((entry) => entry.id === category) ?? CATALOG_CATEGORIES[0],
    [category],
  );
  const ActiveIcon = CATEGORY_ICONS[category];

  useEffect(() => {
    getCatalogCategories()
      .then((response) => setProviders(response.providers))
      .catch(() => setProviders(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setResults([]);
    setActiveQuery("");
    setQuery("");
    setPage(1);
    setHasNextPage(false);

    getFeaturedCatalog(category)
      .then((response) => {
        if (cancelled) return;
        setResults(response.results);
        setSource(response.source);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this category");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category, refreshKey]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) {
      setRefreshKey((current) => current + 1);
      return;
    }
    setActiveQuery(term);
    setPage(1);
    setLoading(true);
    setError("");
    searchCatalog(category, term)
      .then((response) => {
        setResults(response.results);
        setSource(response.source);
        setHasNextPage(response.hasNextPage);
      })
      .catch((err: unknown) => {
        setResults([]);
        setError(err instanceof Error ? err.message : "Search failed");
      })
      .finally(() => setLoading(false));
  };

  const loadMore = () => {
    if (!activeQuery || loadingMore) return;
    setLoadingMore(true);
    searchCatalog(category, activeQuery, page + 1)
      .then((response) => {
        setResults((current) => [...current, ...response.results]);
        setSource(response.source);
        setHasNextPage(response.hasNextPage);
        setPage(response.page);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load more"))
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-condensed text-[10px] font-bold uppercase tracking-[0.34em] text-[#38C8E0]">
            The whole library
          </p>
          <h1 className="mt-2 font-display text-[34px] font-bold leading-none tracking-[-0.02em] text-white sm:text-[44px]">
            Discover everything.
          </h1>
          <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-[#8A94A6]">
            Anime, manga, manhwa, manhua, novels, movies, TV, games, music and artists — one search,
            live results from the best catalogues on the web.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] ${
              providers?.tmdb
                ? "border-[#38C8E0]/40 text-[#38C8E0]"
                : "border-[#2A3341] text-[#64748B]"
            }`}
          >
            TMDB {providers?.tmdb ? "live" : "keyless fallback"}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] ${
              providers?.rawg
                ? "border-[#F87171]/40 text-[#F87171]"
                : "border-[#2A3341] text-[#64748B]"
            }`}
          >
            RAWG {providers?.rawg ? "live" : "keyless fallback"}
          </span>
        </div>
      </div>

      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {CATALOG_CATEGORIES.map((entry) => {
          const Icon = CATEGORY_ICONS[entry.id];
          const active = entry.id === category;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setCategory(entry.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium transition-colors ${
                active
                  ? "bg-white/[0.06] text-white"
                  : "border-[#2A3341] text-[#8A94A6] hover:border-[#3A4658] hover:text-white"
              }`}
              style={active ? { borderColor: `${entry.accent}66`, color: entry.accent } : undefined}
            >
              <Icon className="h-3 w-3" />
              {entry.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-[#1E2630] bg-[#11161D] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${meta.accent}18`, color: meta.accent }}
            >
              <ActiveIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white">{meta.label}</p>
              <p className="text-[10px] text-[#8A94A6]">
                {meta.blurb} · {meta.source}
              </p>
            </div>
          </div>
          <span className="text-[9px] uppercase tracking-[0.12em] text-[#5B6678]">
            {activeQuery ? `Search · ${source}` : `Featured · ${source || "loading"}`}
          </span>
        </div>

        <form onSubmit={submitSearch} className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6678]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${meta.singular}…`}
            className="w-full rounded-lg border border-[#2A3341] bg-[#0B1017] py-2.5 pl-9 pr-24 text-[12px] text-white outline-none transition-colors placeholder:text-[#5B6678] focus:border-[#38C8E0]/60 focus:ring-2 focus:ring-[#38C8E0]/10"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-[#38C8E0] px-3 py-1.5 text-[10px] font-semibold text-[#071016] transition-colors hover:bg-[#6BDDF8]"
          >
            Search <ArrowRight className="h-3 w-3" />
          </button>
        </form>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[3/4] rounded-xl border border-[#1E2630] bg-[#11161D]" />
                <div className="mt-2 h-3 w-3/4 rounded bg-[#11161D]" />
                <div className="mt-1.5 h-2.5 w-1/2 rounded bg-[#0D1117]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[#FB7185]/30 bg-[#FB7185]/5 px-4 py-8 text-center">
            <p className="text-[12px] text-[#FB7185]">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="mt-3 inline-flex items-center gap-1 rounded-md border border-[#2A3341] px-3 py-1.5 text-[10px] text-[#CBD5E1] transition-colors hover:border-[#38C8E0]/50"
            >
              Retry
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2A3341] bg-[#0D1117]/40 px-4 py-14 text-center">
            <Compass className="mx-auto h-8 w-8 text-[#2A3341]" />
            <p className="mt-3 text-[12px] text-[#8A94A6]">
              {activeQuery ? `No ${meta.label.toLowerCase()} found for “${activeQuery}”.` : "Nothing featured right now."}
            </p>
            {activeQuery ? (
              <button
                type="button"
                onClick={() => {
                  setActiveQuery("");
                  setQuery("");
                  setRefreshKey((current) => current + 1);
                }}
                className="mt-3 text-[10px] font-medium text-[#38C8E0] hover:text-[#6BDDF8]"
              >
                Back to featured
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[10px] text-[#64748B]">
                {activeQuery ? (
                  <>
                    Results for <span className="text-[#CBD5E1]">“{activeQuery}”</span>
                  </>
                ) : (
                  <>Featured in {meta.label}</>
                )}{" "}
                · {results.length} shown
              </p>
              <button
                type="button"
                onClick={() => setLocation("/settings?tab=favorites")}
                className="text-[10px] font-medium text-[#38C8E0] hover:text-[#6BDDF8]"
              >
                Add to favorites
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {results.map((item) => (
                <CatalogCard key={`${item.category}-${item.id}`} item={item} />
              ))}
            </div>

            {hasNextPage ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-[#2A3341] px-4 py-2 text-[11px] text-[#CBD5E1] transition-colors hover:border-[#38C8E0]/50 disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Load more {meta.label.toLowerCase()}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
