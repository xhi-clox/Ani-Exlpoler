import { useState, useEffect } from "react";
import { Link } from "wouter";
import { FileText, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { listAnalyses } from "../api/analyses";
import { useAuth } from "../hooks/useAuth";
import { formatDate, pluralize, ANALYSIS_TYPE_LABELS } from "../utils/formatting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnalysisCard } from "../components/AnalysisCard";
import type { Analysis } from "../types";

function AnalysisCardSkeleton() {
  return (
    <div className="border border-[#232A38] rounded-[10px] bg-[#11151D] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#232A38]">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function BrowseAnalyses() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    listAnalyses({ page, sort })
      .then((data) => {
        setAnalyses(data.results);
        setTotalPages(data.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, sort]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:py-8">
      <section className="rounded-[10px] border border-[#232A38] bg-[#11151D] px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.28em] text-[#4CD3F0]">
              Community Feed
            </p>
            <h1 className="font-display text-3xl font-bold uppercase tracking-[0.08em] text-[#EEF1F7] sm:text-4xl">Analyses</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#8A93A8] sm:text-base">
              In-depth community analysis and essays
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[168px] bg-[#161B25] border-[#232A38] text-[#EEF1F7]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-[#11151D] border-[#232A38]">
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="upvotes">Most Upvoted</SelectItem>
              </SelectContent>
            </Select>
            {user && (
              <Link href="/write">
                <Button size="sm" className="w-full gap-1.5 sm:w-auto bg-[#4CD3F0] text-[#04222B] hover:bg-[#6BDDF8]">
                  <FileText className="w-4 h-4" />
                  Write
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <AnalysisCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && analyses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#161B25] flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-[#8A93A8]" />
          </div>
          <h3 className="text-lg font-semibold text-[#EEF1F7] mb-1">No analyses yet</h3>
          <p className="text-sm text-[#8A93A8] max-w-sm">
            Be the first to share your in-depth analysis with the community.
          </p>
          {user && (
            <Link href="/write" className="mt-4">
              <Button size="sm" className="gap-1.5 bg-[#4CD3F0] text-[#04222B] hover:bg-[#6BDDF8]">
                <FileText className="w-4 h-4" />
                Write Analysis
              </Button>
            </Link>
          )}
        </div>
      )}

      {!loading && analyses.length > 0 && (
        <div className="space-y-4">
          {analyses.map((a) => (
            <AnalysisCard key={a.id} analysis={a} showAuthorActions={true} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="gap-1 sm:min-w-24 border-[#232A38] bg-[#11151D] text-[#EEF1F7] hover:bg-[#161B25] hover:border-[#313A4C]"
          >
            <ArrowLeft className="w-4 h-4" />
            Prev
          </Button>
          <div className="flex items-center justify-start gap-1 overflow-x-auto rounded-xl border border-[#232A38] bg-[#11151D] px-2 py-2 sm:justify-center">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                  page === i + 1
                    ? "bg-[#4CD3F0] text-[#04222B]"
                    : "bg-[#161B25] border border-[#232A38] text-[#8A93A8] hover:bg-[#1B212D]"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="gap-1 sm:min-w-24 border-[#232A38] bg-[#11151D] text-[#EEF1F7] hover:bg-[#161B25] hover:border-[#313A4C]"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
