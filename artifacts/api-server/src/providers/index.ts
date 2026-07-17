import type { AnimeProvider, AnimeListResponse, AnimeInfo } from "./types";
import { jikanProvider } from "./jikan";
import { anilistProvider } from "./anilist";

export type { AnimeProvider, AnimeResult, AnimeListResponse, AnimeInfo, Episode } from "./types";

const providers: Record<string, AnimeProvider> = {
  jikan: jikanProvider,
  anilist: anilistProvider,
};

const providerOrder = ["jikan", "anilist"];

function getActiveProvider(): string {
  return process.env.ANIME_PROVIDER || "auto";
}

function isServerError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message;
    return /→ \d{3}/.test(msg) || /→ 0/.test(msg) || msg.includes("fetch failed") || msg.includes("network") || msg.includes("not found");
  }
  return false;
}

async function tryProviders<T>(fallbackName: string | null, fn: (p: AnimeProvider) => Promise<T>): Promise<T> {
  const mode = getActiveProvider();

  if (mode === "auto") {
    const errors: Error[] = [];
    for (const name of providerOrder) {
      try {
        return await fn(providers[name]);
      } catch (err) {
        if (isServerError(err) || name === providerOrder[providerOrder.length - 1]) {
          errors.push(err as Error);
        } else {
          errors.push(err as Error);
          continue;
        }
      }
    }
    throw errors[errors.length - 1];
  }

  if (mode === "fallback" && fallbackName) {
    try {
      return await fn(providers[fallbackName]);
    } catch {
      const alt = providerOrder.find((p) => p !== fallbackName);
      if (alt) return await fn(providers[alt]);
      throw new Error("All providers failed");
    }
  }

  const provider = providers[mode];
  if (!provider) throw new Error(`Unknown provider: ${mode}. Use: ${Object.keys(providers).join(", ")}, auto, or fallback`);
  return await fn(provider);
}

export async function getTrending(page = 1): Promise<AnimeListResponse> {
  return tryProviders("jikan", (p) => p.getTrending(page));
}

export async function getRecent(page = 1): Promise<AnimeListResponse> {
  return tryProviders("jikan", (p) => p.getRecent(page));
}

export async function getUpcoming(page = 1): Promise<AnimeListResponse> {
  return tryProviders("jikan", (p) => p.getUpcoming(page));
}

export async function searchAnime(q: string, page = 1): Promise<AnimeListResponse> {
  return tryProviders("jikan", (p) => p.search(q, page));
}

export async function getAnimeInfo(id: string): Promise<AnimeInfo> {
  return tryProviders("jikan", (p) => p.getAnimeInfo(id));
}
