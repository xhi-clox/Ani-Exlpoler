import { Request, Response } from "express";
import { query } from "../db/pool";

const ANALYSIS_TYPES = [
  "character_breakdown", "thematic_essay", "symbolism",
  "adaptation_critique", "cultural_context", "episode_breakdown", "other",
];

function formatAnalysis(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    animeId: row.anime_id,
    title: row.title,
    content: row.content,
    analysisType: row.analysis_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    viewCount: Number(row.view_count),
    upvoteCount: Number(row.upvote_count),
    author: row.author_username ? {
      username: row.author_username,
      avatarUrl: row.author_avatar_url,
    } : undefined,
  };
}

export async function listAnalyses(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const sort = req.query.sort as string || "recent";
    const animeId = req.query.anime_id as string;
    const author = req.query.author as string;
    const analysisType = req.query.analysis_type as string;

    let where = "";
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (animeId) {
      where += ` AND a.anime_id = $${paramIdx++}`;
      params.push(parseInt(animeId));
    }
    if (author) {
      where += ` AND u.username = $${paramIdx++}`;
      params.push(author);
    }
    if (analysisType) {
      where += ` AND a.analysis_type = $${paramIdx++}`;
      params.push(analysisType);
    }

    let orderBy: string;
    switch (sort) {
      case "trending":
        orderBy = "a.upvote_count DESC, a.view_count DESC";
        break;
      case "upvotes":
        orderBy = "a.upvote_count DESC";
        break;
      default:
        orderBy = "a.created_at DESC";
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM analyses a JOIN users u ON u.id = a.user_id WHERE 1=1${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT a.*, u.username AS author_username, u.avatar_url AS author_avatar_url
       FROM analyses a
       JOIN users u ON u.id = a.user_id
       WHERE 1=1${where}
       ORDER BY ${orderBy}
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    // Get user upvotes
    const analysisIds = result.rows.map((a: Record<string, unknown>) => a.id);
    let userVotes: Record<string, boolean> = {};
    if (req.user && analysisIds.length > 0) {
      const votes = await query(
        `SELECT analysis_id FROM upvotes WHERE user_id = $1 AND analysis_id = ANY($2)`,
        [req.user.userId, analysisIds]
      );
      userVotes = votes.rows.reduce((acc: Record<string, boolean>, row: Record<string, unknown>) => {
        acc[row.analysis_id as string] = true;
        return acc;
      }, {});
    }

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      total,
      results: result.rows.map((row: Record<string, unknown>) => ({
        ...formatAnalysis(row),
        userUpvoted: userVotes[row.id as string] || false,
      })),
    });
  } catch (err) {
    console.error("List analyses error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    await query("UPDATE analyses SET view_count = view_count + 1 WHERE id = $1", [id]);

    const result = await query(
      `SELECT a.*, u.username AS author_username, u.avatar_url AS author_avatar_url
       FROM analyses a
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    const row = result.rows[0];

    const userVote = req.user
      ? await query("SELECT 1 FROM upvotes WHERE user_id = $1 AND analysis_id = $2", [req.user.userId, id])
      : null;

    res.json({
      ...formatAnalysis(row),
      userUpvoted: userVote ? userVote.rows.length > 0 : false,
    });
  } catch (err) {
    console.error("Get analysis error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const { anime_id, title, content, analysis_type } = req.body;
    const userId = req.user!.userId;

    if (!anime_id || !title || !content) {
      res.status(400).json({ error: "anime_id, title, and content are required" });
      return;
    }
    if (title.length < 10 || title.length > 200) {
      res.status(400).json({ error: "Title must be between 10 and 200 characters" });
      return;
    }
    if (content.length < 200 || content.length > 10000) {
      res.status(400).json({ error: "Content must be between 200 and 10,000 characters" });
      return;
    }
    if (analysis_type && !ANALYSIS_TYPES.includes(analysis_type)) {
      res.status(400).json({ error: `Invalid analysis type. Must be one of: ${ANALYSIS_TYPES.join(", ")}` });
      return;
    }

    const result = await query(
      `INSERT INTO analyses (user_id, anime_id, title, content, analysis_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, parseInt(anime_id), title, content, analysis_type || "other"]
    );

    res.status(201).json(formatAnalysis(result.rows[0]));
  } catch (err) {
    console.error("Create analysis error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;
    const { title, content, analysis_type } = req.body;

    const existing = await query("SELECT user_id FROM analyses WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }
    if (existing.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Not authorized to edit this analysis" });
      return;
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];
    let idx = 1;

    if (title !== undefined) {
      if (title.length < 10 || title.length > 200) {
        res.status(400).json({ error: "Title must be between 10 and 200 characters" });
        return;
      }
      updates.push(`title = $${idx++}`);
      params.push(title);
    }
    if (content !== undefined) {
      if (content.length < 200 || content.length > 10000) {
        res.status(400).json({ error: "Content must be between 200 and 10,000 characters" });
        return;
      }
      updates.push(`content = $${idx++}`);
      params.push(content);
    }
    if (analysis_type !== undefined) {
      if (!ANALYSIS_TYPES.includes(analysis_type)) {
        res.status(400).json({ error: `Invalid analysis type. Must be one of: ${ANALYSIS_TYPES.join(", ")}` });
        return;
      }
      updates.push(`analysis_type = $${idx++}`);
      params.push(analysis_type);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE analyses SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      params
    );

    res.json(formatAnalysis(result.rows[0]));
  } catch (err) {
    console.error("Update analysis error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    const existing = await query("SELECT user_id FROM analyses WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }
    if (existing.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Not authorized to delete this analysis" });
      return;
    }

    await query("DELETE FROM analyses WHERE id = $1", [id]);
    res.json({ message: "Analysis deleted" });
  } catch (err) {
    console.error("Delete analysis error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function upvoteAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    const exists = await query("SELECT 1 FROM analyses WHERE id = $1", [id]);
    if (exists.rows.length === 0) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    await query(
      `INSERT INTO upvotes (user_id, analysis_id) VALUES ($1, $2)
       ON CONFLICT (user_id, analysis_id) DO NOTHING`,
      [userId, id]
    );

    await query(
      `UPDATE analyses SET upvote_count = (SELECT COUNT(*) FROM upvotes WHERE analysis_id = $1) WHERE id = $1`,
      [id]
    );

    const result = await query("SELECT upvote_count FROM analyses WHERE id = $1", [id]);
    res.json({ upvoteCount: Number(result.rows[0].upvote_count) });
  } catch (err) {
    console.error("Upvote analysis error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function removeUpvote(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    await query("DELETE FROM upvotes WHERE user_id = $1 AND analysis_id = $2", [userId, id]);

    await query(
      `UPDATE analyses SET upvote_count = (SELECT COUNT(*) FROM upvotes WHERE analysis_id = $1) WHERE id = $1`,
      [id]
    );

    const result = await query("SELECT upvote_count FROM analyses WHERE id = $1", [id]);
    res.json({ upvoteCount: Number(result.rows[0].upvote_count) });
  } catch (err) {
    console.error("Remove upvote error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
