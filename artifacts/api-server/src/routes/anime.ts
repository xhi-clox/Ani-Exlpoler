import { Router } from "express";
import { GetTrendingQueryParams, GetRecentQueryParams, GetUpcomingQueryParams, SearchAnimeQueryParams, GetAnimeInfoParams } from "@workspace/api-zod";
import { getTrending, getRecent, getUpcoming, searchAnime, getAnimeInfo } from "../providers";

const router = Router();

router.get("/anime/trending", async (req, res) => {
  const parsed = GetTrendingQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  try {
    const data = await getTrending(page);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch trending");
    res.status(502).json({ error: "Failed to fetch trending anime", provider: process.env.ANIME_PROVIDER || "auto" });
  }
});

router.get("/anime/recent", async (req, res) => {
  const parsed = GetRecentQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  try {
    const data = await getRecent(page);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch recent");
    res.status(502).json({ error: "Failed to fetch recent anime", provider: process.env.ANIME_PROVIDER || "auto" });
  }
});

router.get("/anime/upcoming", async (req, res) => {
  const parsed = GetUpcomingQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  try {
    const data = await getUpcoming(page);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch upcoming");
    res.status(502).json({ error: "Failed to fetch upcoming anime", provider: process.env.ANIME_PROVIDER || "auto" });
  }
});

router.get("/anime/search", async (req, res) => {
  const parsed = SearchAnimeQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing required param: q" });
    return;
  }
  const { q, page } = parsed.data;
  try {
    const data = await searchAnime(q, page ?? 1);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to search anime");
    res.status(502).json({ error: "Failed to search anime", provider: process.env.ANIME_PROVIDER || "auto" });
  }
});

router.get("/anime/search-characters", async (req, res) => {
  const q = req.query.q as string;
  if (!q || q.length < 2) {
    res.status(400).json({ error: "Query param 'q' required (min 2 chars)" });
    return;
  }
  try {
    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 8) {
          characters(search: $search) {
            id
            name { full }
            image { large }
            media(page: 1, perPage: 1) {
              nodes { title { romaji english } }
            }
          }
        }
      }
    `;
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { search: q } }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("AniList character search failed");
    const json = await response.json() as {
      data: { Page: { characters: { id: number; name: { full: string }; image: { large: string | null }; media: { nodes: { title: { romaji: string; english: string | null } }[] } }[] } };
    };
    res.json({
      results: (json.data?.Page?.characters ?? []).map((c) => ({
        characterId: c.id,
        name: c.name.full,
        imageUrl: c.image?.large ?? null,
        animeName: c.media?.nodes?.[0]?.title?.english || c.media?.nodes?.[0]?.title?.romaji || null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to search characters");
    res.status(502).json({ error: "Failed to search characters" });
  }
});

router.get("/anime/:id", async (req, res) => {
  const parsed = GetAnimeInfoParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid anime id" });
    return;
  }
  const { id } = parsed.data;
  try {
    const data = await getAnimeInfo(id);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch anime info");
    res.status(404).json({ error: "Anime not found" });
  }
});

router.get("/anime/:id/episodes", async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  try {
    const data = await fetch(`https://api.jikan.moe/v4/anime/${id}/episodes?page=${page}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!data.ok) throw new Error(`Jikan episodes ${data.status}`);
    const json = await data.json() as {
      data: { mal_id: number; title: string; aired: string; episode: number }[];
      pagination: { last_visible_page: number; has_next_page: boolean };
    };
    res.json({
      episodes: json.data.map((ep) => ({
        id: ep.mal_id,
        number: ep.episode,
        title: ep.title,
        aired: ep.aired,
      })),
      pagination: {
        lastPage: json.pagination.last_visible_page,
        hasNextPage: json.pagination.has_next_page,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch episodes");
    res.status(502).json({ error: "Failed to fetch episodes" });
  }
});

router.get("/anime/:id/characters", async (req, res) => {
  const { id } = req.params;
  try {
    const data = await fetch(`https://api.jikan.moe/v4/anime/${id}/characters`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!data.ok) throw new Error(`Jikan characters ${data.status}`);
    const json = await data.json() as {
      data: {
        character: { mal_id: number; name: string; images: { jpg: { image_url: string } } };
        role: string;
        voice_actors: { person: { name: string; images: { jpg: { image_url: string } } }; language: string }[];
      }[];
    };
    res.json({
      results: json.data.map((c) => ({
        characterId: c.character.mal_id,
        name: c.character.name,
        imageUrl: c.character.images?.jpg?.image_url ?? null,
        role: c.role,
        voiceActors: c.voice_actors?.map((va) => ({
          name: va.person.name,
          imageUrl: va.person.images?.jpg?.image_url ?? null,
          language: va.language,
        })) ?? [],
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch characters");
    res.status(502).json({ error: "Failed to fetch characters" });
  }
});

export default router;
