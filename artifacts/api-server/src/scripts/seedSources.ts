import "dotenv/config";
import { query } from "../db/pool";
import { logger } from "../lib/logger";

interface SeedLink {
  animeId: number;
  episode: number;
  siteName: string;
  siteUrl: string;
  language: string;
  quality: string;
}

const SITES = [
  { name: "animepahe", urlPattern: "https://animepahe.ru/anime/{anilistSlug}" },
  { name: "gogoanime", urlPattern: "https://gogoanime3.co/{slug}-episode-{ep}" },
  { name: "hianime", urlPattern: "https://hianime.to/watch/{slug}-{ep}" },
  { name: "aniwave", urlPattern: "https://aniwave.to/watch/{slug}/{ep}" },
  { name: "crunchyroll", urlPattern: "https://crunchyroll.com/watch/{slug}/{ep}" },
];

async function fetchTopAnime(limit = 50): Promise<{ mal_id: number; title: string }[]> {
  const res = await fetch(`https://api.jikan.moe/v4/top/anime?limit=${limit}`);
  const data = await res.json() as { data: { mal_id: number; title: string }[] };
  return data.data;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seedFromJson(filePath: string): Promise<void> {
  const fs = await import("fs");
  const content = fs.readFileSync(filePath, "utf-8");
  const links: SeedLink[] = JSON.parse(content);
  let count = 0;
  for (const link of links) {
    try {
      await query(
        `INSERT INTO streaming_sources (anime_id, episode_number, site_name, site_url, language, quality)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (anime_id, episode_number, site_url) DO NOTHING`,
        [link.animeId, link.episode, link.siteName, link.siteUrl, link.language, link.quality]
      );
      count++;
    } catch (err) {
      logger.error({ err, link }, "Failed to seed link");
    }
  }
  logger.info({ count }, "Seeded links from JSON file");
}

async function seedAuto(topCount = 100): Promise<void> {
  logger.info({ topCount }, "Auto-seeding links for top anime");
  const anime = await fetchTopAnime(topCount);
  let count = 0;
  for (const a of anime) {
    const s = slugify(a.title);
    for (const site of SITES) {
      for (const ep of [0, 1]) {
        const url = site.urlPattern
          .replace("{slug}", s)
          .replace("{anilistSlug}", s)
          .replace("{ep}", String(ep));
        try {
          await query(
            `INSERT INTO streaming_sources (anime_id, episode_number, site_name, site_url)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (anime_id, episode_number, site_url) DO NOTHING`,
            [a.mal_id, ep, site.name, url]
          );
          count++;
        } catch {
          // skip
        }
      }
    }
  }
  logger.info({ count }, "Auto-seeded links");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--file") || args.includes("-f")) {
    const idx = args.indexOf("--file") !== -1 ? args.indexOf("--file") : args.indexOf("-f");
    const filePath = args[idx + 1];
    if (!filePath) { logger.error("No file path provided"); process.exit(1); }
    await seedFromJson(filePath);
  } else if (args.includes("--auto") || args.includes("-a")) {
    const topIdx = args.indexOf("--top") !== -1 ? args.indexOf("--top") : args.indexOf("-t");
    const topCount = topIdx !== -1 ? parseInt(args[topIdx + 1]) || 100 : 100;
    await seedAuto(topCount);
  } else {
    logger.info("Usage: pnpm tsx src/scripts/seedSources.ts --file <path> | --auto [--top 100]");
  }
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Seed script failed");
  process.exit(1);
});
