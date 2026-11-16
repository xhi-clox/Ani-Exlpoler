import type { CatalogCategoryMeta, ProfileWorkType } from "../types";

export const CATALOG_CATEGORIES: CatalogCategoryMeta[] = [
  {
    id: "ANIME",
    label: "Anime",
    singular: "anime",
    blurb: "Japanese animation, films and series",
    source: "AniList · Jikan",
    accent: "#38C8E0",
  },
  {
    id: "MANGA",
    label: "Manga",
    singular: "manga",
    blurb: "Japanese comics and graphic novels",
    source: "AniList · Jikan",
    accent: "#A78BFA",
  },
  {
    id: "MANHWA",
    label: "Manhwa",
    singular: "manhwa",
    blurb: "Korean webcomics and print comics",
    source: "AniList",
    accent: "#F472B6",
  },
  {
    id: "MANHUA",
    label: "Manhua",
    singular: "manhua",
    blurb: "Chinese comics and webcomics",
    source: "AniList",
    accent: "#FB923C",
  },
  {
    id: "NOVEL",
    label: "Novels",
    singular: "novel",
    blurb: "Books, literature and light reading",
    source: "Open Library",
    accent: "#FCD34D",
  },
  {
    id: "MOVIE",
    label: "Movies",
    singular: "movie",
    blurb: "Films, cinema and documentaries",
    source: "TMDB · Wikidata · iTunes",
    accent: "#60A5FA",
  },
  {
    id: "TV",
    label: "TV Series",
    singular: "TV series",
    blurb: "Shows, seasons and episodes",
    source: "TMDB · TVmaze · iTunes",
    accent: "#34D399",
  },
  {
    id: "GAME",
    label: "Games",
    singular: "game",
    blurb: "Video games across every platform",
    source: "RAWG · CheapShark · FreeToGame",
    accent: "#F87171",
  },
  {
    id: "MUSIC",
    label: "Music",
    singular: "track",
    blurb: "Songs, albums and soundtracks",
    source: "Deezer · iTunes",
    accent: "#C084FC",
  },
  {
    id: "ARTIST",
    label: "Artists",
    singular: "artist",
    blurb: "Musicians, bands and composers",
    source: "Deezer · iTunes",
    accent: "#FB7185",
  },
];

export const CATALOG_BY_ID = Object.fromEntries(
  CATALOG_CATEGORIES.map((category) => [category.id, category]),
) as Record<ProfileWorkType, CatalogCategoryMeta>;

export const PROFILE_WORK_TYPES = CATALOG_CATEGORIES.map(
  (category) => category.id,
) as ProfileWorkType[];

export function categoryLabel(category: ProfileWorkType): string {
  return CATALOG_BY_ID[category]?.label ?? category;
}

export function categoryAccent(category: ProfileWorkType): string {
  return CATALOG_BY_ID[category]?.accent ?? "#38C8E0";
}
