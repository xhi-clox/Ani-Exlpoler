import { Router } from "express";
import {
  CATALOG_CATEGORIES,
  featuredCatalog,
  parseCatalogCategory,
  searchCatalog,
} from "../providers/catalog";

const router = Router();

function pageParam(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 50) : 1;
}

router.get("/catalog/categories", (_req, res) => {
  res.json({
    results: CATALOG_CATEGORIES,
    providers: {
      tmdb: Boolean(process.env.TMDB_API_KEY || process.env.TMDB_ACCESS_TOKEN),
      rawg: Boolean(process.env.RAWG_API_KEY),
    },
  });
});

router.get("/catalog/search", async (req, res) => {
  const category = parseCatalogCategory(req.query.category);
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!category) {
    res.status(400).json({
      error: "Unknown category. Use one of: " + CATALOG_CATEGORIES.map((entry) => entry.id).join(", "),
    });
    return;
  }

  if (!query) {
    res.status(400).json({ error: "q is required" });
    return;
  }

  try {
    const data = await searchCatalog(category, query, pageParam(req.query.page));
    res.json(data);
  } catch (err) {
    req.log.error({ err, category, query }, "Catalog search failed");
    res.status(502).json({
      error: err instanceof Error ? err.message : "Catalog search failed",
      category,
    });
  }
});

router.get("/catalog/featured", async (req, res) => {
  const category = parseCatalogCategory(req.query.category);

  if (!category) {
    res.status(400).json({
      error: "Unknown category. Use one of: " + CATALOG_CATEGORIES.map((entry) => entry.id).join(", "),
    });
    return;
  }

  try {
    const data = await featuredCatalog(category);
    res.json(data);
  } catch (err) {
    req.log.error({ err, category }, "Catalog featured fetch failed");
    res.status(502).json({
      error: err instanceof Error ? err.message : "Catalog featured fetch failed",
      category,
    });
  }
});

export default router;
