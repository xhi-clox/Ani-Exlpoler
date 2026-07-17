import { useState, useEffect } from "react";
import { CheckCircle, Circle, ListVideo, ChevronLeft, ChevronRight } from "lucide-react";
import { StreamingLinks } from "./StreamingLinks";
import { getSources } from "../api/sources";
import { markWatched, unwatch } from "../api/watch";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../api/client";
import type { StreamingSource, WatchProgress } from "../types";

interface JikanEpisode {
  id: number;
  number: number;
  title: string;
  aired: string;
}

interface Episode {
  number: number;
  title: string | null;
  aired: string | null;
}

interface EpisodeGridProps {
  animeId: number;
  totalEpisodes: number | null;
  progress?: WatchProgress | null;
  onProgressUpdate?: () => void;
}

const PAGE_SIZE = 100;

export function EpisodeGrid({ animeId, totalEpisodes, progress, onProgressUpdate }: EpisodeGridProps) {
  const { user } = useAuth();
  const [sourcesMap, setSourcesMap] = useState<Record<number, StreamingSource[]>>({});
  const [loadingSources, setLoadingSources] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [episodeCount, setEpisodeCount] = useState(totalEpisodes);

  useEffect(() => {
    if (totalEpisodes) {
      setEpisodes(Array.from({ length: totalEpisodes }, (_, i) => ({
        number: i + 1,
        title: null,
        aired: null,
      })));
      setEpisodeCount(totalEpisodes);
      return;
    }
    if (totalEpisodes === null) {
      setLoadingEpisodes(true);
      apiRequest<{
        episodes?: JikanEpisode[];
        pagination?: { lastPage: number };
      }>(`/anime/${animeId}/episodes?page=1`)
        .then((data) => {
          if (data.episodes?.length) {
            setEpisodes(data.episodes.map((ep: JikanEpisode) => ({
              number: ep.number,
              title: ep.title,
              aired: ep.aired,
            })));
            setEpisodeCount((data.pagination?.lastPage ?? 0) * PAGE_SIZE || data.episodes.length);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingEpisodes(false));
    }
  }, [animeId, totalEpisodes]);

  useEffect(() => {
    setLoadingSources(true);
    getSources(animeId)
      .then((data) => {
        const map: Record<number, StreamingSource[]> = {};
        for (const s of data.results) {
          if (!map[s.episodeNumber]) map[s.episodeNumber] = [];
          map[s.episodeNumber].push(s);
        }
        setSourcesMap(map);
      })
      .catch(() => {})
      .finally(() => setLoadingSources(false));
  }, [animeId]);

  const watchedEpisodes = new Set<number>();
  if (progress) {
    for (let i = 1; i <= progress.currentEpisode; i++) {
      watchedEpisodes.add(i);
    }
  }

  const handleToggle = async (ep: number) => {
    if (!user) return;
    try {
      if (watchedEpisodes.has(ep)) {
        await unwatch(animeId, ep);
      } else {
        await markWatched(animeId, ep);
      }
      onProgressUpdate?.();
    } catch {}
  };

  if (loadingEpisodes) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Loading episodes...
      </div>
    );
  }

  if (episodes.length === 0 && !totalEpisodes) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Airing anime — episodes will appear as they're released.
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No episode information available.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <ListVideo className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          Episodes
          {episodeCount && <span className="text-muted-foreground font-normal ml-1">({episodeCount})</span>}
        </h2>
        {progress && (
          <span className="text-xs text-muted-foreground ml-auto">
            {progress.currentEpisode} / {episodeCount || "?"}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {episodes.map((ep) => {
          const epSources = sourcesMap[ep.number] || [];
          const watched = watchedEpisodes.has(ep.number);
          return (
            <div
              key={ep.number}
              className={`flex flex-col gap-3 rounded-xl border px-3 py-3 transition-colors sm:flex-row sm:items-center ${
                watched
                  ? "bg-primary/5 border-primary/20"
                  : "bg-card border-border hover:border-primary/30"
              }`}
            >
              <button
                onClick={() => handleToggle(ep.number)}
                className={`shrink-0 transition-colors ${
                  user ? "cursor-pointer hover:text-primary" : "cursor-default"
                } ${watched ? "text-primary" : "text-muted-foreground/40"}`}
                title={user ? (watched ? "Mark unwatched" : "Mark watched") : "Sign in to track"}
              >
                {watched ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </button>
              <span className="min-w-[3rem] text-sm font-medium text-card-foreground">
                EP {ep.number}
              </span>
              <div className="min-w-0 flex-1">
                {ep.title && (
                  <span className="line-clamp-2 text-xs text-muted-foreground sm:line-clamp-1">
                    {ep.title}
                  </span>
                )}
              </div>
              <div className="w-full sm:ml-auto sm:w-auto">
                {loadingSources ? (
                  <span className="text-[10px] text-muted-foreground">loading links...</span>
                ) : (
                  <StreamingLinks sources={epSources} animeId={animeId} episodeNumber={ep.number} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
