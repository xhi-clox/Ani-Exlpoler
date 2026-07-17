import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Clock, ExternalLink, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getWatchHistory, unwatch } from "../api/watch";
import { formatDate } from "../utils/formatting";
import type { WatchEntry } from "../types";

export default function WatchHistory() {
  const [history, setHistory] = useState<WatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    getWatchHistory()
      .then((data) => setHistory(data.results))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? history.filter((h) => String(h.animeId).includes(search))
    : history;

  const handleRemove = async (animeId: number, episode: number) => {
    try {
      await unwatch(animeId, episode);
      setHistory((prev) => prev.filter((h) => !(h.animeId === animeId && h.episodeNumber === episode)));
    } catch {}
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-8 rounded-[22px] border border-border/80 bg-card/80 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.2)] backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              Resume Faster
            </p>
            <h1 className="font-display text-2xl font-bold uppercase tracking-[0.08em] text-foreground sm:text-3xl">Watch History</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Episodes you&apos;ve watched across all anime
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by anime ID..."
              className="border-border/80 bg-secondary/80 pl-9"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-xl">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No watch history yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Start watching anime and your history will show up here.
          </p>
          <Link href="/">
            <Button variant="outline" size="sm" className="mt-4">
              Browse Anime
            </Button>
          </Link>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={`${entry.animeId}-${entry.episodeNumber}`}
              className="flex flex-col gap-3 rounded-[18px] border border-border/80 bg-card/85 p-3 transition-colors hover:border-primary/30 sm:flex-row sm:items-center"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <span className="text-sm font-bold text-muted-foreground">
                  {entry.animeId}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/anime/${entry.animeId}`}
                  className="text-sm font-medium text-card-foreground transition-colors hover:text-primary"
                >
                  Anime #{entry.animeId} &middot; Episode {entry.episodeNumber}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatDate(entry.watchedAt)}
                  {entry.siteName && ` via ${entry.siteName}`}
                </p>
              </div>
              <div className="flex items-center gap-1 self-end sm:self-auto">
                {entry.siteUrl && (
                  <a
                    href={entry.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => handleRemove(entry.animeId, entry.episodeNumber)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
