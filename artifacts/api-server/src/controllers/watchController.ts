import { Request, Response } from "express";
import { query } from "../db/pool";

export async function getHistory(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    const result = await query(
      `SELECT wh.anime_id, wh.episode_number, wh.watched_at,
              ss.site_name, ss.site_url
       FROM watch_history wh
       LEFT JOIN streaming_sources ss ON wh.source_id = ss.id
       WHERE wh.user_id = $1
       ORDER BY wh.watched_at DESC
       LIMIT 100`,
      [req.user.userId]
    );
    res.json({ results: result.rows });
  } catch (err) {
    req.log.error({ err }, "Failed to get watch history");
    res.status(500).json({ error: "Failed to get watch history" });
  }
}

export async function markWatched(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
  const { animeId, episode } = req.params;
  const { source_id } = req.body;
  try {
    await query(
      `INSERT INTO watch_history (user_id, anime_id, episode_number, source_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, anime_id, episode_number)
       DO UPDATE SET watched_at = NOW(), source_id = COALESCE(EXCLUDED.source_id, watch_history.source_id)`,
      [req.user.userId, animeId, episode, source_id || null]
    );
    await query(
      `INSERT INTO watch_progress (user_id, anime_id, current_episode)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, anime_id)
       DO UPDATE SET current_episode = GREATEST(watch_progress.current_episode, $3), updated_at = NOW()`,
      [req.user.userId, animeId, episode]
    );
    res.json({ message: "Marked as watched" });
  } catch (err) {
    req.log.error({ err }, "Failed to mark watched");
    res.status(500).json({ error: "Failed to mark watched" });
  }
}

export async function unwatch(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
  const { animeId, episode } = req.params;
  try {
    await query(
      `DELETE FROM watch_history WHERE user_id = $1 AND anime_id = $2 AND episode_number = $3`,
      [req.user.userId, animeId, episode]
    );
    res.json({ message: "Removed from history" });
  } catch (err) {
    req.log.error({ err }, "Failed to unwatch");
    res.status(500).json({ error: "Failed to unwatch" });
  }
}

export async function getContinueWatching(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    const result = await query(
      `SELECT wp.anime_id, wp.current_episode, wp.total_episodes, wp.completed, wp.updated_at
       FROM watch_progress wp
       WHERE wp.user_id = $1 AND (wp.completed = false OR wp.completed IS NULL)
       ORDER BY wp.updated_at DESC
       LIMIT 20`,
      [req.user.userId]
    );
    res.json({ results: result.rows });
  } catch (err) {
    req.log.error({ err }, "Failed to get continue watching");
    res.status(500).json({ error: "Failed to get continue watching" });
  }
}

export async function updateProgress(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: "Authentication required" }); return; }
  const { animeId } = req.params;
  const { current_episode, total_episodes, completed } = req.body;
  try {
    const result = await query(
      `INSERT INTO watch_progress (user_id, anime_id, current_episode, total_episodes, completed)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, anime_id)
       DO UPDATE SET current_episode = $3, total_episodes = COALESCE($4, watch_progress.total_episodes), completed = COALESCE($5, watch_progress.completed), updated_at = NOW()
       RETURNING id, anime_id, current_episode, total_episodes, completed, updated_at`,
      [req.user.userId, animeId, current_episode || 0, total_episodes || null, completed ?? false]
    );
    res.json(result.rows[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to update progress");
    res.status(500).json({ error: "Failed to update progress" });
  }
}
