import { Request, Response } from "express";
import { query } from "../db/pool";

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;

    const userResult = await query(
      `SELECT id, username, bio, pronouns, avatar_url, profile_view_count, created_at FROM users WHERE username = $1`,
      [username]
    );
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const user = userResult.rows[0];

    if (!req.user || req.user.userId !== user.id) {
      await query("UPDATE users SET profile_view_count = profile_view_count + 1 WHERE id = $1", [user.id]);
    }

    const stats = await query(
      `SELECT
        COUNT(*)::int AS total_analyses,
        COALESCE(SUM(upvote_count), 0)::int AS total_upvotes_received
       FROM analyses WHERE user_id = $1`,
      [user.id]
    );

    const followers = await query(
      "SELECT COUNT(*)::int FROM follows WHERE following_id = $1",
      [user.id]
    );

    const following = await query(
      "SELECT COUNT(*)::int FROM follows WHERE follower_id = $1",
      [user.id]
    );

    const profileUpvotes = await query(
      "SELECT COUNT(*)::int FROM profile_upvotes WHERE target_user_id = $1",
      [user.id]
    );

    const repScore = Math.round(
      (Number(stats.rows[0].total_upvotes_received) * 3 +
       Number(profileUpvotes.rows[0].count) * 10 +
       Number(followers.rows[0].count) * 2 +
       Number(stats.rows[0].total_analyses) * 5) / 2
    );

    const topAnime = await query(
      "SELECT anime_id, title, image_url, rank FROM top_anime WHERE user_id = $1 ORDER BY rank ASC",
      [user.id]
    );

    const topCharacters = await query(
      "SELECT character_id, name, image_url, anime_name, rank FROM top_characters WHERE user_id = $1 ORDER BY rank ASC",
      [user.id]
    );

    const collections = await query(
      "SELECT id, title, description, created_at FROM collections WHERE user_id = $1 ORDER BY created_at DESC",
      [user.id]
    );

    const collectionsWithCount = await Promise.all(
      collections.rows.map(async (c: Record<string, unknown>) => {
        const cnt = await query("SELECT COUNT(*)::int AS count FROM collection_items WHERE collection_id = $1", [c.id]);
        return { id: c.id, title: c.title, description: c.description, createdAt: c.created_at, itemCount: cnt.rows[0].count };
      })
    );

    // Get top analyses with author, content, and userUpvoted
    const topAnalyses = await query(
      `SELECT a.id, a.title, a.anime_id, a.upvote_count, a.view_count, a.created_at, a.analysis_type, a.content, u.username AS author_username, u.avatar_url AS author_avatar_url,
        (SELECT COUNT(*) FROM comments WHERE analysis_id = a.id) AS comment_count
       FROM analyses a JOIN users u ON a.user_id = u.id WHERE a.user_id = $1 ORDER BY a.upvote_count DESC LIMIT 5`,
      [user.id]
    );

    // Get user upvotes for top analyses
    const topAnalysisIds = topAnalyses.rows.map((a: Record<string, unknown>) => a.id);
    let topAnalysisUserVotes: Record<string, boolean> = {};
    if (req.user && topAnalysisIds.length > 0) {
      const topVotes = await query(
        `SELECT analysis_id FROM upvotes WHERE user_id = $1 AND analysis_id = ANY($2)`,
        [req.user.userId, topAnalysisIds]
      );
      topAnalysisUserVotes = topVotes.rows.reduce((acc: Record<string, boolean>, row: Record<string, unknown>) => {
        acc[row.analysis_id as string] = true;
        return acc;
      }, {});
    }

    const isFollowing = req.user
      ? (await query(
          "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
          [req.user.userId, user.id]
        )).rows.length > 0
      : false;

    const userUpvotedProfile = req.user
      ? (await query(
          "SELECT 1 FROM profile_upvotes WHERE user_id = $1 AND target_user_id = $2",
          [req.user.userId, user.id]
        )).rows.length > 0
      : false;

    // Get recent analyses with author, content, and userUpvoted
    const recentAnalyses = await query(
      `SELECT a.id, a.title, a.anime_id, a.upvote_count, a.view_count, a.created_at, a.analysis_type, a.content, u.username AS author_username, u.avatar_url AS author_avatar_url,
        (SELECT COUNT(*) FROM comments WHERE analysis_id = a.id) AS comment_count
       FROM analyses a JOIN users u ON a.user_id = u.id WHERE a.user_id = $1 ORDER BY a.created_at DESC LIMIT 10`,
      [user.id]
    );

    // Get user upvotes for recent analyses
    const recentAnalysisIds = recentAnalyses.rows.map((a: Record<string, unknown>) => a.id);
    let recentAnalysisUserVotes: Record<string, boolean> = {};
    if (req.user && recentAnalysisIds.length > 0) {
      const recentVotes = await query(
        `SELECT analysis_id FROM upvotes WHERE user_id = $1 AND analysis_id = ANY($2)`,
        [req.user.userId, recentAnalysisIds]
      );
      recentAnalysisUserVotes = recentVotes.rows.reduce((acc: Record<string, boolean>, row: Record<string, unknown>) => {
        acc[row.analysis_id as string] = true;
        return acc;
      }, {});
    }

    res.json({
      id: user.id,
      username: user.username,
      bio: user.bio,
      pronouns: user.pronouns,
      avatarUrl: user.avatar_url,
      profileViewCount: Number(user.profile_view_count),
      createdAt: user.created_at,
      totalAnalyses: stats.rows[0].total_analyses,
      totalUpvotesReceived: stats.rows[0].total_upvotes_received,
      reputationScore: repScore,
      followerCount: followers.rows[0].count,
      followingCount: following.rows[0].count,
      profileUpvoteCount: profileUpvotes.rows[0].count,
      isFollowing,
      userUpvotedProfile,
      topAnime: topAnime.rows.map((a: Record<string, unknown>) => ({
        animeId: a.anime_id,
        title: a.title,
        imageUrl: a.image_url,
        rank: a.rank,
      })),
      topCharacters: topCharacters.rows.map((c: Record<string, unknown>) => ({
        characterId: c.character_id,
        name: c.name,
        imageUrl: c.image_url,
        animeName: c.anime_name,
        rank: c.rank,
      })),
      collections: collectionsWithCount,
      topAnalyses: topAnalyses.rows.map((a: Record<string, unknown>) => ({
        id: a.id,
        title: a.title,
        animeId: a.anime_id,
        upvoteCount: Number(a.upvote_count),
        viewCount: Number(a.view_count),
        commentCount: Number(a.comment_count),
        createdAt: a.created_at,
        analysisType: a.analysis_type,
        content: a.content,
        author: {
          username: a.author_username,
          avatarUrl: a.author_avatar_url,
        },
        userUpvoted: topAnalysisUserVotes[a.id as string] || false,
      })),
      recentAnalyses: recentAnalyses.rows.map((a: Record<string, unknown>) => ({
        id: a.id,
        title: a.title,
        animeId: a.anime_id,
        upvoteCount: Number(a.upvote_count),
        viewCount: Number(a.view_count),
        commentCount: Number(a.comment_count),
        createdAt: a.created_at,
        analysisType: a.analysis_type,
        content: a.content,
        author: {
          username: a.author_username,
          avatarUrl: a.author_avatar_url,
        },
        userUpvoted: recentAnalysisUserVotes[a.id as string] || false,
      })),
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const requestingUser = req.user!;
    const { bio, pronouns, avatar_url, username: newUsername } = req.body;

    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (userResult.rows[0].id !== requestingUser.userId) {
      res.status(403).json({ error: "Not authorized to update this profile" });
      return;
    }

    if (newUsername !== undefined) {
      const clean = String(newUsername).trim().slice(0, 30);
      if (clean.length < 2) {
        res.status(400).json({ error: "Username must be at least 2 characters" });
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
        res.status(400).json({ error: "Username can only contain letters, numbers, hyphens, and underscores" });
        return;
      }
      const existing = await query("SELECT id FROM users WHERE username = $1 AND id != $2", [clean, requestingUser.userId]);
      if (existing.rows.length > 0) {
        res.status(409).json({ error: "Username already taken" });
        return;
      }
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];
    let idx = 1;

    if (bio !== undefined) {
      updates.push(`bio = $${idx++}`);
      params.push(String(bio).slice(0, 500));
    }
    if (pronouns !== undefined) {
      updates.push(`pronouns = $${idx++}`);
      params.push(String(pronouns).slice(0, 50));
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      params.push(avatar_url);
    }
    if (newUsername !== undefined) {
      updates.push(`username = $${idx++}`);
      params.push(String(newUsername).trim().slice(0, 30));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    updates.push("updated_at = NOW()");
    params.push(username);

    await query(
      `UPDATE users SET ${updates.join(", ")} WHERE username = $${idx}`,
      params
    );

    const lookupUsername = newUsername !== undefined ? String(newUsername).trim().slice(0, 30) : username;
    const updated = await query(
      "SELECT id, username, bio, pronouns, avatar_url FROM users WHERE username = $1",
      [lookupUsername]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTopAnime(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const rows = await query(
      "SELECT anime_id, title, image_url, rank FROM top_anime WHERE user_id = $1 ORDER BY rank ASC",
      [userResult.rows[0].id]
    );
    res.json({ results: rows.rows.map((r: Record<string, unknown>) => ({
      animeId: r.anime_id,
      title: r.title,
      imageUrl: r.image_url,
      rank: r.rank,
    })) });
  } catch (err) {
    console.error("Get top anime error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function setTopAnime(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const requestingUser = req.user!;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length > 10) {
      res.status(400).json({ error: "items must be an array of up to 10 entries" });
      return;
    }

    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (userResult.rows[0].id !== requestingUser.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const userId = userResult.rows[0].id;

    await query("DELETE FROM top_anime WHERE user_id = $1", [userId]);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.anime_id || !item.title) continue;
      await query(
        "INSERT INTO top_anime (user_id, anime_id, title, image_url, rank) VALUES ($1, $2, $3, $4, $5)",
        [userId, item.anime_id, item.title, item.image_url || "", i + 1]
      );
    }

    const rows = await query(
      "SELECT anime_id, title, image_url, rank FROM top_anime WHERE user_id = $1 ORDER BY rank ASC",
      [userId]
    );
    res.json({ results: rows.rows.map((r: Record<string, unknown>) => ({
      animeId: r.anime_id,
      title: r.title,
      imageUrl: r.image_url,
      rank: r.rank,
    })) });
  } catch (err) {
    console.error("Set top anime error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function upvoteProfile(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const userId = req.user!.userId;

    const target = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (target.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const targetId = target.rows[0].id;

    if (userId === targetId) {
      res.status(400).json({ error: "Cannot upvote your own profile" });
      return;
    }

    await query(
      "INSERT INTO profile_upvotes (user_id, target_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, targetId]
    );

    const count = await query("SELECT COUNT(*)::int AS count FROM profile_upvotes WHERE target_user_id = $1", [targetId]);
    res.json({ profileUpvoteCount: count.rows[0].count });
  } catch (err) {
    console.error("Upvote profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function removeProfileUpvote(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const userId = req.user!.userId;

    const target = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (target.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await query(
      "DELETE FROM profile_upvotes WHERE user_id = $1 AND target_user_id = $2",
      [userId, target.rows[0].id]
    );

    const count = await query("SELECT COUNT(*)::int AS count FROM profile_upvotes WHERE target_user_id = $1", [target.rows[0].id]);
    res.json({ profileUpvoteCount: count.rows[0].count });
  } catch (err) {
    console.error("Remove profile upvote error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserAnalyses(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const userId = userResult.rows[0].id;

    const countResult = await query("SELECT COUNT(*) FROM analyses WHERE user_id = $1", [userId]);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT a.id, a.title, a.anime_id, a.upvote_count, a.view_count, a.created_at, a.analysis_type, a.content, u.username AS author_username, u.avatar_url AS author_avatar_url,
        (SELECT COUNT(*) FROM comments WHERE analysis_id = a.id) AS comment_count
       FROM analyses a JOIN users u ON a.user_id = u.id WHERE a.user_id = $1 ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
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
      results: result.rows.map((a: Record<string, unknown>) => ({
        id: a.id,
        title: a.title,
        animeId: a.anime_id,
        upvoteCount: Number(a.upvote_count),
        viewCount: Number(a.view_count),
        commentCount: Number(a.comment_count),
        createdAt: a.created_at,
        analysisType: a.analysis_type,
        content: a.content,
        author: {
          username: a.author_username,
          avatarUrl: a.author_avatar_url,
        },
        userUpvoted: userVotes[a.id as string] || false,
      })),
    });
  } catch (err) {
    console.error("Get user analyses error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTopCharacters(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const rows = await query(
      "SELECT character_id, name, image_url, anime_name, rank FROM top_characters WHERE user_id = $1 ORDER BY rank ASC",
      [userResult.rows[0].id]
    );
    res.json({ results: rows.rows.map((r: Record<string, unknown>) => ({
      characterId: r.character_id,
      name: r.name,
      imageUrl: r.image_url,
      animeName: r.anime_name,
      rank: r.rank,
    })) });
  } catch (err) {
    console.error("Get top characters error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function setTopCharacters(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const requestingUser = req.user!;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length > 10) {
      res.status(400).json({ error: "items must be an array of up to 10 entries" });
      return;
    }

    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (userResult.rows[0].id !== requestingUser.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const userId = userResult.rows[0].id;

    await query("DELETE FROM top_characters WHERE user_id = $1", [userId]);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.character_id || !item.name) continue;
      await query(
        "INSERT INTO top_characters (user_id, character_id, name, image_url, anime_name, rank) VALUES ($1, $2, $3, $4, $5, $6)",
        [userId, item.character_id, item.name, item.image_url || "", item.anime_name || "", i + 1]
      );
    }

    const rows = await query(
      "SELECT character_id, name, image_url, anime_name, rank FROM top_characters WHERE user_id = $1 ORDER BY rank ASC",
      [userId]
    );
    res.json({ results: rows.rows.map((r: Record<string, unknown>) => ({
      characterId: r.character_id,
      name: r.name,
      imageUrl: r.image_url,
      animeName: r.anime_name,
      rank: r.rank,
    })) });
  } catch (err) {
    console.error("Set top characters error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getFollowers(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const result = await query(
      `SELECT u.username, u.avatar_url
       FROM follows f JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = $1 ORDER BY f.created_at DESC`,
      [userResult.rows[0].id]
    );
    res.json({ results: result.rows });
  } catch (err) {
    console.error("Get followers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getFollowing(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const result = await query(
      `SELECT u.username, u.avatar_url
       FROM follows f JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = $1 ORDER BY f.created_at DESC`,
      [userResult.rows[0].id]
    );
    res.json({ results: result.rows });
  } catch (err) {
    console.error("Get following error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function followUser(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const followerId = req.user!.userId;
    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const followingId = userResult.rows[0].id;
    if (followerId === followingId) {
      res.status(400).json({ error: "Cannot follow yourself" });
      return;
    }
    await query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [followerId, followingId]
    );
    res.json({ message: "Now following" });
  } catch (err) {
    console.error("Follow user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function unfollowUser(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const followerId = req.user!.userId;
    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await query(
      "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2",
      [followerId, userResult.rows[0].id]
    );
    res.json({ message: "Unfollowed" });
  } catch (err) {
    console.error("Unfollow user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
