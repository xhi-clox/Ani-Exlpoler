import { Request, Response } from "express";
import { query } from "../db/pool";

export async function listCollections(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username as string;
    const user = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (user.rows.length === 0) { res.status(404).json({ error: "User not found" }); return; }
    const collections = await query(
      "SELECT id, title, description, created_at FROM collections WHERE user_id = $1 ORDER BY created_at DESC",
      [user.rows[0].id]
    );
    const withCounts = await Promise.all(
      collections.rows.map(async (c: Record<string, unknown>) => {
        const cnt = await query("SELECT COUNT(*)::int AS count FROM collection_items WHERE collection_id = $1", [c.id]);
        const items = await query(
          "SELECT id, anime_id, title, image_url, rank FROM collection_items WHERE collection_id = $1 ORDER BY rank ASC",
          [c.id]
        );
        return { id: c.id, title: c.title, description: c.description, createdAt: c.created_at, itemCount: cnt.rows[0].count, items: items.rows };
      })
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
    if (!title || title.length < 2) { res.status(400).json({ error: "Title must be at least 2 characters" }); return; }
    const user = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (user.rows.length === 0) { res.status(404).json({ error: "User not found" }); return; }
    if (user.rows[0].id !== req.user!.userId) { res.status(403).json({ error: "Not authorized" }); return; }
    const result = await query(
      "INSERT INTO collections (user_id, title, description) VALUES ($1, $2, $3) RETURNING id, title, description, created_at",
      [user.rows[0].id, title, description || ""]
    );
    res.status(201).json(result.rows[0]);
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
    if (coll.rows.length === 0) { res.status(404).json({ error: "Collection not found" }); return; }
    if (coll.rows[0].user_id !== req.user!.userId) { res.status(403).json({ error: "Not authorized" }); return; }
    const updates: string[] = [];
    const params: (string | number)[] = [];
    let idx = 1;
    if (title !== undefined) { updates.push(`title = $${idx++}`); params.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
    if (updates.length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
    updates.push("updated_at = NOW()");
    params.push(id);
    const result = await query(`UPDATE collections SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id, title, description, created_at`, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update collection error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteCollection(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const coll = await query("SELECT user_id FROM collections WHERE id = $1", [id]);
    if (coll.rows.length === 0) { res.status(404).json({ error: "Collection not found" }); return; }
    if (coll.rows[0].user_id !== req.user!.userId) { res.status(403).json({ error: "Not authorized" }); return; }
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
    const coll = await query("SELECT user_id FROM collections WHERE id = $1", [id]);
    if (coll.rows.length === 0) { res.status(404).json({ error: "Collection not found" }); return; }
    if (coll.rows[0].user_id !== req.user!.userId) { res.status(403).json({ error: "Not authorized" }); return; }
    const cnt = await query("SELECT COUNT(*)::int AS count FROM collection_items WHERE collection_id = $1", [id]);
    const result = await query(
      "INSERT INTO collection_items (collection_id, anime_id, title, image_url, rank) VALUES ($1, $2, $3, $4, $5) RETURNING id, anime_id, title, image_url, rank",
      [id, anime_id, title, image_url || "", cnt.rows[0].count + 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Add collection item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function removeCollectionItem(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string; const itemId = req.params.itemId as string;
    const coll = await query("SELECT user_id FROM collections WHERE id = $1", [id]);
    if (coll.rows.length === 0) { res.status(404).json({ error: "Collection not found" }); return; }
    if (coll.rows[0].user_id !== req.user!.userId) { res.status(403).json({ error: "Not authorized" }); return; }
    await query("DELETE FROM collection_items WHERE id = $1 AND collection_id = $2", [itemId, id]);
    res.json({ message: "Item removed" });
  } catch (err) {
    console.error("Remove collection item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
