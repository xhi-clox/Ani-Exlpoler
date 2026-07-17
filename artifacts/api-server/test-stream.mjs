
import { ANIME } from '@consumet/extensions';

const testAnime = "Demon Slayer";

const providers = [
  new ANIME.KickAssAnime(),
  new ANIME.AnimeSama(),
  new ANIME.AnimeSaturn(),
  new ANIME.AnimePahe(),
  new ANIME.Hianime(),
  new ANIME.AnimeUnity(),
  new ANIME.AnimeKai(),
];

async function testProvider(provider, name) {
  try {
    console.log(`Testing ${name}...`);
    const searchResults = await provider.search(testAnime);
    if (!searchResults.results?.length) {
      console.log(`No search results for ${name}`);
      return null;
    }
    const anime = searchResults.results[0];
    console.log(`Found anime: ${anime.title} (id: ${anime.id})`);

    const animeInfo = await provider.fetchAnimeInfo(anime.id);
    if (!animeInfo.episodes?.length) {
      console.log(`No episodes for ${name}`);
      return null;
    }
    const firstEpisode = animeInfo.episodes[0];
    console.log(`First episode: #${firstEpisode.number} (id: ${firstEpisode.id})`);

    const episodeSources = await provider.fetchEpisodeSources(firstEpisode.id);
    console.log(`Episode sources from ${name}:`, episodeSources);
    if (!episodeSources.sources?.length) {
      console.log(`No sources for ${name}`);
      return null;
    }
    console.log(`${name} has ${episodeSources.sources.length} sources!`);
    for (const [index, source] of episodeSources.sources.entries()) {
      console.log(`  Source ${index + 1}: quality=${source.quality}, isM3U8=${source.isM3U8}, url=${source.url}`);
    }
    return { provider: name, sources: episodeSources.sources };
  } catch (err) {
    console.log(`${name} failed:`, err);
    return null;
  }
}

async function main() {
  for (let i = 0; i < providers.length; i++) {
    const result = await testProvider(providers[i], providers[i].constructor.name);
    if (result) {
      console.log("\n\nSUCCESS! Found working provider:", result.provider);
      break;
    }
  }
}

main().catch(console.error);
