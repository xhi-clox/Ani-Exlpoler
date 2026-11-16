import type { CatalogItem } from "./types";
import { cachedJson, fetchJson, stripHtml, uniqueBy } from "./http";

const DEEZER = "https://api.deezer.com";

type DeezerTrack = {
  id?: number;
  title?: string;
  duration?: number;
  rank?: number;
  link?: string;
  preview?: string;
  artist?: { name?: string };
  album?: { title?: string; cover_medium?: string; cover_big?: string };
};

type DeezerArtist = {
  id?: number;
  name?: string;
  link?: string;
  picture_medium?: string;
  picture_big?: string;
  nb_fan?: number;
  nb_album?: number;
};

function mapTrack(track: DeezerTrack): CatalogItem {
  const artist = track.artist?.name || "";
  const album = track.album?.title || "";
  return {
    id: String(track.id ?? ""),
    category: "MUSIC",
    title: track.title || "Untitled",
    subtitle: [artist, album].filter(Boolean).join(" · "),
    image: track.album?.cover_big || track.album?.cover_medium || null,
    description: [album, artist].filter(Boolean).join(" · "),
    year: null,
    rating: null,
    externalUrl: track.link || null,
    source: "deezer",
    metadata: {
      artist,
      album,
      duration: track.duration ?? null,
      popularity: track.rank ?? null,
      preview: track.preview ?? null,
    },
  };
}

function mapArtist(artist: DeezerArtist): CatalogItem {
  return {
    id: String(artist.id ?? ""),
    category: "ARTIST",
    title: artist.name || "Unknown artist",
    subtitle: artist.nb_fan ? `${artist.nb_fan.toLocaleString("en-US")} fans` : "Artist",
    image: artist.picture_big || artist.picture_medium || null,
    description: [artist.nb_album ? `${artist.nb_album} releases` : null, artist.nb_fan ? `${artist.nb_fan.toLocaleString("en-US")} fans` : null]
      .filter(Boolean)
      .join(" · "),
    year: null,
    rating: null,
    externalUrl: artist.link || null,
    source: "deezer",
    metadata: {
      fans: artist.nb_fan ?? null,
      albums: artist.nb_album ?? null,
    },
  };
}

async function deezerData<T>(path: string): Promise<{ data?: T[]; total?: number }> {
  const payload = await fetchJson<{ data?: T[]; total?: number; error?: { message?: string } }>(`${DEEZER}${path}`);
  if (payload.error) throw new Error(payload.error.message || "Deezer request failed");
  return payload;
}

export function deezerTrackSearch(
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  const limit = 20;
  const index = (page - 1) * limit;
  return cachedJson(`deezer:track:${query.toLowerCase()}:${page}`, 300_000, async () => {
    const payload = await deezerData<DeezerTrack>(
      `/search?q=${encodeURIComponent(query)}&limit=${limit}&index=${index}`,
    );
    const items = uniqueBy((payload.data ?? []).filter((track) => track.id).map(mapTrack), (item) => item.id);
    return { items, hasNextPage: (payload.total ?? 0) > index + limit };
  });
}

export function deezerArtistSearch(
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  const limit = 20;
  const index = (page - 1) * limit;
  return cachedJson(`deezer:artist:${query.toLowerCase()}:${page}`, 300_000, async () => {
    const payload = await deezerData<DeezerArtist>(
      `/search/artist?q=${encodeURIComponent(query)}&limit=${limit}&index=${index}`,
    );
    const items = uniqueBy((payload.data ?? []).filter((artist) => artist.id).map(mapArtist), (item) => item.id);
    return { items, hasNextPage: (payload.total ?? 0) > index + limit };
  });
}

export function deezerChartTracks(): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson("deezer:featured:tracks", 600_000, async () => {
    const payload = await deezerData<DeezerTrack>("/chart/0/tracks?limit=25");
    return {
      items: uniqueBy((payload.data ?? []).filter((track) => track.id).map(mapTrack), (item) => item.id),
      hasNextPage: false,
    };
  });
}

export function deezerChartArtists(): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  return cachedJson("deezer:featured:artists", 600_000, async () => {
    const payload = await deezerData<DeezerArtist>("/chart/0/artists?limit=25");
    return {
      items: uniqueBy((payload.data ?? []).filter((artist) => artist.id).map(mapArtist), (item) => item.id),
      hasNextPage: false,
    };
  });
}

export function deezerAlbumSearch(
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; hasNextPage: boolean }> {
  const limit = 20;
  const index = (page - 1) * limit;
  return cachedJson(`deezer:album:${query.toLowerCase()}:${page}`, 300_000, async () => {
    const payload = await deezerData<{ id?: number; title?: string; cover_big?: string; link?: string; artist?: { name?: string }; nb_tracks?: number }>(
      `/search/album?q=${encodeURIComponent(query)}&limit=${limit}&index=${index}`,
    );
    const items = (payload.data ?? [])
      .filter((album) => album.id)
      .map((album): CatalogItem => ({
        id: String(album.id ?? ""),
        category: "MUSIC",
        title: album.title || "Untitled",
        subtitle: [album.artist?.name, album.nb_tracks ? `${album.nb_tracks} tracks` : null].filter(Boolean).join(" · "),
        image: album.cover_big || null,
        description: [album.artist?.name, album.nb_tracks ? `${album.nb_tracks} tracks` : null].filter(Boolean).join(" · "),
        year: null,
        rating: null,
        externalUrl: album.link || null,
        source: "deezer",
        metadata: { artist: album.artist?.name ?? null, tracks: album.nb_tracks ?? null },
      }))
      .filter((item) => item.id);
    return { items, hasNextPage: (payload.total ?? 0) > index + limit };
  });
}

export function cleanDeezerText(value: string | null | undefined): string {
  return stripHtml(value, 200);
}
