import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUp, MessageSquare, User, Plus, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { upvoteAnalysis, removeUpvote } from "../api/analyses";
import { followUser, unfollowUser } from "../api/users";
import { ANALYSIS_TYPE_LABELS, formatDate, pluralize } from "../utils/formatting";
import type { Analysis } from "../types";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface AnalysisCardProps {
  analysis: Analysis;
  showAuthorActions?: boolean;
}

export function AnalysisCard({ analysis, showAuthorActions = true }: AnalysisCardProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [upvoting, setUpvoting] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(analysis.upvoteCount);
  const [userUpvoted, setUserUpvoted] = useState(analysis.userUpvoted || false);
  const [followingAuthor, setFollowingAuthor] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || upvoting) return;
    setUpvoting(true);
    try {
      if (userUpvoted) {
        const res = await removeUpvote(analysis.id);
        setUpvoteCount(res.upvoteCount);
        setUserUpvoted(false);
      } else {
        const res = await upvoteAnalysis(analysis.id);
        setUpvoteCount(res.upvoteCount);
        setUserUpvoted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpvoting(false);
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !analysis.author || followingLoading) return;
    setFollowingLoading(true);
    try {
      if (followingAuthor) {
        await unfollowUser(analysis.author.username);
        setFollowingAuthor(false);
      } else {
        await followUser(analysis.author.username);
        setFollowingAuthor(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleReadMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/analyses/${analysis.id}`);
  };

  const handleCardClick = () => {
    setLocation(`/analyses/${analysis.id}`);
  };

  const contentPreview =
    analysis.content && analysis.content.length > 300
      ? analysis.content.slice(0, 300) + "..."
      : analysis.content;

  return (
    <div
      className="border border-[#232A38] rounded-[10px] bg-[#11151D] overflow-hidden cursor-pointer hover:border-[#313A4C] transition-all"
      onClick={handleCardClick}
    >
      {/* Header - Author Info */}
      {analysis.author && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#232A38]">
          <Link href={`/users/${analysis.author.username}`} onClick={(e) => e.stopPropagation()}>
            <Avatar className="h-8 w-8">
              {analysis.author.avatarUrl ? (
                <img src={analysis.author.avatarUrl} alt={analysis.author.username} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-[#1B212D] text-[#EEF1F7]">
                  {analysis.author.username[0].toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/users/${analysis.author.username}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-semibold text-[#EEF1F7] hover:text-[#4CD3F0] transition-colors truncate"
              >
                {analysis.author.username}
              </Link>
              <span className="text-xs text-[#8A93A8]">•</span>
              <span className="text-xs text-[#8A93A8]">{formatDate(analysis.createdAt)}</span>
            </div>
          </div>
          {showAuthorActions && user && user.username !== analysis.author.username && (
            <Button
              variant={followingAuthor ? "default" : "outline"}
              size="sm"
              onClick={handleFollow}
              disabled={followingLoading}
              className="h-7 px-3 text-xs"
            >
              {followingAuthor ? <Check className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
              {followingAuthor ? "Following" : "Follow"}
            </Button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Type Badge */}
        <Badge variant="secondary" className="mb-3 text-xs">
          {ANALYSIS_TYPE_LABELS[analysis.analysisType] || analysis.analysisType}
        </Badge>

        {/* Title */}
        <h3 className="text-lg font-bold text-[#EEF1F7] mb-2 leading-tight">
          {analysis.title}
        </h3>

        {/* Content Preview */}
        {contentPreview && (
          <p className="text-sm text-[#8A93A8] leading-relaxed mb-4 whitespace-pre-wrap">
            {contentPreview}
          </p>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleUpvote}
              disabled={!user || upvoting}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                userUpvoted ? "text-[#4CD3F0]" : "text-[#8A93A8] hover:text-[#4CD3F0]"
              }`}
            >
              <ArrowUp className="h-4 w-4" />
              <span>{upvoteCount}</span>
            </button>

            <button
              onClick={handleReadMore}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#8A93A8] hover:text-[#4CD3F0] transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Comments</span>
            </button>

            <span className="text-xs text-[#8A93A8]">
              {pluralize(analysis.viewCount, "view")}
            </span>
          </div>

          {analysis.content && analysis.content.length > 300 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReadMore}
              className="text-xs text-[#4CD3F0] hover:text-[#6BDDF8] hover:bg-[#161B25] px-2 h-7"
            >
              Read more
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
