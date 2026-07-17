import { useState, useEffect, useCallback } from "react";
import { useGetAnimeInfo, getGetAnimeInfoQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Calendar, ListVideo, Star, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EpisodeGrid } from "@/components/EpisodeGrid";
import { getContinueWatching } from "../api/watch";
import type { WatchProgress } from "../types";

export default function AnimeInfo() {
  const { id } = useParams<{ id: string }>();
  const { data: anime, isLoading, isError } = useGetAnimeInfo(id!, { query: { enabled: !!id, queryKey: getGetAnimeInfoQueryKey(id!) } });
  const [progress, setProgress] = useState<WatchProgress | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const data = await getContinueWatching();
      const found = data.results.find((p) => String(p.animeId) === id);
      setProgress(found || null);
    } catch {
      setProgress(null);
    }
  }, [id]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-[40vh] w-full bg-secondary"></div>
        <div className="container mx-auto px-4 -mt-24 relative z-10 flex flex-col md:flex-row gap-8">
          <div className="w-48 md:w-64 aspect-[3/4] bg-secondary rounded-xl shadow-2xl flex-shrink-0 border-4 border-background"></div>
          <div className="flex-1 mt-0 md:mt-28 space-y-4">
            <div className="h-10 bg-secondary rounded w-2/3"></div>
            <div className="h-6 bg-secondary rounded w-1/3"></div>
            <div className="flex gap-2"><div className="h-6 w-16 bg-secondary rounded"></div></div>
            <div className="space-y-2 mt-4">
              <div className="h-4 bg-secondary rounded"></div>
              <div className="h-4 bg-secondary rounded"></div>
              <div className="h-4 bg-secondary rounded w-4/5"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !anime) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2 text-destructive">Error Loading Anime</h2>
        <p className="text-muted-foreground">We couldn't find the anime you're looking for.</p>
        <Button asChild className="mt-6">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-16 sm:pb-20">
      <div className="relative h-[32vh] w-full overflow-hidden bg-secondary sm:h-[40vh] md:h-[50vh]">
        <div className="absolute inset-0 opacity-[0.03] z-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundBlendMode: "overlay" }} />
        {anime.image && (
          <img
            src={anime.image}
            alt="Backdrop"
            className="w-full h-full object-cover blur-md scale-110 opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
      </div>

      <div className="container relative z-20 mx-auto -mt-16 px-4 sm:-mt-24 md:-mt-48">
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          <div className="mx-auto w-full max-w-[220px] shrink-0 sm:max-w-[240px] md:mx-0 md:w-64">
            <div className="aspect-[3/4] overflow-hidden rounded-[22px] border-4 border-background bg-secondary shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              {anime.image && (
                <img src={anime.image} alt={anime.title} className="w-full h-full object-cover" />
              )}
            </div>
          </div>

          <div className="flex-1 rounded-[24px] border border-border/70 bg-card/70 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-sm md:mt-32 md:p-6">
            <h1 className="mb-2 font-display text-3xl font-bold uppercase leading-tight tracking-[0.07em] text-white md:text-5xl">
              {anime.title}
            </h1>

            <div className="mb-6 flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground">
              {anime.type && (
                <span className="flex items-center rounded-md border border-primary/20 bg-primary/12 px-2.5 py-1 text-primary">
                  {anime.type}
                </span>
              )}
              {anime.status && (
                <span className="flex items-center text-white">
                  <Star className="w-4 h-4 mr-1 text-primary" /> {anime.status}
                </span>
              )}
              {anime.releaseDate && (
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" /> {anime.releaseDate}
                </span>
              )}
              {anime.totalEpisodes && (
                <span className="flex items-center">
                  <ListVideo className="w-4 h-4 mr-1" /> {anime.totalEpisodes} Episodes
                </span>
              )}
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {anime.genres?.map(g => (
                <Badge key={g} variant="secondary" className="border border-border/60 bg-secondary/60 hover:bg-secondary">
                  {g}
                </Badge>
              ))}
            </div>

            {progress && (
              <div className="mb-6 rounded-xl border border-primary/20 bg-primary/10 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Continue Watching</p>
                    <p className="text-sm font-medium text-foreground">
                      Episode {progress.currentEpisode}
                      {progress.totalEpisodes && ` of ${progress.totalEpisodes}`}
                    </p>
                  </div>
                  <Button size="sm" className="gap-1.5 self-start sm:self-auto">
                    <Play className="w-4 h-4" />
                    Resume
                  </Button>
                </div>
              </div>
            )}

            <div className="prose prose-invert max-w-none break-words text-muted-foreground">
              <p className="leading-relaxed">
                {anime.description || "No description available for this anime."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 sm:mt-12">
          <EpisodeGrid
            animeId={parseInt(id!)}
            totalEpisodes={anime.totalEpisodes ?? null}
            progress={progress}
            onProgressUpdate={fetchProgress}
          />
        </div>
      </div>
    </div>
  );
}
