export function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function truncate(text: string, max = 200): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural || singular + "s"}`;
}

export const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  character_breakdown: "Character Breakdown",
  thematic_essay: "Thematic Essay",
  symbolism: "Symbolism Analysis",
  adaptation_critique: "Adaptation Critique",
  cultural_context: "Cultural Context",
  episode_breakdown: "Episode Breakdown",
  other: "Other",
};
