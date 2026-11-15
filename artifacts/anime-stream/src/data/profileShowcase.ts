// Content that powers the profile showcase. The server only stores the core
// profile (bio, avatar, stats, analyses, favorites, collections), so the
// editorial blocks of the showcase are defined here. Real profile data takes
// priority wherever it exists.

export type WorkType = "ANIME" | "MANGA" | "MANHWA" | "NOVEL" | "MOVIE";

export interface FavoriteWork {
  id: string;
  title: string;
  meta: string;
  rating?: string;
  type: WorkType;
  image?: string;
  novelAuthor?: string;
}

export interface ProfileCharacter {
  id: string;
  name: string;
  series: string;
  note?: string;
  label: string;
  image?: string;
}

export interface ProfileQuote {
  id: string;
  text: string;
  attribution: string;
  source?: string;
  favorite?: boolean;
  original?: boolean;
}

export interface ProfileList {
  id: string;
  index: string;
  title: string;
  entries: number;
  likes?: number;
  images: string[];
}

export interface TasteDimension {
  label: string;
  value: number;
}

export interface CurrentlyIntoItem {
  icon: "book" | "headphones" | "screen" | "bookmark";
  title: string;
  meta: string;
}

export interface Interest {
  emoji: string;
  label: string;
}

export interface Badge {
  id: string;
  label: string;
  icon: "pen" | "book" | "moon" | "sprout";
  gradient: string;
  iconColor: string;
}

export interface ElsewhereLink {
  id: string;
  label: string;
  value: string;
  href: string;
  icon: "instagram" | "x" | "mal" | "globe";
}

export interface ActivityEntry {
  id: string;
  icon: "star" | "heart" | "list" | "pen";
  text: string;
  highlight: string;
  time: string;
}

export interface PinnedBlock {
  label: string;
  meta: string;
  title: string;
  quote: string;
  rating: string;
  stats: string[];
  image: string;
}

export interface ShowcaseQuote {
  label: string;
  text: string;
  attribution: string;
}

export const PROFILE_ASSET_BASE = `${import.meta.env.BASE_URL}profile/`;

export const asset = (name: string) => `${PROFILE_ASSET_BASE}${name}`;

export const PREVIEW_USERNAME = "xhi-clox";

export const PROFILE_TRAITS = [
  { icon: "sparkles", label: "Fiction enthusiast" },
  { icon: "target", label: "Character studies" },
  { icon: "moon", label: "Psychological fiction" },
  { icon: "swords", label: "Dark fantasy" },
  { icon: "pen", label: "Writes analyses" },
] as const;

export const PINNED_BLOCK: PinnedBlock = {
  label: "THE ONE THAT DEFINES ME",
  meta: "MANGA · NAOKI URASAWA",
  title: "MONSTER",
  quote: "“It taught me that the scariest monsters are the ones who make perfect sense.”",
  rating: "9.8",
  stats: ["Re-read 3×", "Since 2019"],
  image: asset("monster.jpg"),
};

export const PINNED_QUOTE: ShowcaseQuote = {
  label: "A LINE I LIVE BY",
  text: "“And, when you can't go back, you have to worry only about the best way of moving forward.”",
  attribution: "The same old curiosity",
};

export const TASTE_DNA: TasteDimension[] = [
  { label: "Psychological", value: 92 },
  { label: "Character-driven", value: 88 },
  { label: "Philosophical", value: 80 },
  { label: "Dark fantasy", value: 74 },
];

export const FAVORITE_THEME = "Identity & fate";
export const PROFILE_MOOD = "Thought-provoking";

export const CURRENTLY_INTO: CurrentlyIntoItem[] = [
  { icon: "book", title: "Vagabond", meta: "Ch. 214 / 327" },
  { icon: "headphones", title: "Radiohead", meta: "In Rainbows · on loop" },
  { icon: "screen", title: "Monster", meta: "Rewatching · Ep 38" },
  { icon: "bookmark", title: "The Brothers Karamazov", meta: "Up next" },
];

export const DEMO_FAVORITES: FavoriteWork[] = [
  {
    id: "aot",
    title: "Attack on Titan",
    meta: "Dark fantasy · 2013",
    rating: "10",
    type: "ANIME",
    image: asset("attack-on-titan.jpg"),
  },
  {
    id: "steins-gate",
    title: "Steins;Gate",
    meta: "Sci-fi · 2011",
    rating: "10",
    type: "ANIME",
    image: asset("steins-gate.jpg"),
  },
  {
    id: "berserk",
    title: "Berserk",
    meta: "Dark fantasy · 1989",
    rating: "10",
    type: "MANGA",
    image: asset("berserk.jpg"),
  },
  {
    id: "monster",
    title: "Monster",
    meta: "Psychological · 1994",
    rating: "9.8",
    type: "MANGA",
    image: asset("monster.jpg"),
  },
  {
    id: "orv",
    title: "Omniscient Reader's Viewpoint",
    meta: "Meta fantasy · 2020",
    rating: "9.6",
    type: "MANHWA",
    image: asset("omniscient-reader.jpg"),
  },
  {
    id: "crime-punishment",
    title: "Crime and Punishment",
    meta: "Literary · 1866",
    rating: "9.7",
    type: "NOVEL",
    novelAuthor: "FYODOR DOSTOEVSKY",
  },
  {
    id: "perfect-blue",
    title: "Perfect Blue",
    meta: "Psychological · 1997",
    rating: "9.5",
    type: "MOVIE",
    image: asset("perfect-blue.jpg"),
  },
];

export const DEMO_CHARACTERS: ProfileCharacter[] = [
  {
    id: "guts",
    name: "Guts",
    series: "Berserk",
    note: "Refuses to kneel to fate — even when fate is all there is.",
    label: "THE DEFIANT",
    image: asset("guts.jpg"),
  },
  {
    id: "johan",
    name: "Johan Liebert",
    series: "Monster",
    note: "The most unsettling villain I've met — because he's so calm.",
    label: "THE VOID",
    image: asset("johan.jpg"),
  },
  {
    id: "okabe",
    name: "Rintarou Okabe",
    series: "Steins;Gate",
    note: "A clown persona hiding the heaviest heart in the series.",
    label: "THE MASK",
    image: asset("okabe.jpg"),
  },
  {
    id: "dokja",
    name: "Kim Dokja",
    series: "Omniscient Reader's Viewpoint",
    note: "Every reader who's ever loved a story too much.",
    label: "THE READER",
    image: asset("dokja.jpg"),
  },
];

export const DEMO_QUOTES: ProfileQuote[] = [
  {
    id: "kino",
    text: "“The world is not beautiful, therefore it is.”",
    attribution: "Kino's Journey",
    favorite: true,
  },
  {
    id: "okabe-quote",
    text: "“No one knows what the future holds. That's why its potential is infinite.”",
    attribution: "Rintarou Okabe",
    source: "Steins;Gate",
  },
  {
    id: "dostoevsky",
    text: "“Pain and suffering are always inevitable for a large intelligence and a deep heart.”",
    attribution: "Dostoevsky",
    source: "Crime and Punishment",
  },
  {
    id: "gutss-quote",
    text: "“Strength isn't measured by victory. It's measured by the refusal to surrender.”",
    attribution: "my own words, from Guts — Defiance Against Fate",
    original: true,
  },
];

export const DEMO_LISTS: ProfileList[] = [
  {
    id: "list-1",
    index: "LIST 01",
    title: "Stories that changed my perspective",
    entries: 12,
    likes: 24,
    images: [asset("attack-on-titan.jpg"), asset("steins-gate.jpg"), asset("omniscient-reader.jpg")],
  },
  {
    id: "list-2",
    index: "LIST 02",
    title: "My favorite morally grey characters",
    entries: 8,
    likes: 17,
    images: [asset("johan.jpg"), asset("okabe.jpg"), asset("berserk.jpg")],
  },
  {
    id: "list-3",
    index: "LIST 03",
    title: "Psychological fiction worth exploring",
    entries: 15,
    likes: 31,
    images: [asset("perfect-blue.jpg"), asset("monster.jpg"), asset("berserk.jpg")],
  },
];

export const DEMO_ACTIVITY: ActivityEntry[] = [
  { id: "a1", icon: "star", text: "Rated", highlight: "Perfect Blue 9.5", time: "2d ago" },
  { id: "a2", icon: "heart", text: "Added", highlight: "Kim Dokja to favorite characters", time: "4d ago" },
  { id: "a3", icon: "list", text: "Created list", highlight: "Psychological fiction worth exploring", time: "1w ago" },
];

export const TASTE_MATCH = {
  percent: 78,
  shared: ["Monster", "Berserk", "Psychological", "Philosophy"],
};

export const INTERESTS: Interest[] = [
  { emoji: "🧠", label: "Psychology" },
  { emoji: "🏛", label: "Philosophy" },
  { emoji: "📚", label: "Literature" },
  { emoji: "✍️", label: "Writing" },
  { emoji: "🎧", label: "Music" },
  { emoji: "🎨", label: "Digital art" },
  { emoji: "📜", label: "History" },
  { emoji: "🗺", label: "Worldbuilding" },
];

export const CURRENTLY_EXPLORING =
  "Existentialism, unreliable narrators, symbolism in fiction, and the works of Dostoevsky.";

export const DEMO_ABOUT =
  "I enjoy exploring the ideas hidden beneath a story's surface — layered characters, morally complex narratives, psychological tension, and fiction that leaves room for interpretation. Usually found reading, collecting thoughts, or falling down another rabbit hole.";

export const DEMO_BIO =
  "A reader, observer, and occasional overthinker. Drawn to stories that stay with you long after they end.";

export const BADGES: Badge[] = [
  {
    id: "first-pen",
    label: "First Pen",
    icon: "pen",
    gradient: "linear-gradient(145deg,#164e5c,#0f2f3a)",
    iconColor: "#5EEAD4",
  },
  {
    id: "deep-diver",
    label: "Deep Diver",
    icon: "book",
    gradient: "linear-gradient(145deg,#5a4310,#2e240a)",
    iconColor: "#FCD34D",
  },
  {
    id: "night-owl",
    label: "Night Owl",
    icon: "moon",
    gradient: "linear-gradient(145deg,#2b2454,#1a1735)",
    iconColor: "#C4B5FD",
  },
  {
    id: "early-bird",
    label: "Early Bird",
    icon: "sprout",
    gradient: "linear-gradient(145deg,#17422f,#0f2a22)",
    iconColor: "#86EFAC",
  },
];

export const ELSEWHERE: ElsewhereLink[] = [
  {
    id: "instagram",
    label: "Instagram",
    value: "@xhi-clox",
    href: "https://instagram.com/xhi-clox",
    icon: "instagram",
  },
  {
    id: "x",
    label: "X",
    value: "@xhi-clox",
    href: "https://x.com/xhi-clox",
    icon: "x",
  },
  {
    id: "mal",
    label: "MyAnimeList",
    value: "Profile",
    href: "https://myanimelist.net/profile/xhi-clox",
    icon: "mal",
  },
  {
    id: "website",
    label: "Website",
    value: "Visit",
    href: "https://analithe.app",
    icon: "globe",
  },
];

export const DEMO_ACTIVITY_ANALYSIS = {
  type: "Character Breakdown",
  meta: "Berserk · Jul 18, 2026 · 8 min read",
  title: "Guts — Defiance Against Fate",
  excerpt:
    "Few protagonists suffer as relentlessly as Guts. Born from death, betrayed by those he trusted, hunted by demons, and cursed by destiny itself — every stage of his life seems designed to break him.",
  upvotes: 3,
  comments: 2,
  views: 20,
  image: asset("guts.jpg"),
};
