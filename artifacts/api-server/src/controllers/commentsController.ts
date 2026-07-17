import { Request, Response } from "express";
import { query } from "../db/pool";

export async function createComment(req: Request, res: Response): Promise<void> {
  try {
    const analysisId = req.params.id as string;
    const { content, parent_comment_id } = req.body;
    const userId = req.user!.userId;

    if (!content || content.length < 10 || content.length > 2000) {
      res.status(400).json({ error: "Comment must be between 10 and 2,000 characters" });
      return;
    }

    const analysisExists = await query("SELECT 1 FROM analyses WHERE id = $1", [analysisId]);
    if (analysisExists.rows.length === 0) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    if (parent_comment_id) {
      const parentExists = await query(
        "SELECT 1 FROM comments WHERE id = $1 AND analysis_id = $2 AND parent_comment_id IS NULL",
        [parent_comment_id, analysisId]
      );
      if (parentExists.rows.length === 0) {
        res.status(400).json({ error: "Parent comment not found or replies are limited to one level" });
        return;
      }
    }

    const result = await query(
      `INSERT INTO comments (user_id, analysis_id, content, parent_comment_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, analysisId, content, parent_comment_id || null]
    );

    const authorResult = await query(
      "SELECT username, avatar_url FROM users WHERE id = $1",
      [userId]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      content: row.content,
      userId: row.user_id,
      analysisId: row.analysis_id,
      parentCommentId: row.parent_comment_id,
      createdAt: row.created_at,
      upvoteCount: Number(row.upvote_count),
      author: { username: authorResult.rows[0].username, avatarUrl: authorResult.rows[0].avatar_url },
    });
  } catch (err) {
    console.error("Create comment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getComments(req: Request, res: Response): Promise<void> {
  try {
    const analysisId = req.params.id as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const userId = req.user?.userId || null;

    const countResult = await query("SELECT COUNT(*) FROM comments WHERE analysis_id = $1", [analysisId]);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT c.*, u.username, u.avatar_url,
              CASE WHEN $3 IS NOT NULL AND cu.id IS NOT NULL THEN true ELSE false END AS user_upvoted
       FROM comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN comment_upvotes cu ON cu.comment_id = c.id AND cu.user_id = $3
       WHERE c.analysis_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $4`,
      [analysisId, limit, userId, offset]
    );

    const parentComments = result.rows.filter((r: Record<string, unknown>) => !r.parent_comment_id);
    const replies = result.rows.filter((r: Record<string, unknown>) => r.parent_comment_id);

    const comments = parentComments.map((parent: Record<string, unknown>) => ({
      id: parent.id,
      content: parent.content,
      userId: parent.user_id,
      analysisId: parent.analysis_id,
      createdAt: parent.created_at,
      upvoteCount: Number(parent.upvote_count),
      userUpvoted: parent.user_upvoted === true || parent.user_upvoted === "true",
      author: { username: parent.username, avatarUrl: parent.avatar_url },
      replies: replies
        .filter((r: Record<string, unknown>) => r.parent_comment_id === parent.id)
        .map((reply: Record<string, unknown>) => ({
          id: reply.id,
          content: reply.content,
          userId: reply.user_id,
          analysisId: reply.analysis_id,
          parentCommentId: reply.parent_comment_id,
          createdAt: reply.created_at,
          upvoteCount: Number(reply.upvote_count),
          userUpvoted: reply.user_upvoted === true || reply.user_upvoted === "true",
          author: { username: reply.username, avatarUrl: reply.avatar_url },
        })),
    }));

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      total,
      results: comments,
    });
  } catch (err) {
    console.error("Get comments error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateComment(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;
    const { content } = req.body;

    if (!content || content.length < 10 || content.length > 2000) {
      res.status(400).json({ error: "Comment must be between 10 and 2,000 characters" });
      return;
    }

    const existing = await query("SELECT user_id FROM comments WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    if (existing.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Not authorized to edit this comment" });
      return;
    }

    await query("UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2", [content, id]);
    res.json({ message: "Comment updated" });
  } catch (err) {
    console.error("Update comment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteComment(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    const existing = await query("SELECT user_id FROM comments WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    if (existing.rows[0].user_id !== userId) {
      res.status(403).json({ error: "Not authorized to delete this comment" });
      return;
    }

    await query("DELETE FROM comments WHERE id = $1", [id]);
    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function upvoteComment(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    const existing = await query("SELECT id FROM comments WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    await query(
      "INSERT INTO comment_upvotes (user_id, comment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, id]
    );

    const count = await query(
      "SELECT COUNT(*)::int AS count FROM comment_upvotes WHERE comment_id = $1",
      [id]
    );

    res.json({ upvoteCount: count.rows[0].count });
  } catch (err) {
    console.error("Upvote comment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function removeCommentUpvote(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    await query("DELETE FROM comment_upvotes WHERE user_id = $1 AND comment_id = $2", [userId, id]);

    const count = await query(
      "SELECT COUNT(*)::int AS count FROM comment_upvotes WHERE comment_id = $1",
      [id]
    );

    res.json({ upvoteCount: count.rows[0].count });
  } catch (err) {
    console.error("Remove comment upvote error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
