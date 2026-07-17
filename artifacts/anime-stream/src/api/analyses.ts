import { apiRequest } from "./client";
import type { Analysis, AnalysisListResponse } from "../types";

export function listAnalyses(params: {
  page?: number;
  sort?: string;
  anime_id?: string;
  author?: string;
  analysis_type?: string;
}): Promise<AnalysisListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.sort) qs.set("sort", params.sort);
  if (params.anime_id) qs.set("anime_id", params.anime_id);
  if (params.author) qs.set("author", params.author);
  if (params.analysis_type) qs.set("analysis_type", params.analysis_type);
  const q = qs.toString();
  return apiRequest(`/analyses${q ? `?${q}` : ""}`);
}

export function getAnalysis(id: string): Promise<Analysis> {
  return apiRequest(`/analyses/${id}`);
}

export function createAnalysis(data: {
  anime_id: number;
  title: string;
  content: string;
  analysis_type: string;
}): Promise<Analysis> {
  return apiRequest("/analyses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAnalysis(id: string, data: Partial<{ title: string; content: string; analysis_type: string }>): Promise<Analysis> {
  return apiRequest(`/analyses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAnalysis(id: string): Promise<void> {
  return apiRequest(`/analyses/${id}`, { method: "DELETE" });
}

export function upvoteAnalysis(id: string): Promise<{ upvoteCount: number }> {
  return apiRequest(`/analyses/${id}/upvote`, { method: "POST" });
}

export function removeUpvote(id: string): Promise<{ upvoteCount: number }> {
  return apiRequest(`/analyses/${id}/upvote`, { method: "DELETE" });
}
