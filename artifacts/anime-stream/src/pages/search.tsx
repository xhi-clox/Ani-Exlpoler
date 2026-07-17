import { useSearchAnime, getSearchAnimeQueryKey } from "@workspace/api-client-react";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import { useLocation } from "wouter";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

export default function Search() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const q = searchParams.get("q") || "";
  
  const [localQuery, setLocalQuery] = useState(q);

  const { data, isLoading } = useSearchAnime({ q }, { query: { enabled: !!q, queryKey: getSearchAnimeQueryKey({ q }) } });

  useEffect(() => {
    setLocalQuery(q);
  }, [q]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(localQuery)}`);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mx-auto mt-2 mb-10 max-w-3xl rounded-[20px] border border-border/80 bg-card/80 px-4 py-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur-sm sm:px-6 sm:py-8">
        <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          Discover Faster
        </p>
        <h1 className="mb-6 text-3xl font-display font-bold uppercase tracking-[0.08em] text-foreground sm:text-4xl">
          Search Anime
        </h1>
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Type a title..." 
            className="h-14 w-full rounded-2xl border-border/80 bg-secondary/80 pl-12 text-base shadow-sm focus-visible:ring-primary sm:text-lg"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            autoFocus
          />
        </form>
      </div>

      {!q ? (
        <div className="py-20 text-center text-muted-foreground">
          <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Enter a search term to find your favorite anime.</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-6">
          {Array.from({ length: 10 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
        </div>
      ) : data?.results && data.results.length > 0 ? (
        <div>
          <p className="mb-6 break-words text-sm text-muted-foreground sm:text-base">
            Found {data.results.length} results for <span className="font-medium text-foreground">&quot;{q}&quot;</span>
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-6">
            {data.results.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg break-words">No results found for &quot;{q}&quot;. Try a different term.</p>
        </div>
      )}
    </div>
  );
}
