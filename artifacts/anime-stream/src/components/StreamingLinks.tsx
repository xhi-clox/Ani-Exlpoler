import { useState } from "react";
import { ExternalLink, Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { reportSource, submitSource } from "../api/sources";
import type { StreamingSource } from "../types";

const SITE_ORDER = ["animepahe", "gogoanime", "hianime", "aniwave", "crunchyroll"];
const SITE_COLORS: Record<string, string> = {
  animepahe: "border-primary/35 bg-primary/10 text-primary hover:bg-primary/18",
  gogoanime: "border-accent/35 bg-accent/12 text-accent-foreground hover:bg-accent/20",
  hianime: "border-primary/30 bg-background/80 text-foreground hover:bg-secondary",
  aniwave: "border-accent/35 bg-background/80 text-foreground hover:bg-secondary",
  crunchyroll: "border-primary/35 bg-primary/12 text-primary hover:bg-primary/18",
};

function sortedSources(sources: StreamingSource[]): StreamingSource[] {
  return [...sources].sort((a, b) => {
    const ai = SITE_ORDER.indexOf(a.siteName);
    const bi = SITE_ORDER.indexOf(b.siteName);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function StreamingLinks({ sources, animeId, episodeNumber }: { sources: StreamingSource[]; animeId: number; episodeNumber?: number }) {
  const [showSubmit, setShowSubmit] = useState(false);
  const [showReport, setShowReport] = useState<string | null>(null);
  const [reportType, setReportType] = useState("");
  const [reportNotes, setReportNotes] = useState("");

  const active = sources.filter((s) => s.isActive);
  const inactive = sources.filter((s) => !s.isActive);

  const handleReport = async (sourceId: string) => {
    if (!reportType) return;
    try {
      await reportSource(sourceId, { report_type: reportType as any, notes: reportNotes });
      setShowReport(null);
      setReportType("");
      setReportNotes("");
    } catch {}
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.length === 0 && (
        <span className="text-xs text-muted-foreground">No links available</span>
      )}
      {sortedSources(active).map((source) => (
        <div key={source.id} className="flex items-center gap-0.5">
          <a
            href={source.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${SITE_COLORS[source.siteName] || "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            <ExternalLink className="w-3 h-3" />
            {source.siteName}
          </a>
          <Dialog open={showReport === source.id} onOpenChange={(o) => { setShowReport(o ? source.id : null); setReportType(""); setReportNotes(""); }}>
            <DialogTrigger asChild>
              <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                <Flag className="w-3 h-3" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm">Report Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select issue...</option>
                  <option value="dead">Link is dead</option>
                  <option value="wrong_episode">Wrong episode</option>
                  <option value="wrong_anime">Wrong anime</option>
                  <option value="other">Other</option>
                </select>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowReport(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => handleReport(source.id)} disabled={!reportType}>Submit</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ))}
      {inactive.length > 0 && (
        <Badge variant="outline" className="text-[10px] text-muted-foreground/60 border-dashed">
          {inactive.length} inactive
        </Badge>
      )}
      <Dialog open={showSubmit} onOpenChange={(o) => { setShowSubmit(o); }}>
        <DialogTrigger asChild>
          <button className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
            <Plus className="w-3 h-3" />
            Add link
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Submit a Streaming Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Know a working link? Submit it for community review. It will go live immediately.
            </p>
            <LinkSubmitForm animeId={animeId} episodeNumber={episodeNumber || 0} onDone={() => setShowSubmit(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LinkSubmitForm({ animeId, episodeNumber, onDone }: { animeId: number; episodeNumber: number; onDone: () => void }) {
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName || !siteUrl) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await submitSource({ anime_id: animeId, episode_number: episodeNumber, site_name: siteName, site_url: siteUrl });
      onDone();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit link");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Episode</label>
        <input
          type="number"
          value={episodeNumber}
          readOnly
          className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm bg-secondary text-muted-foreground outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Site Name</label>
        <select
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm bg-card text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          required
        >
          <option value="">Select site...</option>
          <option value="animepahe">Animepahe</option>
          <option value="gogoanime">Gogoanime</option>
          <option value="hianime">HiAnime (Zoro)</option>
          <option value="aniwave">Aniwave (9anime)</option>
          <option value="crunchyroll">Crunchyroll</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">URL</label>
        <input
          type="url"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          placeholder="https://..."
          className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm bg-card text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
          required
        />
      </div>
      {submitError && <p className="text-xs text-destructive">{submitError}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" type="button" onClick={onDone}>Cancel</Button>
        <Button size="sm" type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}
