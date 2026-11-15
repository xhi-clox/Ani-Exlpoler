import { Request, Response } from "express";
import { query } from "../db/pool";

function serializeCollectionItem(item: Record<string, unknown>) {
  return {
    id: item.id,
    animeId: item.anime_id,
    title: item.title,
    imageUrl: item.image_url ?? "",
    rank: item.rank,
  };
}

async function serializeCollection(collection: Record<string, unknown>, viewerId?: string) {
  const items = await query(
    "SELECT id, anime_id, title, image_url, rank FROM collection_items WHERE collection_id = $1 ORDER BY rank ASC",
    [collection.id]
  );
  const likes = await query(
    "SELECT COUNT(*)::int AS count FROM collection_likes WHERE collection_id = $1",
    [collection.id]
  );
  const liked = viewerId
    ? await query(
        "SELECT 1 FROM collection_likes WHERE collection_id = $1 AND user_id = $2",
        [collection.id, viewerId]
      )
    : { rows: [] as unknown[] };

  return {
    id: collection.id,
    title: collection.title,
    description: collection.description ?? "",
    createdAt: collection.created_at,
    itemCount: items.rows.length,
    likeCount: Number(likes.rows[0]?.count ?? 0),
    likedByMe: liked.rows.length > 0,
    items: items.rows.map(serializeCollectionItem),
  };
}

export async function listCollections(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const user = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (user.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const collections = await query(
      "SELECT id, title, description, created_at FROM collections WHERE user_id = $1 ORDER BY created_at DESC",
      [user.rows[0].id]
    );
    const withCounts = await Promise.all(
      collections.rows.map((c: Record<string, unknown>) => serializeCollection(c, req.user?.userId))
    );
    res.json({ results: withCounts });
  } catch (err) {
    console.error("List collections error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createCollection(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const { title, description } = req.body;
    if (!title || String(title).trim().length < 2) {
      res.status(400).json({ error: "Title must be at least 2 characters" });
      return;
    }
    const user = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (user.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (user.rows[0].id !== req.user!.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const result = await query(
      "INSERT INTO collections (user_id, title, description) VALUES ($1, $2, $3) RETURNING id, title, description, created_at",
      [user.rows[0].id, String(title).trim().slice(0, 200), String(description ?? "").slice(0, 1000)]
    );
    res.status(201).json(await serializeCollection(result.rows[0], req.user!.userId));
  } catch (err) {
    console.error("Create collection error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateCollection(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { title, description } = req.body;
    const coll = await query("SELECT user_id FROM collections WHERE id = $1", [id]);
    if (coll.rows.length === 0) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    if (coll.rows[0].user_id !== req.user!.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (title !== undefined) {
      const clean = String(title).trim().slice(0, 200);
      if (clean.length < 2) {
        res.status(400).json({ error: "Title must be at least 2 characters" });
        return;
      }
      updates.push(`title = $${idx++}`);
      params.push(clean);
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(String(description).slice(0, 1000));
    }
    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    updates.push("updated_at = NOW()");
    params.push(id);
    const result = await query(
      `UPDATE collections SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id, title, description, created_at`,
      params
    );
    res.json(await serializeCollection(result.rows[0], req.user!.userId));
  } catch (err) {
    console.error("Update collection error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteCollection(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const coll = await query("SELECT user_id FROM collections WHERE id = $1", [id]);
    if (coll.rows.length === 0) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    if (coll.rows[0].user_id !== req.user!.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    await query("DELETE FROM collections WHERE id = $1", [id]);
    res.json({ message: "Collection deleted" });
  } catch (err) {
    console.error("Delete collection error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function addCollectionItem(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { anime_id, title, image_url } = req.body;
    if (!title || !String(title).trim()) {
      res.status(400).json({ error: "Title is required" });
      return;
    }
    const coll = await query("SELECT user_id FROM collections WHERE id = $1", [id]);
    if (coll.rows.length === 0) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    if (coll.rows[0].user_id !== req.user!.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    const cnt = await query("SELECT COUNT(*)::int AS count FROM collection_items WHERE collection_id = $1", [id]);
    const result = await query(
      "INSERT INTO collection_items (collection_id, anime_id, title, image_url, rank) VALUES ($1, $2, $3, $4, $5) RETURNING id, anime_id, title, image_url, rank",
      [
        id,
        Number.isFinite(Number(anime_id)) ? Number(anime_id) : 0,
        String(title).trim().slice(0, 500),
        String(image_url ?? "").slice(0, 500_000),
        Number(cnt.rows[0].count) + 1,
      ]
    );
    res.status(201).json(serializeCollectionItem(result.rows[0]));
  } catch (err) {
    console.error("Add collection item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function removeCollectionItem(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const itemId = req.params.itemId as string;
    const coll = await query("SELECT user_id FROM collections WHERE id = $1", [id]);
    if (coll.rows.length === 0) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    if (coll.rows[0].user_id !== req.user!.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    await query("DELETE FROM collection_items WHERE id = $1 AND collection_id = $2", [itemId, id]);
    res.json({ message: "Item removed" });
  } catch (err) {
    console.error("Remove collection item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function likeCollection(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const coll = await query("SELECT id FROM collections WHERE id = $1", [id]);
    if (coll.rows.length === 0) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    await query(
      "INSERT INTO collection_likes (collection_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [id, req.user!.userId]
    );
    const count = await query("SELECT COUNT(*)::int AS count FROM collection_likes WHERE collection_id = $1", [id]);
    res.json({ likeCount: count.rows[0].count, likedByMe: true });
  } catch (err) {
    console.error("Like collection error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function unlikeCollection(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const coll = await query("SELECT id FROM collections WHERE id = $1", [id]);
    if (coll.rows.length === 0) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }
    await query(
      "DELETE FROM collection_likes WHERE collection_id = $1 AND user_id = $2",
      [id, req.user!.userId]
    );
    const count = await query("SELECT COUNT(*)::int AS count FROM collection_likes WHERE collection_id = $1", [id]);
    res.json({ likeCount: count.rows[0].count, likedByMe: false });
  } catch (err) {
    console.error("Unlike collection error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
