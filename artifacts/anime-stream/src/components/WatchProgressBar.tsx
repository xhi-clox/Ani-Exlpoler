import { cn } from "@/lib/utils";

interface WatchProgressBarProps {
  current: number;
  total: number | null;
  className?: string;
}

export function WatchProgressBar({ current, total, className }: WatchProgressBarProps) {
  const max = total || 100;
  const pct = Math.min((current / max) * 100, 100);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        EP {current}/{total || "?"}
      </p>
    </div>
  );
}
