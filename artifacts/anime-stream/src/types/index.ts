export interface User {
  id: string;
  username: string;
  email: string;
  bio: string;
  pronouns: string;
  avatarUrl: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Analysis {
  id: string;
  userId: string;
  animeId: number;
  title: string;
  content: string;
  analysisType: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  upvoteCount: number;
  commentCount: number;
  author?: {
    username: string;
    avatarUrl: string;
  };
  userUpvoted?: boolean;
}

export interface AnalysisListResponse {
  page: number;
  totalPages: number;
  total: number;
  results: Analysis[];
}

export interface TopAnimeEntry {
  animeId: number;
  title: string;
  imageUrl: string;
  rank: number;
}

export interface CharacterEntry {
  characterId: number;
  name: string;
  imageUrl: string;
  animeName: string;
  note?: string;
  label?: string;
  rank: number;
}

export type ProfileWorkType = "ANIME" | "MANGA" | "MANHWA" | "NOVEL" | "MOVIE";

export interface FavoriteWorkEntry {
  id: string;
  animeId: number | null;
  title: string;
  type: ProfileWorkType;
  meta: string;
  rating: string;
  imageUrl: string;
  rank: number;
}

export interface ProfileQuoteEntry {
  id: string;
  text: string;
  attribution: string;
  source: string;
  favorite: boolean;
  original: boolean;
  rank: number;
}

export interface PinnedWork {
  label: string;
  meta: string;
  title: string;
  quote: string;
  rating: string;
  stats: string[];
  image: string;
}

export interface PinnedQuote {
  label: string;
  text: string;
  attribution: string;
}

export interface TasteDimensionEntry {
  label: string;
  value: number;
}

export interface CurrentlyIntoEntry {
  icon: "book" | "headphones" | "screen" | "bookmark" | string;
  title: string;
  meta: string;
}

export interface InterestEntry {
  emoji: string;
  label: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  itemCount: number;
  likeCount?: number;
  likedByMe?: boolean;
  items?: CollectionItem[];
}

export interface CollectionItem {
  id: string;
  animeId: number;
  title: string;
  imageUrl: string;
  rank: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  bio: string;
  pronouns: string;
  avatarUrl: string;
  bannerUrl?: string;
  location?: string;
  languages?: string;
  websiteUrl?: string;
  instagram?: string;
  twitter?: string;
  malUsername?: string;
  currentlyReading?: { title: string; chapter: string };
  currentlyExploring?: string;
  favoriteTheme?: string;
  mood?: string;
  interests?: InterestEntry[];
  tasteDna?: TasteDimensionEntry[];
  pinnedWork?: PinnedWork;
  pinnedQuote?: PinnedQuote;
  currentlyInto?: CurrentlyIntoEntry[];
  traits?: string[];
  profileViewCount: number;
  createdAt: string;
  totalAnalyses: number;
  totalUpvotesReceived: number;
  reputationScore: number;
  followerCount: number;
  followingCount: number;
  profileUpvoteCount: number;
  isFollowing: boolean;
  userUpvotedProfile: boolean;
  topAnime: TopAnimeEntry[];
  topCharacters: CharacterEntry[];
  favoriteWorks?: FavoriteWorkEntry[];
  quotes?: ProfileQuoteEntry[];
  collections: Collection[];
  topAnalyses: Analysis[];
  recentAnalyses: Analysis[];
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  analysisId: string;
  parentCommentId: string | null;
  createdAt: string;
  upvoteCount: number;
  userUpvoted?: boolean;
  author: {
    username: string;
    avatarUrl: string;
  };
}

export interface CommentThread {
  id: string;
  content: string;
  userId: string;
  analysisId: string;
  createdAt: string;
  upvoteCount: number;
  userUpvoted?: boolean;
  author: { username: string; avatarUrl: string };
  replies: Comment[];
}

export interface CommentListResponse {
  page: number;
  totalPages: number;
  total: number;
  results: CommentThread[];
}

export interface StreamingSource {
  id: string;
  animeId: number;
  episodeNumber: number;
  siteName: string;
  siteUrl: string;
  language: string;
  quality: string;
  isActive: boolean;
}

export interface WatchEntry {
  animeId: number;
  episodeNumber: number;
  watchedAt: string;
  siteName?: string;
  siteUrl?: string;
}

export interface WatchProgress {
  animeId: number;
  currentEpisode: number;
  totalEpisodes: number | null;
  completed: boolean;
  updatedAt: string;
}

export interface LinkReport {
  sourceId: string;
  reportType: "dead" | "wrong_episode" | "wrong_anime" | "other";
  notes?: string;
}
