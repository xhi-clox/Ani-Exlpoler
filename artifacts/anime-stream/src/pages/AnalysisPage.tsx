import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "wouter";
import { ArrowUp, MessageSquare, ChevronLeft, Loader2, ExternalLink } from "lucide-react";
import { getAnalysis, upvoteAnalysis, removeUpvote } from "../api/analyses";
import { getComments, createComment, upvoteComment, removeCommentUpvote } from "../api/comments";
import { getAnimeInfo } from "../api/anime";
import { useAuth } from "../hooks/useAuth";
import { formatDate, pluralize, ANALYSIS_TYPE_LABELS } from "../utils/formatting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Analysis, CommentThread, Comment as CommentEntry } from "../types";
import type { AnimeInfo } from "../api/anime";

function AnalysisSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 overflow-x-hidden">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-10 w-3/4" />
      <div className="flex gap-4">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function ReplyItem({
  reply,
  user,
  replyTo,
  replyText,
  setReplyTo,
  setReplyText,
  submitting,
  handleReply,
  onUpvote,
  onRemoveUpvote,
}: {
  reply: CommentEntry;
  user: ReturnType<typeof useAuth>["user"];
  replyTo: string | null;
  replyText: string;
  setReplyTo: (id: string | null) => void;
  setReplyText: (text: string) => void;
  submitting: boolean;
  handleReply: (parentId: string) => void;
  onUpvote: (id: string) => Promise<{ upvoteCount: number }>;
  onRemoveUpvote: (id: string) => Promise<{ upvoteCount: number }>;
}) {
  const [upvoting, setUpvoting] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(reply.upvoteCount);
  const [userUpvoted, setUserUpvoted] = useState(reply.userUpvoted || false);

  useEffect(() => {
    setUpvoteCount(reply.upvoteCount);
    setUserUpvoted(reply.userUpvoted || false);
  }, [reply.upvoteCount, reply.userUpvoted]);

  const handleUpvoteToggle = async () => {
    if (!user || upvoting) return;
    setUpvoting(true);
    try {
      if (userUpvoted) {
        const res = await onRemoveUpvote(reply.id);
        setUpvoteCount(res.upvoteCount);
        setUserUpvoted(false);
      } else {
        const res = await onUpvote(reply.id);
        setUpvoteCount(res.upvoteCount);
        setUserUpvoted(true);
      }
    } catch {} finally {
      setUpvoting(false);
    }
  };

  return (
    <div>
      <div className="flex gap-3 max-w-full">
        <Avatar className="w-7 h-7 shrink-0">
          <AvatarFallback className="text-[10px] bg-secondary">
            {reply.author.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-0.5">
            <Link
              href={`/users/${reply.author.username}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {reply.author.username}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatDate(reply.createdAt)}
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed break-words" style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word" }}>
            {reply.content}
          </p>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <button
              onClick={handleUpvoteToggle}
              disabled={!user || upvoting}
              className={`inline-flex items-center gap-1 hover:text-primary transition-colors ${userUpvoted ? "text-primary" : ""}`}
            >
              <ArrowUp className={`w-3 h-3 ${userUpvoted ? "" : "text-muted-foreground"}`} />
              {upvoteCount}
            </button>
            {user && (
              <button
                onClick={() => setReplyTo(replyTo === reply.id ? null : reply.id)}
                className="hover:text-primary transition-colors"
              >
                {replyTo === reply.id ? "Cancel" : "Reply"}
              </button>
            )}
          </div>
        </div>
      </div>
      {replyTo === reply.id && user && (
        <div className="ml-11 mt-3 space-y-2 max-w-full">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Write a reply..."
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => handleReply(reply.id)}
              disabled={submitting || !replyText.trim()}
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Reply"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  user,
  replyTo,
  replyText,
  setReplyTo,
  setReplyText,
  submitting,
  handleReply,
  onUpvote,
  onRemoveUpvote,
}: {
  comment: CommentThread;
  user: ReturnType<typeof useAuth>["user"];
  replyTo: string | null;
  replyText: string;
  setReplyTo: (id: string | null) => void;
  setReplyText: (text: string) => void;
  submitting: boolean;
  handleReply: (parentId: string) => void;
  onUpvote: (id: string) => Promise<{ upvoteCount: number }>;
  onRemoveUpvote: (id: string) => Promise<{ upvoteCount: number }>;
}) {
  const [upvoting, setUpvoting] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(comment.upvoteCount);
  const [userUpvoted, setUserUpvoted] = useState(comment.userUpvoted || false);

  useEffect(() => {
    setUpvoteCount(comment.upvoteCount);
    setUserUpvoted(comment.userUpvoted || false);
  }, [comment.upvoteCount, comment.userUpvoted]);

  const handleUpvoteToggle = async () => {
    if (!user || upvoting) return;
    setUpvoting(true);
    try {
      if (userUpvoted) {
        const res = await onRemoveUpvote(comment.id);
        setUpvoteCount(res.upvoteCount);
        setUserUpvoted(false);
      } else {
        const res = await onUpvote(comment.id);
        setUpvoteCount(res.upvoteCount);
        setUserUpvoted(true);
      }
    } catch {} finally {
      setUpvoting(false);
    }
  };

  return (
    <div className="max-w-full">
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="text-xs bg-secondary">
            {comment.author.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
            <Link
              href={`/users/${comment.author.username}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {comment.author.username}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-foreground leading-relaxed break-words" style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word" }}>
            {comment.content}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <button
              onClick={handleUpvoteToggle}
              disabled={!user || upvoting}
              className={`inline-flex items-center gap-1 hover:text-primary transition-colors ${userUpvoted ? "text-primary" : ""}`}
            >
              <ArrowUp className={`w-3 h-3 ${userUpvoted ? "" : "text-muted-foreground"}`} />
              {upvoteCount}
            </button>
            {user && (
              <button
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="hover:text-primary transition-colors"
              >
                {replyTo === comment.id ? "Cancel" : "Reply"}
              </button>
            )}
          </div>
        </div>
      </div>

      {replyTo === comment.id && user && (
        <div className="ml-11 mt-3 space-y-2 max-w-full">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Write a reply..."
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => handleReply(comment.id)}
              disabled={submitting || !replyText.trim()}
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Reply"
              )}
            </Button>
          </div>
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="ml-4 sm:ml-11 mt-3 space-y-3 border-l-2 border-border pl-3 sm:pl-4 max-w-full">
          {comment.replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} user={user} replyTo={replyTo} replyText={replyText} setReplyTo={setReplyTo} setReplyText={setReplyText} submitting={submitting} handleReply={handleReply} onUpvote={onUpvote} onRemoveUpvote={onRemoveUpvote} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [comments, setComments] = useState<CommentThread[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [anime, setAnime] = useState<AnimeInfo | null>(null);
  const { user } = useAuth();

  const loadComments = useCallback(async (analysisId: string) => {
    const response = await getComments(analysisId);
    setComments(response.results);
    setCommentsTotal(response.total);
    return response;
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getAnalysis(id), loadComments(id)])
      .then(([a]) => {
        setAnalysis(a);
        getAnimeInfo(Number(a.animeId)).then(setAnime).catch(() => {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, loadComments]);

  const handleUpvote = async () => {
    if (!analysis || !user || upvoting) return;
    setUpvoting(true);
    try {
      if (analysis.userUpvoted) {
        const res = await removeUpvote(analysis.id);
        setAnalysis({ ...analysis, upvoteCount: res.upvoteCount, userUpvoted: false });
      } else {
        const res = await upvoteAnalysis(analysis.id);
        setAnalysis({ ...analysis, upvoteCount: res.upvoteCount, userUpvoted: true });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpvoting(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await createComment(id, commentText);
      setCommentText("");
      await loadComments(id);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!id || !user || !replyText.trim()) return;
    setSubmitting(true);
    try {
      await createComment(id, replyText, parentId);
      setReplyText("");
      setReplyTo(null);
      await loadComments(id);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <AnalysisSkeleton />;
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-semibold text-foreground">Analysis not found</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This analysis may have been removed or doesn't exist.
        </p>
        <Link href="/analyses" className="mt-4">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            Browse analyses
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Go back
        </button>
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium tracking-wide uppercase rounded-full">
          {ANALYSIS_TYPE_LABELS[analysis.analysisType] || analysis.analysisType}
        </Badge>
      </div>

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight mb-4 break-words">
        {analysis.title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-sm text-muted-foreground">
        {analysis.author && (
          <Link
            href={`/users/${analysis.author.username}`}
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-xs bg-secondary">
                {analysis.author.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{analysis.author.username}</span>
          </Link>
        )}
        <span>{formatDate(analysis.createdAt)}</span>
        <span>{pluralize(analysis.viewCount, "view")}</span>
      </div>

      {anime && (
        <Link
          href={`/anime/${analysis.animeId}`}
          className="flex items-center gap-3 mb-6 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors max-w-full"
        >
          {anime.image && (
            <img
              src={anime.image}
              alt={anime.title}
              className="w-10 h-14 object-cover rounded shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{anime.title}</p>
            <p className="text-xs text-muted-foreground">View anime page</p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 ml-auto" />
        </Link>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-3 sm:gap-4">
        <Button
          onClick={handleUpvote}
          disabled={!user || upvoting}
          variant={analysis.userUpvoted ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
        >
          <ArrowUp className={`w-4 h-4 ${analysis.userUpvoted ? "" : "text-muted-foreground"}`} />
          {analysis.upvoteCount}
        </Button>
        {!user && (
          <span className="text-xs text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">Sign in</Link> to upvote
          </span>
        )}
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" asChild>
          <a href="#comments">
            <MessageSquare className="w-4 h-4" />
            {pluralize(commentsTotal, "comment")}
          </a>
        </Button>
      </div>

      <Separator className="mb-8" />

      <div className="prose prose-sm mb-12 max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-a:text-primary prose-code:text-foreground prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:bg-card prose-pre:border prose-pre:border-border prose-table:block prose-table:overflow-x-auto leading-relaxed break-words">
        <div className="text-foreground px-2 sm:px-0" style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word" }}>
        {analysis.content}
        </div>
      </div>

      <Separator className="mb-8" />

      <div id="comments">
        <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {pluralize(commentsTotal, "comment")}
        </h2>

        {user && (
          <form onSubmit={handleComment} className="mb-8">
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 mt-1 shrink-0">
                <AvatarFallback className="text-xs bg-secondary">
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
                <div className="flex-1 min-w-0 space-y-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  placeholder="Share your thoughts..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-muted-foreground break-words">
                    {commentText ? `${commentText.length} characters` : ""}
                  </span>
                  <Button type="submit" size="sm" className="w-full sm:w-auto self-start sm:self-auto" disabled={submitting || commentText.length === 0}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      "Post Comment"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}

        {loading && (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <CommentSkeleton key={i} />
            ))}
          </div>
        )}

        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              user={user}
              replyTo={replyTo}
              replyText={replyText}
              setReplyTo={setReplyTo}
              setReplyText={setReplyText}
              submitting={submitting}
              handleReply={handleReply}
              onUpvote={upvoteComment}
              onRemoveUpvote={removeCommentUpvote}
            />
          ))}
          {comments.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No comments yet. Start the discussion!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
