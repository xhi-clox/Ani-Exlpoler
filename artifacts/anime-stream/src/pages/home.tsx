import { useState, useEffect } from "react";
import { useGetTrending, useGetRecent, useGetUpcoming } from "@workspace/api-client-react";
import { AnimeCard, AnimeCardSkeleton } from "@/components/anime-card";
import { TrendingUp, Clock, Calendar, Play } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { getContinueWatching } from "../api/watch";
import { WatchProgressBar } from "@/components/WatchProgressBar";
import { useAuth } from "../hooks/useAuth";
import type { WatchProgress } from "../types";

export default function Home() {
  const { user } = useAuth();
  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([]);
  const { data: trendingData, isLoading: isLoadingTrending } = useGetTrending({ page: 1 });
  const { data: recentData, isLoading: isLoadingRecent } = useGetRecent({ page: 1 });
  const { data: upcomingData, isLoading: isLoadingUpcoming } = useGetUpcoming({ page: 1 });

  useEffect(() => {
    if (!user) return;
    getContinueWatching()
      .then((data) => setContinueWatching(data.results))
      .catch(() => {});
  }, [user]);

  function dedupe<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  const trending = dedupe(trendingData?.results ?? []).slice(0, 10);
  const trendingIds = new Set(trending.map((a) => a.id));
  const recent = dedupe(recentData?.results ?? []).filter((a) => !trendingIds.has(a.id)).slice(0, 15);
  const recentIds = new Set([...trendingIds, ...recent.map((a) => a.id)]);
  const upcoming = dedupe(upcomingData?.results ?? []).filter((a) => !recentIds.has(a.id)).slice(0, 15);

  return (
    <div className="pb-16">
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden mb-12">
        <div className="absolute inset-0 bg-secondary">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundBlendMode: "overlay" }} />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-white mb-4">
            Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">anime</span>.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 font-light">
            Browse trending, seasonal, and upcoming anime. Stay up to date with the latest releases.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 space-y-16">
        {/* Continue Watching */}
        {user && continueWatching.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Play className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-display font-semibold">Continue Watching</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {continueWatching.map((p) => (
                <Link key={p.animeId} href={`/anime/${p.animeId}`} className="block">
                  <div className="border border-border rounded-xl p-4 bg-card hover:border-primary/50 hover:shadow-md transition-all h-full">
                    <div className="flex items-center justify-center h-24 bg-secondary rounded-lg mb-3">
                      <Play className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-card-foreground truncate mb-2">
                      Anime #{p.animeId}
                    </p>
                    <WatchProgressBar current={p.currentEpisode} total={p.totalEpisodes} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Trending Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-display font-semibold">Trending Now</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {isLoadingTrending ? (
              Array.from({ length: 10 }).map((_, i) => <AnimeCardSkeleton key={i} />)
            ) : (
              trending.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))
            )}
          </div>
        </section>

        {/* Current Season */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-display font-semibold">Current Season</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {isLoadingRecent ? (
              Array.from({ length: 10 }).map((_, i) => <AnimeCardSkeleton key={i} />)
            ) : (
              recent.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))
            )}
          </div>
        </section>

        {/* Upcoming Season */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-display font-semibold">Upcoming</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {isLoadingUpcoming ? (
              Array.from({ length: 10 }).map((_, i) => <AnimeCardSkeleton key={i} />)
            ) : (
              upcoming.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
