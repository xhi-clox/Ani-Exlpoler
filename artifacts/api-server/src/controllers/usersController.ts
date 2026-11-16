import { Request, Response } from "express";
import { query } from "../db/pool";

const WORK_TYPES = new Set([
  "ANIME",
  "MANGA",
  "MANHWA",
  "MANHUA",
  "NOVEL",
  "MOVIE",
  "TV",
  "GAME",
  "MUSIC",
  "ARTIST",
]);
const CURRENTLY_INTO_ICONS = new Set(["book", "headphones", "screen", "bookmark"]);

function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function jsonArray(value: unknown, max = 40): unknown[] {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

function cleanInterests(value: unknown) {
  return jsonArray(value, 20)
    .map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      return { emoji: text(item.emoji, 8), label: text(item.label, 60) };
    })
    .filter((item) => item.label);
}

function cleanTasteDna(value: unknown) {
  return jsonArray(value, 12)
    .map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      const raw = Number(item.value);
      return {
        label: text(item.label, 60),
        value: Number.isFinite(raw) ? Math.min(Math.max(Math.round(raw), 0), 100) : 0,
      };
    })
    .filter((item) => item.label);
}

function cleanCurrentlyInto(value: unknown) {
  return jsonArray(value, 8)
    .map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      const icon = text(item.icon, 20);
      return {
        icon: CURRENTLY_INTO_ICONS.has(icon) ? icon : "book",
        title: text(item.title, 120),
        meta: text(item.meta, 120),
      };
    })
    .filter((item) => item.title);
}

function cleanPinnedWork(value: unknown) {
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    label: text(item.label, 120),
    meta: text(item.meta, 160),
    title: text(item.title, 200),
    quote: text(item.quote, 500),
    rating: text(item.rating, 20),
    stats: jsonArray(item.stats, 6).map((stat) => text(stat, 80)).filter(Boolean),
    image: text(item.image, 500_000),
  };
}

function cleanPinnedQuote(value: unknown) {
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    label: text(item.label, 120),
    text: text(item.text, 500),
    attribution: text(item.attribution, 200),
  };
}

function serializeFavorite(row: Record<string, unknown>) {
  return {
    id: row.id,
    animeId: row.anime_id ?? null,
    title: row.title,
    type: row.work_type,
    meta: row.meta ?? "",
    rating: row.rating ?? "",
    imageUrl: row.image_url ?? "",
    rank: row.rank,
    externalId: row.external_id ?? null,
    source: row.source ?? "",
    metadata: row.metadata ?? {},
  };
}

function serializeQuote(row: Record<string, unknown>) {
  return {
    id: row.id,
    text: row.text,
    attribution: row.attribution ?? "",
    source: row.source ?? "",
    favorite: Boolean(row.is_favorite),
    original: Boolean(row.is_original),
    rank: row.rank,
  };
}

async function collectionsFor(userId: string, viewerId?: string) {
  const collections = await query(
    `SELECT c.id, c.title, c.description, c.created_at,
        (SELECT COUNT(*)::int FROM collection_likes l WHERE l.collection_id = c.id) AS like_count,
        EXISTS (SELECT 1 FROM collection_likes l WHERE l.collection_id = c.id AND l.user_id = $2) AS liked_by_me
     FROM collections c WHERE c.user_id = $1 ORDER BY c.created_at DESC`,
    [userId, viewerId ?? "00000000-0000-0000-0000-000000000000"]
  );

  return Promise.all(
    collections.rows.map(async (c: Record<string, unknown>) => {
      const items = await query(
        "SELECT id, anime_id, title, image_url, rank FROM collection_items WHERE collection_id = $1 ORDER BY rank ASC",
        [c.id]
      );
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        createdAt: c.created_at,
        itemCount: items.rows.length,
        likeCount: Number(c.like_count),
        likedByMe: Boolean(c.liked_by_me),
        items: items.rows.map((item: Record<string, unknown>) => ({
          id: item.id,
          animeId: item.anime_id,
          title: item.title,
          imageUrl: item.image_url ?? "",
          rank: item.rank,
        })),
      };
    })
  );
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;

    const userResult = await query(
      `SELECT id, username, display_name, bio, pronouns, avatar_url, banner_url, location, languages,
              website_url, instagram, twitter, mal_username,
              currently_reading_title, currently_reading_chapter, currently_exploring,
              favorite_theme, profile_mood, interests, taste_dna, pinned_work, pinned_quote,
              currently_into, traits, profile_view_count, created_at
       FROM users WHERE username = $1`,
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
      "SELECT character_id, name, image_url, anime_name, note, label, rank FROM top_characters WHERE user_id = $1 ORDER BY rank ASC",
      [user.id]
    );

    const favoriteWorks = await query(
      `SELECT ${FAVORITE_COLUMNS} FROM favorite_works WHERE user_id = $1 ORDER BY work_type ASC, rank ASC, created_at ASC`,
      [user.id]
    );

    const profileQuotes = await query(
      "SELECT id, text, attribution, source, is_favorite, is_original, rank FROM profile_quotes WHERE user_id = $1 ORDER BY rank ASC, created_at ASC",
      [user.id]
    );

    const collectionsWithCount = await collectionsFor(user.id, req.user?.userId);

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
      displayName: user.display_name || user.username,
      bio: user.bio,
      pronouns: user.pronouns,
      avatarUrl: user.avatar_url,
      bannerUrl: user.banner_url || "",
      location: user.location || "",
      languages: user.languages || "",
      websiteUrl: user.website_url || "",
      instagram: user.instagram || "",
      twitter: user.twitter || "",
      malUsername: user.mal_username || "",
      currentlyReading: {
        title: user.currently_reading_title || "",
        chapter: user.currently_reading_chapter || "",
      },
      currentlyExploring: user.currently_exploring || "",
      favoriteTheme: user.favorite_theme || "",
      mood: user.profile_mood || "",
      interests: cleanInterests(user.interests),
      tasteDna: cleanTasteDna(user.taste_dna),
      pinnedWork: cleanPinnedWork(user.pinned_work),
      pinnedQuote: cleanPinnedQuote(user.pinned_quote),
      currentlyInto: cleanCurrentlyInto(user.currently_into),
      traits: jsonArray(user.traits, 10).map((trait) => text(trait, 60)).filter(Boolean),
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
        note: c.note || "",
        label: c.label || "",
        rank: c.rank,
      })),
      favoriteWorks: favoriteWorks.rows.map(serializeFavorite),
      quotes: profileQuotes.rows.map(serializeQuote),
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
    const body = req.body ?? {};

    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (userResult.rows[0].id !== requestingUser.userId) {
      res.status(403).json({ error: "Not authorized to update this profile" });
      return;
    }

    if (body.username !== undefined) {
      const clean = String(body.username).trim().slice(0, 30);
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
    const params: unknown[] = [];
    let idx = 1;

    const set = (column: string, value: unknown) => {
      updates.push(`${column} = $${idx++}`);
      params.push(value);
    };

    if (body.bio !== undefined) set("bio", text(body.bio, 500));
    if (body.pronouns !== undefined) set("pronouns", text(body.pronouns, 50));
    if (body.avatar_url !== undefined) set("avatar_url", text(body.avatar_url, 2_000_000));
    if (body.banner_url !== undefined) set("banner_url", text(body.banner_url, 4_000_000));
    if (body.username !== undefined) set("username", String(body.username).trim().slice(0, 30));

    if (body.display_name !== undefined) set("display_name", text(body.display_name, 80));
    if (body.location !== undefined) set("location", text(body.location, 120));
    if (body.languages !== undefined) set("languages", text(body.languages, 200));
    if (body.website_url !== undefined) set("website_url", text(body.website_url, 500));
    if (body.instagram !== undefined) set("instagram", text(body.instagram, 120));
    if (body.twitter !== undefined) set("twitter", text(body.twitter, 120));
    if (body.mal_username !== undefined) set("mal_username", text(body.mal_username, 120));

    if (body.currently_reading_title !== undefined) set("currently_reading_title", text(body.currently_reading_title, 200));
    if (body.currently_reading_chapter !== undefined) set("currently_reading_chapter", text(body.currently_reading_chapter, 80));
    if (body.currently_exploring !== undefined) set("currently_exploring", text(body.currently_exploring, 500));
    if (body.favorite_theme !== undefined) set("favorite_theme", text(body.favorite_theme, 120));
    if (body.profile_mood !== undefined) set("profile_mood", text(body.profile_mood, 120));

    if (body.interests !== undefined) set("interests", JSON.stringify(cleanInterests(body.interests)));
    if (body.taste_dna !== undefined) set("taste_dna", JSON.stringify(cleanTasteDna(body.taste_dna)));
    if (body.pinned_work !== undefined) set("pinned_work", JSON.stringify(cleanPinnedWork(body.pinned_work)));
    if (body.pinned_quote !== undefined) set("pinned_quote", JSON.stringify(cleanPinnedQuote(body.pinned_quote)));
    if (body.currently_into !== undefined) set("currently_into", JSON.stringify(cleanCurrentlyInto(body.currently_into)));
    if (body.traits !== undefined) {
      set("traits", JSON.stringify(jsonArray(body.traits, 10).map((trait) => text(trait, 60)).filter(Boolean)));
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

    const lookupUsername = body.username !== undefined ? String(body.username).trim().slice(0, 30) : username;
    const updated = await query(
      `SELECT id, username, display_name, bio, pronouns, avatar_url, banner_url, location, languages,
              website_url, instagram, twitter, mal_username,
              currently_reading_title, currently_reading_chapter, currently_exploring,
              favorite_theme, profile_mood, interests, taste_dna, pinned_work, pinned_quote,
              currently_into, traits
       FROM users WHERE username = $1`,
      [lookupUsername]
    );

    const row = updated.rows[0];
    res.json({
      id: row.id,
      username: row.username,
      displayName: row.display_name || row.username,
      bio: row.bio,
      pronouns: row.pronouns,
      avatarUrl: row.avatar_url,
      avatar_url: row.avatar_url,
      bannerUrl: row.banner_url || "",
      location: row.location || "",
      languages: row.languages || "",
      websiteUrl: row.website_url || "",
      instagram: row.instagram || "",
      twitter: row.twitter || "",
      malUsername: row.mal_username || "",
      currentlyReading: {
        title: row.currently_reading_title || "",
        chapter: row.currently_reading_chapter || "",
      },
      currentlyExploring: row.currently_exploring || "",
      favoriteTheme: row.favorite_theme || "",
      mood: row.profile_mood || "",
      interests: cleanInterests(row.interests),
      tasteDna: cleanTasteDna(row.taste_dna),
      pinnedWork: cleanPinnedWork(row.pinned_work),
      pinnedQuote: cleanPinnedQuote(row.pinned_quote),
      currentlyInto: cleanCurrentlyInto(row.currently_into),
      traits: jsonArray(row.traits, 10).map((trait) => text(trait, 60)).filter(Boolean),
    });
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
      "SELECT character_id, name, image_url, anime_name, note, label, rank FROM top_characters WHERE user_id = $1 ORDER BY rank ASC",
      [userResult.rows[0].id]
    );
    res.json({ results: rows.rows.map((r: Record<string, unknown>) => ({
      characterId: r.character_id,
      name: r.name,
      imageUrl: r.image_url,
      animeName: r.anime_name,
      note: r.note || "",
      label: r.label || "",
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
        "INSERT INTO top_characters (user_id, character_id, name, image_url, anime_name, note, label, rank) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          userId,
          item.character_id,
          text(item.name, 300),
          text(item.image_url, 500),
          text(item.anime_name, 500),
          text(item.note, 500),
          text(item.label, 80),
          i + 1,
        ]
      );
    }

    const rows = await query(
      "SELECT character_id, name, image_url, anime_name, note, label, rank FROM top_characters WHERE user_id = $1 ORDER BY rank ASC",
      [userId]
    );
    res.json({ results: rows.rows.map((r: Record<string, unknown>) => ({
      characterId: r.character_id,
      name: r.name,
      imageUrl: r.image_url,
      animeName: r.anime_name,
      note: r.note || "",
      label: r.label || "",
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

const FAVORITE_COLUMNS =
  "id, anime_id, title, work_type, meta, rating, image_url, rank, external_id, source, metadata";

function favoriteCategory(value: unknown): string | null {
  const category = text(value, 20).toUpperCase();
  return WORK_TYPES.has(category) ? category : null;
}

async function loadFavorites(userId: string, category?: string) {
  const rows = await query(
    `SELECT ${FAVORITE_COLUMNS} FROM favorite_works
     WHERE user_id = $1${category ? " AND work_type = $2" : ""}
     ORDER BY work_type ASC, rank ASC, created_at ASC`,
    category ? [userId, category] : [userId],
  );
  return rows.rows.map(serializeFavorite);
}

async function replaceFavorites(
  userId: string,
  items: unknown[],
  options: { category?: string; replaceAll: boolean },
) {
  if (options.replaceAll) {
    await query("DELETE FROM favorite_works WHERE user_id = $1", [userId]);
  } else {
    await query("DELETE FROM favorite_works WHERE user_id = $1 AND work_type = $2", [
      userId,
      options.category,
    ]);
  }

  for (let i = 0; i < items.length; i++) {
    const item = (items[i] ?? {}) as Record<string, unknown>;
    const title = text(item.title, 500);
    if (!title) continue;

    const type = options.category ?? favoriteCategory(item.type) ?? "ANIME";
    const animeId = Number(item.anime_id ?? item.animeId);
    const metadata =
      item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
        ? (item.metadata as Record<string, unknown>)
        : {};

    await query(
      `INSERT INTO favorite_works
        (user_id, anime_id, title, work_type, meta, rating, image_url, rank, external_id, source, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        Number.isFinite(animeId) && animeId > 0 ? animeId : null,
        title,
        type,
        text(item.meta, 300),
        text(item.rating, 20),
        text(item.image_url ?? item.imageUrl, 500_000),
        i,
        text(item.external_id ?? item.externalId, 120),
        text(item.source, 40),
        metadata,
      ],
    );
  }
}

export async function getFavoriteWorks(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ results: await loadFavorites(userResult.rows[0].id) });
  } catch (err) {
    console.error("Get favorite works error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getFavorites(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const results = await loadFavorites(userResult.rows[0].id);
    const byCategory: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};

    for (const favorite of results) {
      const category = String(favorite.type ?? "ANIME");
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(favorite);
      counts[category] = (counts[category] ?? 0) + 1;
    }

    res.json({ results, byCategory, counts });
  } catch (err) {
    console.error("Get favorites error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getFavoritesByCategory(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const category = favoriteCategory(req.params.category);
    if (!category) {
      res.status(400).json({ error: "Unknown favorites category" });
      return;
    }

    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const results = await loadFavorites(userResult.rows[0].id, category);
    res.json({ category, count: results.length, results });
  } catch (err) {
    console.error("Get favorites by category error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function setFavoriteWorks(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length > 200) {
      res.status(400).json({ error: "items must be an array of up to 200 entries" });
      return;
    }

    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (userResult.rows[0].id !== req.user!.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const userId = userResult.rows[0].id;

    await replaceFavorites(userId, items, { replaceAll: true });
    res.json({ results: await loadFavorites(userId) });
  } catch (err) {
    console.error("Set favorite works error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function setFavoritesByCategory(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const category = favoriteCategory(req.params.category);
    const { items } = req.body;

    if (!category) {
      res.status(400).json({ error: "Unknown favorites category" });
      return;
    }
    if (!Array.isArray(items) || items.length > 40) {
      res.status(400).json({ error: "items must be an array of up to 40 entries" });
      return;
    }

    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (userResult.rows[0].id !== req.user!.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const userId = userResult.rows[0].id;

    await replaceFavorites(userId, items, { category, replaceAll: false });
    const results = await loadFavorites(userId, category);
    res.json({ category, count: results.length, results });
  } catch (err) {
    console.error("Set favorites by category error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProfileQuotes(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const rows = await query(
      "SELECT id, text, attribution, source, is_favorite, is_original, rank FROM profile_quotes WHERE user_id = $1 ORDER BY rank ASC, created_at ASC",
      [userResult.rows[0].id]
    );
    res.json({ results: rows.rows.map(serializeQuote) });
  } catch (err) {
    console.error("Get profile quotes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function setProfileQuotes(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length > 40) {
      res.status(400).json({ error: "items must be an array of up to 40 entries" });
      return;
    }

    const userResult = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (userResult.rows[0].id !== req.user!.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const userId = userResult.rows[0].id;

    if (items.filter((item) => Boolean(item?.favorite)).length > 1) {
      res.status(400).json({ error: "Only one quote can be the featured favorite" });
      return;
    }

    await query("DELETE FROM profile_quotes WHERE user_id = $1", [userId]);

    for (let i = 0; i < items.length; i++) {
      const item = items[i] ?? {};
      const quoteText = text(item.text, 1000);
      if (!quoteText) continue;
      await query(
        `INSERT INTO profile_quotes (user_id, text, attribution, source, is_favorite, is_original, rank)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          quoteText,
          text(item.attribution, 300),
          text(item.source, 300),
          Boolean(item.favorite),
          Boolean(item.original),
          i,
        ]
      );
    }

    const rows = await query(
      "SELECT id, text, attribution, source, is_favorite, is_original, rank FROM profile_quotes WHERE user_id = $1 ORDER BY rank ASC, created_at ASC",
      [userId]
    );
    res.json({ results: rows.rows.map(serializeQuote) });
  } catch (err) {
    console.error("Set profile quotes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
