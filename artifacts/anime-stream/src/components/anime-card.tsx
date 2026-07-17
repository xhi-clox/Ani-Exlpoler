import { Link } from "wouter";
import { AnimeResult } from "@workspace/api-client-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export function AnimeCard({ anime }: { anime: AnimeResult }) {
  return (
    <Link href={`/anime/${anime.id}`} className="group block h-full">
      <div className="relative overflow-hidden rounded-[18px] border border-border/80 bg-card shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-[0_22px_50px_rgba(0,0,0,0.32)]">
        <AspectRatio ratio={3/4}>
          {anime.image ? (
            <img 
              src={anime.image} 
              alt={anime.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
        </AspectRatio>
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D12] via-[#0A0D12]/20 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-85" />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {anime.type && (
            <span className="rounded-md border border-primary/30 bg-background/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary shadow-sm backdrop-blur-md">
              {anime.type}
            </span>
          )}
        </div>
      </div>
      
      <div className="mt-3 px-1">
        <h3 className="line-clamp-2 font-display text-sm font-semibold uppercase tracking-[0.06em] leading-tight text-foreground transition-colors group-hover:text-primary sm:text-base">
          {anime.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {anime.releaseDate && <span>{anime.releaseDate}</span>}
          {anime.totalEpisodes && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span>{anime.totalEpisodes} EPS</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="w-full aspect-[3/4] bg-secondary rounded-lg mb-3"></div>
      <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-secondary rounded w-1/2"></div>
    </div>
  );
}
