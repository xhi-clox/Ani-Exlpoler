import { Request, Response } from "express";
import { query } from "../db/pool";

export async function listSources(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const episode = req.query.episode ? parseInt(req.query.episode as string) : undefined;
  try {
    let sql = "SELECT id, anime_id, episode_number, site_name, site_url, language, quality, is_active FROM streaming_sources WHERE anime_id = $1";
    const params: unknown[] = [id];
    if (episode !== undefined) {
      sql += " AND episode_number = $2";
      params.push(episode);
    }
    sql += " ORDER BY site_name, episode_number";
    const result = await query(sql, params);
    res.json({ results: result.rows });
  } catch (err) {
    req.log.error({ err }, "Failed to list sources");
    res.status(500).json({ error: "Failed to list sources" });
  }
}

export async function submitSource(req: Request, res: Response): Promise<void> {
  const { anime_id, episode_number, site_name, site_url, language, quality } = req.body;
  if (!anime_id || !site_name || !site_url) {
    res.status(400).json({ error: "anime_id, site_name, and site_url are required" });
    return;
  }
  try {
    const result = await query(
      `INSERT INTO streaming_sources (anime_id, episode_number, site_name, site_url, language, quality, submitted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (anime_id, episode_number, site_url)
       DO UPDATE SET site_name = EXCLUDED.site_name, language = EXCLUDED.language, quality = EXCLUDED.quality, submitted_by = EXCLUDED.submitted_by
       RETURNING id, anime_id, episode_number, site_name, site_url, language, quality, is_active`,
      [anime_id, episode_number || 0, site_name, site_url, language || "sub", quality || "hd", req.user?.userId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to submit source");
    res.status(500).json({ error: "Failed to submit source" });
  }
}

export async function reportSource(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { report_type, notes } = req.body;
  if (!report_type) {
    res.status(400).json({ error: "report_type is required (dead, wrong_episode, wrong_anime, other)" });
    return;
  }
  try {
    await query(
      `INSERT INTO link_reports (source_id, user_id, report_type, notes) VALUES ($1, $2, $3, $4)`,
      [id, req.user?.userId || null, report_type, notes || ""]
    );
    res.status(201).json({ message: "Report submitted" });
  } catch (err) {
    req.log.error({ err }, "Failed to report source");
    res.status(500).json({ error: "Failed to report source" });
  }
}
