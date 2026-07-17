import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Search, X, Loader2, Eye, Edit3, Save } from "lucide-react";
import { createAnalysis } from "../api/analyses";
import { searchAnime } from "../api/anime";
import { useAuth } from "../hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnimeResult } from "../api/anime";

const ANALYSIS_TYPES = [
  { value: "character_breakdown", label: "Character Breakdown" },
  { value: "thematic_essay", label: "Thematic Essay" },
  { value: "symbolism", label: "Symbolism Analysis" },
  { value: "adaptation_critique", label: "Adaptation Critique" },
  { value: "cultural_context", label: "Cultural Context" },
  { value: "episode_breakdown", label: "Episode Breakdown" },
  { value: "other", label: "Other" },
];

const CONTENT_MIN = 200;
const CONTENT_MAX = 10000;
const TITLE_MAX = 200;

export default function WriteAnalysis() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [analysisType, setAnalysisType] = useState("thematic_essay");
  const [animeQuery, setAnimeQuery] = useState("");
  const [animeResults, setAnimeResults] = useState<AnimeResult[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<AnimeResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const contentPercent = Math.min((content.length / CONTENT_MIN) * 100, 100);
  const contentValid = content.length >= CONTENT_MIN;
  const titleValid = title.length >= 10;

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const savedDraft = localStorage.getItem("interpret_draft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setTitle(draft.title || "");
        setContent(draft.content || "");
        setAnalysisType(draft.analysisType || "thematic_essay");
        if (draft.anime) setSelectedAnime(draft.anime);
      } catch {}
    }
  }, [user]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const draft = { title, content, analysisType, anime: selectedAnime };
      localStorage.setItem("interpret_draft", JSON.stringify(draft));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, content, analysisType, selectedAnime]);

  useEffect(() => {
    if (!animeQuery || animeQuery.length < 2) { setAnimeResults([]); return; }
    clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchAnime(animeQuery);
        setAnimeResults(res.results.slice(0, 8));
        setShowResults(true);
      } catch {
        setAnimeResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [animeQuery]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedAnime) { setError("Please select an anime"); return; }
    if (!titleValid) { setError("Title must be at least 10 characters"); return; }
    if (!contentValid) { setError(`Content must be at least ${CONTENT_MIN} characters`); return; }
    if (content.length > CONTENT_MAX) { setError(`Content must be less than ${CONTENT_MAX.toLocaleString()} characters`); return; }

    setSubmitting(true);
    try {
      const result = await createAnalysis({
        anime_id: parseInt(selectedAnime.id.replace(/^al/, "")),
        title,
        content,
        analysis_type: analysisType,
      });
      localStorage.removeItem("interpret_draft");
      navigate(`/analyses/${result.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create analysis");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full lg:w-[70%] mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Write Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share your in-depth thoughts with the community
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Save className="w-3 h-3" />
              Saved
            </span>
          )}
          <Badge variant="outline" className="text-xs gap-1">
            <Edit3 className="w-3 h-3" />
            Draft
          </Badge>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl mb-6 text-sm flex items-start gap-2">
          <span className="font-medium">Error:</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Anime</h2>

          <div ref={searchRef}>
            {selectedAnime ? (
              <div className="flex items-center gap-3 border border-border rounded-lg bg-background p-3">
                {selectedAnime.image && (
                  <img
                    src={selectedAnime.image}
                    alt=""
                    className="w-10 h-14 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-card-foreground truncate">
                    {selectedAnime.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedAnime.releaseDate} &middot; {selectedAnime.type}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedAnime(null); setAnimeQuery(""); }}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={animeQuery}
                    onChange={(e) => setAnimeQuery(e.target.value)}
                    placeholder="Search anime..."
                    className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {showResults && animeResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {animeResults.map((anime) => (
                      <button
                        key={anime.id}
                        type="button"
                        onClick={() => { setSelectedAnime(anime); setShowResults(false); setAnimeQuery(""); }}
                        className="flex items-center gap-3 w-full p-3 hover:bg-secondary text-left transition-colors"
                      >
                        {anime.image && (
                          <img src={anime.image} alt="" className="w-8 h-12 object-cover rounded" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">
                            {anime.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {anime.releaseDate} &middot; {anime.type}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showResults && animeQuery.length >= 2 && animeResults.length === 0 && !searching && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
                    No anime found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Details</h2>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Analysis Type</label>
            <Select value={analysisType} onValueChange={setAnalysisType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYSIS_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-foreground">Title</label>
              <span className={`text-xs ${title.length > TITLE_MAX * 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="Analysis title..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
            {title.length > 0 && title.length < 10 && (
              <p className="text-xs text-muted-foreground mt-1">
                {10 - title.length} more characters needed
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Content</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-1.5"
            >
              {showPreview ? (
                <Edit3 className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {showPreview ? "Edit" : "Preview"}
            </Button>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                contentValid
                  ? "bg-primary"
                  : content.length > 0
                    ? "bg-amber-500"
                    : "bg-secondary"
              }`}
              style={{ width: `${Math.min(contentPercent, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {content.length === 0
                ? `Minimum ${CONTENT_MIN.toLocaleString()} characters`
                : content.length < CONTENT_MIN
                  ? `${(CONTENT_MIN - content.length).toLocaleString()} more needed`
                  : `${content.length.toLocaleString()} characters`}
            </span>
            <span className={content.length > CONTENT_MAX ? "text-destructive font-medium" : "text-muted-foreground"}>
              {content.length > CONTENT_MAX
                ? `Exceeded by ${(content.length - CONTENT_MAX).toLocaleString()}`
                : `${CONTENT_MAX.toLocaleString()} max`}
            </span>
          </div>

          {showPreview ? (
            <div className="min-h-[320px] border border-border rounded-lg p-4 bg-background text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
              {content || <span className="text-muted-foreground italic">Nothing to preview yet...</span>}
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              placeholder="Write your analysis here... Share your insights, arguments, and observations."
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground resize-y outline-none focus:ring-2 focus:ring-primary/30 min-h-[320px]"
            />
          )}
        </div>

        <Separator />

        <div className="flex items-center gap-3 justify-end flex-wrap">
          {selectedAnime && titleValid && contentValid && (
            <span className="text-xs text-muted-foreground mr-auto">
              Ready to publish
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/analyses")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="min-w-[140px]">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish Analysis"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
