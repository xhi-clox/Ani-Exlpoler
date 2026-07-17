import { apiRequest } from "./client";
import type { Comment, CommentListResponse } from "../types";

export function getComments(analysisId: string, page = 1): Promise<CommentListResponse> {
  return apiRequest(`/analyses/${analysisId}/comments?page=${page}`);
}

export function createComment(analysisId: string, content: string, parentCommentId?: string): Promise<Comment> {
  return apiRequest(`/analyses/${analysisId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content, parent_comment_id: parentCommentId }),
  });
}

export function updateComment(id: string, content: string): Promise<void> {
  return apiRequest(`/comments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export function deleteComment(id: string): Promise<void> {
  return apiRequest(`/comments/${id}`, { method: "DELETE" });
}

export function upvoteComment(id: string): Promise<{ upvoteCount: number }> {
  return apiRequest(`/comments/${id}/upvote`, { method: "POST" });
}

export function removeCommentUpvote(id: string): Promise<{ upvoteCount: number }> {
  return apiRequest(`/comments/${id}/upvote`, { method: "DELETE" });
}
