import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Bookmark,
  BookOpen,
  CalendarDays,
  Check,
  Dna,
  ExternalLink,
  Eye,
  Feather,
  Globe,
  Headphones,
  Heart,
  Instagram,
  ListChecks,
  Mail,
  MapPin,
  MessageSquare,
  MonitorPlay,
  Moon,
  Palette,
  PenLine,
  PencilRuler,
  Plus,
  Share2,
  Sparkles,
  Sprout,
  Star,
  Swords,
  Target,
  type LucideIcon,
} from "lucide-react";
import { ApiError } from "../api/client";
import {
  followUser,
  getProfile,
  likeCollection,
  removeProfileUpvote,
  unlikeCollection,
  unfollowUser,
  upvoteProfile,
} from "../api/users";
import { useAuth } from "../hooks/useAuth";
import { ANALYSIS_TYPE_LABELS, formatDate } from "../utils/formatting";
import type {
  Analysis,
  CharacterEntry,
  Collection,
  FavoriteWorkEntry,
  ProfileQuoteEntry,
  TopAnimeEntry,
  UserProfile as ProfileData,
} from "../types";
import {
  asset,
  BADGES,
  CURRENTLY_EXPLORING,
  CURRENTLY_INTO,
  DEMO_ABOUT,
  DEMO_ACTIVITY,
  DEMO_ACTIVITY_ANALYSIS,
  DEMO_BIO,
  DEMO_CHARACTERS,
  DEMO_FAVORITES,
  DEMO_LISTS,
  DEMO_QUOTES,
  ELSEWHERE,
  INTERESTS,
  PINNED_BLOCK,
  PINNED_QUOTE,
  PREVIEW_USERNAME,
  PROFILE_TRAITS,
  TASTE_DNA,
  TASTE_MATCH,
  type ActivityEntry,
  type ElsewhereLink,
  type FavoriteWork,
  type ProfileCharacter,
  type ProfileList,
  type ProfileQuote,
  type WorkType,
} from "../data/profileShowcase";

const ACCENT = "#38C8E0";
const PANEL = "#11161D";
const LINE = "#1E2630";

const PREVIEW_DISPLAY_NAME = "xhi clox";
const PREVIEW_PROFILE: ProfileData = {
  id: "preview-profile",
  username: PREVIEW_USERNAME,
  bio: DEMO_BIO,
  pronouns: "",
  avatarUrl: asset("avatar.jpg"),
  profileViewCount: 58,
  createdAt: "2026-07-01T00:00:00.000Z",
  totalAnalyses: 5,
  totalUpvotesReceived: 9,
  reputationScore: 40,
  followerCount: 3,
  followingCount: 12,
  profileUpvoteCount: 0,
  isFollowing: false,
  userUpvotedProfile: false,
  topAnime: [],
  topCharacters: [],
  collections: [],
  topAnalyses: [],
  recentAnalyses: [],
};

const TRAIT_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  target: Target,
  moon: Moon,
  swords: Swords,
  pen: PenLine,
};

const INTO_ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  headphones: Headphones,
  screen: MonitorPlay,
  bookmark: Bookmark,
};

const BADGE_ICONS: Record<string, LucideIcon> = {
  pen: Feather,
  book: BookOpen,
  moon: Moon,
  sprout: Sprout,
};

const ACTIVITY_ICONS: Record<ActivityEntry["icon"], { Icon: LucideIcon; className: string }> = {
  star: { Icon: Star, className: "bg-[#FCD34D]/10 text-[#FCD34D]" },
  heart: { Icon: Heart, className: "bg-[#FB7185]/10 text-[#FB7185]" },
  list: { Icon: ListChecks, className: "bg-[#38C8E0]/10 text-[#38C8E0]" },
  pen: { Icon: PenLine, className: "bg-[#A78BFA]/10 text-[#A78BFA]" },
};

const WORK_TYPE_COLORS: Record<WorkType, string> = {
  ANIME: "text-[#7DD3FC]",
  MANGA: "text-[#FDA4AF]",
  MANHWA: "text-[#6EE7B7]",
  NOVEL: "text-[#FCD34D]",
  MOVIE: "text-[#C4B5FD]",
};

const CHARACTER_LABELS = ["THE DEFIANT", "THE VOID", "THE MASK", "THE READER", "THE DREAMER", "THE WANDERER"];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTier(score: number) {
  if (score >= 500) return "Legend";
  if (score >= 200) return "Master";
  if (score >= 75) return "Enthusiast";
  if (score >= 25) return "Contributor";
  return "Newcomer";
}

function getLevel(score: number) {
  return Math.max(1, Math.floor(score / 25) + 1);
}

function readTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(words / 200));
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function joinedLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function favoritesFromAnime(items: TopAnimeEntry[]): FavoriteWork[] {
  return items.map((item) => ({
    id: `anime-${item.animeId}`,
    title: item.title,
    meta: `Ranked #${item.rank}`,
    type: "ANIME",
    image: item.imageUrl || undefined,
  }));
}

function favoritesFromApi(items: FavoriteWorkEntry[]): FavoriteWork[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    meta: item.meta || item.type,
    rating: item.rating || undefined,
    type: item.type,
    image: item.imageUrl || undefined,
  }));
}

function charactersFromApi(items: CharacterEntry[]): ProfileCharacter[] {
  return items.map((item, index) => ({
    id: `character-${item.characterId}-${index}`,
    name: item.name,
    series: item.animeName || "Favorite character",
    note: item.note || undefined,
    label: item.label || CHARACTER_LABELS[index % CHARACTER_LABELS.length],
    image: item.imageUrl || undefined,
  }));
}

function quotesFromApi(items: ProfileQuoteEntry[]): ProfileQuote[] {
  return items.map((quote) => ({
    id: quote.id,
    text: quote.text,
    attribution: quote.attribution,
    source: quote.source || undefined,
    favorite: quote.favorite,
    original: quote.original,
  }));
}

function listsFromCollections(items: Collection[]): ProfileList[] {
  return items.slice(0, 3).map((collection, index) => ({
    id: collection.id,
    index: `LIST 0${index + 1}`,
    title: collection.title,
    entries: collection.itemCount,
    likes: collection.likeCount,
    images: (collection.items ?? [])
      .map((item) => item.imageUrl)
      .filter(Boolean)
      .slice(0, 3),
  }));
}

function SectionHead({
  eyebrow,
  title,
  action,
  hint,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <p className="font-condensed text-[9px] font-bold uppercase tracking-[0.34em] text-[#38C8E0]">{eyebrow}</p>
        <h2 className="mt-1 font-condensed text-[24px] font-bold leading-none text-[#F4F7FC]">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-4 pb-0.5">
        {hint ? <p className="max-w-[290px] text-right text-[9.5px] leading-relaxed text-[#8A94A6]">{hint}</p> : null}
        {action}
      </div>
    </div>
  );
}

function SidePanel({
  title,
  right,
  children,
  className = "",
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-[#1E2630] bg-[#11161D] ${className}`}>
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h2 className="font-condensed text-[11px] font-bold uppercase tracking-[0.16em] text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function TasteRing({ percent }: { percent: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * clamp(percent, 0, 100)) / 100;

  return (
    <div className="relative h-[58px] w-[58px] shrink-0">
      <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
        <circle cx="30" cy="30" r={radius} fill="none" stroke={LINE} strokeWidth="5" />
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke={ACCENT}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-condensed text-[18px] font-bold leading-none text-white">{percent}</span>
        <span className="mb-0.5 self-center font-condensed text-[10px] text-[#8A94A6]">%</span>
      </div>
    </div>
  );
}

function WorkCover({ work }: { work: FavoriteWork }) {
  if (work.image) {
    return (
      <img
        src={work.image}
        alt={work.title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
    );
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center p-3"
      style={{ background: "linear-gradient(150deg,#2b1512,#3d2018 55%,#170c0a)" }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center border border-[#FCD34D]/25 px-2 text-center">
        <p className="font-condensed text-[16px] uppercase tracking-[0.2em] text-[#FDE68A]">
          {work.novelAuthor ?? work.meta}
        </p>
        <span className="my-3 h-px w-8 bg-[#FCD34D]/35" />
        <h4 className="font-quote text-[19px] italic leading-tight text-[#FFFBEB]">{work.title}</h4>
      </div>
    </div>
  );
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("showcase");
  const [favoriteFilter, setFavoriteFilter] = useState<WorkType | "ALL">("ALL");
  const [copied, setCopied] = useState(false);
  const asideRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;

    setLoading(true);
    setNotFound(false);
    setPreview(false);

    getProfile(username)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
      })
      .catch((err) => {
        if (cancelled) return;
        // The seeded showcase persona doubles as the design preview when the
        // account (or the local API) is not available.
        if (err instanceof ApiError && err.status === 404 && username !== PREVIEW_USERNAME) {
          setNotFound(true);
        } else {
          setPreview(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  const data = profile ?? (preview ? PREVIEW_PROFILE : null);
  const isPreview = !profile && preview;
  const isOwn = Boolean(user && data && user.username === data.username);
  const displayName = isPreview
    ? PREVIEW_DISPLAY_NAME
    : data?.displayName || data?.username || username || "Profile";
  const location = isPreview ? "Bangladesh" : data?.location || "";
  const languages = isPreview ? "English, বাংলা" : data?.languages || "";

  // The pinned rail has its own scrollbar, but its overflow is locked to the
  // page's scroll progress. It updates in the same frame as the main column —
  // no easing or catch-up — so the two move together and finish together.
  useEffect(() => {
    if (loading) return;
    const aside = asideRef.current;
    if (!aside) return;

    const desktop = window.matchMedia("(min-width: 1024px)");
    let bounds: { start: number; end: number; max: number } | null = null;

    const measure = () => {
      bounds = null;
      if (!desktop.matches) return;

      const parent = aside.parentElement;
      if (!parent) return;

      const max = aside.scrollHeight - aside.clientHeight;
      if (max <= 0) {
        bounds = { start: 0, end: 0, max: 0 };
        return;
      }

      const stickyTop = Number.parseFloat(window.getComputedStyle(aside).top) || 0;
      const rect = parent.getBoundingClientRect();
      const parentTop = rect.top + window.scrollY;
      const parentBottom = rect.bottom + window.scrollY;
      bounds = {
        start: parentTop - stickyTop,
        end: parentBottom - stickyTop - aside.clientHeight,
        max,
      };
    };

    const apply = () => {
      if (!desktop.matches) return;
      if (!bounds) measure();
      if (!bounds || bounds.max <= 0 || bounds.end <= bounds.start) {
        aside.scrollTop = 0;
        return;
      }

      const progress = Math.min(Math.max((window.scrollY - bounds.start) / (bounds.end - bounds.start), 0), 1);
      aside.scrollTop = progress * bounds.max;
    };

    const remeasure = () => {
      measure();
      apply();
    };

    measure();
    apply();

    const observer = new ResizeObserver(remeasure);
    observer.observe(aside);
    if (aside.parentElement) observer.observe(aside.parentElement);

    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", remeasure);
    desktop.addEventListener("change", remeasure);

    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", remeasure);
      desktop.removeEventListener("change", remeasure);
      observer.disconnect();
    };
  }, [loading, username]);

  const handleFollow = async () => {
    if (!data || !user || isPreview) return;

    try {
      if (data.isFollowing) {
        await unfollowUser(data.username);
        setProfile({
          ...data,
          isFollowing: false,
          followerCount: Math.max(0, data.followerCount - 1),
        });
      } else {
        await followUser(data.username);
        setProfile({
          ...data,
          isFollowing: true,
          followerCount: data.followerCount + 1,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpvoteTaste = async () => {
    if (!data || !user || isPreview) return;

    try {
      if (data.userUpvotedProfile) {
        const res = await removeProfileUpvote(data.username);
        setProfile({ ...data, userUpvotedProfile: false, profileUpvoteCount: res.profileUpvoteCount });
      } else {
        const res = await upvoteProfile(data.username);
        setProfile({ ...data, userUpvotedProfile: true, profileUpvoteCount: res.profileUpvoteCount });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLikeList = async (collectionId: string) => {
    if (!data || !user || isPreview) return;
    const target = data.collections.find((collection) => collection.id === collectionId);
    if (!target) return;

    try {
      const result = target.likedByMe
        ? await unlikeCollection(collectionId)
        : await likeCollection(collectionId);
      setProfile({
        ...data,
        collections: data.collections.map((collection) =>
          collection.id === collectionId
            ? { ...collection, likeCount: result.likeCount, likedByMe: result.likedByMe }
            : collection
        ),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const favorites = useMemo<FavoriteWork[]>(() => {
    if (!data) return [];
    if (data.favoriteWorks && data.favoriteWorks.length > 0) return favoritesFromApi(data.favoriteWorks);
    if (data.topAnime.length > 0) return favoritesFromAnime(data.topAnime);
    return isPreview ? DEMO_FAVORITES : [];
  }, [data, isPreview]);
  const characters = useMemo<ProfileCharacter[]>(() => {
    if (!data) return [];
    if (data.topCharacters.length > 0) return charactersFromApi(data.topCharacters);
    return isPreview ? DEMO_CHARACTERS : [];
  }, [data, isPreview]);
  const lists = useMemo<ProfileList[]>(() => {
    if (!data) return [];
    if (data.collections.length > 0) return listsFromCollections(data.collections);
    return isPreview ? DEMO_LISTS : [];
  }, [data, isPreview]);
  const quotes = useMemo<ProfileQuote[]>(() => {
    if (!data) return [];
    if (data.quotes && data.quotes.length > 0) return quotesFromApi(data.quotes);
    return isPreview ? DEMO_QUOTES : [];
  }, [data, isPreview]);

  const workCounts = useMemo(() => {
    const counts: Record<WorkType, number> = { ANIME: 0, MANGA: 0, MANHWA: 0, NOVEL: 0, MOVIE: 0 };
    favorites.forEach((work) => {
      counts[work.type] += 1;
    });
    return counts;
  }, [favorites]);

  const visibleFavorites = favoriteFilter === "ALL" ? favorites : favorites.filter((work) => work.type === favoriteFilter);

  const featuredAnalysis: Analysis | null = data?.recentAnalyses?.[0] ?? null;
  const featured = featuredAnalysis
    ? {
        id: featuredAnalysis.id,
        type: ANALYSIS_TYPE_LABELS[featuredAnalysis.analysisType] ?? featuredAnalysis.analysisType,
        meta: `${formatDate(featuredAnalysis.createdAt)} · ${readTime(featuredAnalysis.content)} min read`,
        title: featuredAnalysis.title,
        excerpt: featuredAnalysis.content,
        upvotes: featuredAnalysis.upvoteCount,
        comments: featuredAnalysis.commentCount,
        views: featuredAnalysis.viewCount,
        image: undefined as string | undefined,
      }
    : isPreview
      ? { ...DEMO_ACTIVITY_ANALYSIS, id: null }
      : null;

  const activityEntries = useMemo<ActivityEntry[]>(() => {
    if (!data) return [];
    if (isPreview) return DEMO_ACTIVITY;

    const entries: ActivityEntry[] = [];
    data.recentAnalyses.slice(0, 3).forEach((analysis) => {
      entries.push({
        id: `analysis-${analysis.id}`,
        icon: "pen",
        text: "Published",
        highlight: analysis.title,
        time: timeAgo(analysis.createdAt),
      });
    });
    data.collections.slice(0, 2).forEach((collection) => {
      entries.push({
        id: `collection-${collection.id}`,
        icon: "list",
        text: "Created list",
        highlight: collection.title,
        time: timeAgo(collection.createdAt),
      });
    });
    return entries;
  }, [data, isPreview]);

  const featuredQuote = quotes.find((quote) => quote.favorite) ?? quotes[0] ?? null;
  const wallQuotes = featuredQuote ? quotes.filter((quote) => quote !== featuredQuote) : [];

  const pinnedWork = isPreview ? PINNED_BLOCK : data?.pinnedWork?.title ? data.pinnedWork : null;
  const pinnedQuote = isPreview ? PINNED_QUOTE : data?.pinnedQuote?.text ? data.pinnedQuote : null;
  const tasteDna = isPreview ? TASTE_DNA : data?.tasteDna ?? [];
  const currentlyInto = isPreview ? CURRENTLY_INTO : data?.currentlyInto ?? [];
  const interests = isPreview ? INTERESTS : data?.interests ?? [];
  const currentlyReading = isPreview
    ? { title: "Vagabond", chapter: "Ch. 214" }
    : data?.currentlyReading ?? { title: "", chapter: "" };
  const traitChips =
    isPreview || !data?.traits?.length
      ? PROFILE_TRAITS.map((trait) => ({ icon: trait.icon as string, label: trait.label }))
      : data!.traits.map((label, index) => ({
          icon: ["sparkles", "target", "moon", "swords", "pen"][index % 5],
          label,
        }));

  const elsewhere: ElsewhereLink[] = isPreview
    ? ELSEWHERE
    : [
        data?.instagram
          ? {
              id: "instagram" as const,
              label: "Instagram",
              value: `@${data.instagram.replace(/^@/, "")}`,
              href: data.instagram.startsWith("http")
                ? data.instagram
                : `https://instagram.com/${data.instagram.replace(/^@/, "")}`,
              icon: "instagram" as const,
            }
          : null,
        data?.twitter
          ? {
              id: "x" as const,
              label: "X",
              value: `@${data.twitter.replace(/^@/, "")}`,
              href: data.twitter.startsWith("http")
                ? data.twitter
                : `https://x.com/${data.twitter.replace(/^@/, "")}`,
              icon: "x" as const,
            }
          : null,
        data?.malUsername
          ? {
              id: "mal" as const,
              label: "MyAnimeList",
              value: "Profile",
              href: `https://myanimelist.net/profile/${data.malUsername}`,
              icon: "mal" as const,
            }
          : null,
        data?.websiteUrl
          ? {
              id: "website" as const,
              label: "Website",
              value: "Visit",
              href: data.websiteUrl.startsWith("http") ? data.websiteUrl : `https://${data.websiteUrl}`,
              icon: "globe" as const,
            }
          : null,
      ].filter(Boolean) as ElsewhereLink[];

  const stats = data
    ? [
        { label: "ANALYSES", value: data.totalAnalyses },
        { label: "UPVOTES", value: data.totalUpvotesReceived + data.profileUpvoteCount },
        { label: "FOLLOWERS", value: data.followerCount },
        { label: "FOLLOWING", value: data.followingCount },
        { label: "VIEWS", value: data.profileViewCount },
      ]
    : [];

  const tabs = [
    { id: "showcase", label: "Showcase" },
    { id: "favorites", label: "Favorites", count: favorites.length },
    { id: "characters", label: "Characters", count: characters.length },
    { id: "quotes", label: "Quotes", count: quotes.length },
    { id: "lists", label: "Lists", count: lists.length },
    { id: "activity", label: "Activity" },
  ];

  const goToSection = (id: string) => {
    setActiveTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-[320px] w-full bg-[#11161D]/70" />
        <div className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-6 lg:px-[63px]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="space-y-4">
              <div className="h-6 w-40 rounded bg-[#11161D]" />
              <div className="grid gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
                <div className="h-[437px] rounded-lg border border-[#1E2630] bg-[#11161D]/60" />
                <div className="space-y-3">
                  <div className="h-[178px] rounded-lg border border-[#1E2630] bg-[#11161D]" />
                  <div className="h-[247px] rounded-lg border border-[#1E2630] bg-[#11161D]" />
                </div>
              </div>
            </div>
            <div className="hidden h-64 rounded-xl border border-[#1E2630] bg-[#11161D] lg:block" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-condensed text-2xl font-bold uppercase tracking-wide text-white">User not found</p>
        <p className="text-sm text-[#8A94A6]">This reader hasn&apos;t stepped into the archive yet.</p>
        <Link href="/" className="mt-2 text-sm font-medium text-[#38C8E0] hover:text-[#6BDDF8]">
          Back to the feed
        </Link>
      </div>
    );
  }

  const level = getLevel(data.reputationScore);
  const tierLabel = getTier(data.reputationScore);
  const avatarUrl = data.avatarUrl || (isPreview ? asset("avatar.jpg") : "");
  const aboutText = isPreview
    ? DEMO_ABOUT
    : data.bio || (isOwn ? "Add a short bio in the profile studio." : "No bio yet.");
  const tastePercent = isPreview
    ? TASTE_MATCH.percent
    : Math.min(95, 55 + favorites.length * 5 + interests.length * 2);
  const sharedTaste = isPreview
    ? TASTE_MATCH.shared
    : [...favorites.slice(0, 3).map((work) => work.title), ...interests.slice(0, 3).map((interest) => interest.label)].slice(0, 6);

  return (
    <div className="pb-14">
      {/* Hero — sits underneath the translucent site header like the design */}
      <section className="relative -mt-16 border-b border-[#1E2630]">
        <div className="absolute inset-0 overflow-hidden">
          <img src={data.bannerUrl || asset("banner.jpg")} alt="" className="h-full w-full object-cover object-center" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,13,18,.55) 0%, rgba(10,13,18,.12) 30%, rgba(10,13,18,.58) 74%, #0A0D12 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(10,13,18,.82) 0%, rgba(10,13,18,.38) 48%, rgba(10,13,18,.02) 82%)",
            }}
          />
        </div>

        <div className="relative mx-auto flex min-h-[472px] w-full max-w-[1080px] flex-col px-4 pb-4 pt-[76px] sm:px-6 lg:px-[63px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/15 bg-black/50 px-3 text-[10px] font-medium text-white backdrop-blur-sm">
              <Eye className="h-3.5 w-3.5" />
              Public preview
            </span>
            <Link
              href="/settings"
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-black/30 px-2.5 text-[10px] font-medium text-[#E2E8F0] backdrop-blur-sm transition-colors hover:bg-black/45 hover:text-white"
            >
              <PencilRuler className="h-3.5 w-3.5" />
              Edit layout
            </Link>
          </div>

          <div className="mt-auto pb-4 pt-14">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-5">
              {/* Avatar */}
              <div className="relative h-[104px] w-[104px] shrink-0 sm:h-[116px] sm:w-[116px]">
                <div
                  className="absolute inset-0 rounded-full p-[3px]"
                  style={{ background: `conic-gradient(from 210deg, ${ACCENT} 0deg, ${ACCENT} 360deg)` }}
                >
                  <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-[#0A0D12] bg-[#0B1017]">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-condensed text-4xl font-bold text-white">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className="absolute -right-0.5 top-0 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-[#0A0D12]"
                  style={{ background: ACCENT }}
                >
                  <BadgeCheck className="h-2.5 w-2.5 text-[#06222A]" />
                </span>
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-[5px] border border-[#38C8E0] bg-[#0A0D12] px-2 py-[2px] font-condensed text-[11px] font-bold tracking-[0.04em] text-[#38C8E0]">
                  LV {level}
                </span>
              </div>

              {/* Identity */}
              <div className="min-w-0 flex-1">
                {currentlyReading.title ? (
                  <div className="mb-1 ml-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 py-[3px] text-[9px] backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FCD34D]" />
                    <span className="text-[#FDE68A]">Reading</span>
                    <span className="max-w-[160px] truncate text-[#FEF3C7]">{currentlyReading.title}</span>
                    {currentlyReading.chapter ? (
                      <>
                        <span className="text-[#FDE68A]/70">·</span>
                        <span className="text-[#FDE68A]">{currentlyReading.chapter}</span>
                      </>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h1 className="font-condensed text-[36px] font-bold leading-none text-white">{displayName}</h1>
                  <span className="text-[11px] text-[#8A94A6]">@{data.username}</span>
                  <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#38C8E0]">
                    <BadgeCheck className="h-3 w-3" />
                    {tierLabel}
                  </span>
                </div>

                {data.bio ? (
                  <p className="mt-2 max-w-[420px] text-[11.5px] leading-relaxed text-[#CBD5E1]">{data.bio}</p>
                ) : null}

                <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-[#8A94A6]">
                  {location ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      {location}
                    </span>
                  ) : null}
                  {languages ? (
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3" />
                      {languages}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3" />
                    Joined {joinedLabel(data.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    {data.instagram || data.twitter || data.malUsername || data.websiteUrl ? (
                      <>
                        {data.instagram ? <Instagram className="h-3 w-3 transition-colors hover:text-[#38C8E0]" /> : null}
                        {data.twitter ? <span className="font-condensed text-[9px] font-bold">X</span> : null}
                        {data.websiteUrl ? <Globe className="h-3 w-3 transition-colors hover:text-[#38C8E0]" /> : null}
                      </>
                    ) : null}
                    {data.malUsername ? (
                      <span className="rounded border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-1 py-[1px] font-condensed text-[7px] font-bold tracking-wide text-[#7DD3FC]">
                        MAL
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex w-full flex-col gap-3 lg:mt-11 lg:w-auto lg:items-end">
                <div className="flex flex-wrap items-center gap-2">
                  {isOwn ? (
                    <>
                      <Link
                        href="/settings"
                        className="inline-flex h-[30px] items-center gap-1.5 rounded-md px-3.5 text-[11px] font-semibold text-[#06222A] transition-colors hover:brightness-110"
                        style={{ background: ACCENT }}
                      >
                        <PencilRuler className="h-3.5 w-3.5" />
                        Edit profile
                      </Link>
                      <Link
                        href="/write"
                        className="inline-flex h-[30px] items-center gap-1.5 rounded-md border border-[#2A3341] bg-[#11161D]/90 px-3.5 text-[11px] font-semibold text-white backdrop-blur-sm transition-colors hover:border-[#38C8E0]/50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        New analysis
                      </Link>
                    </>
                  ) : (
                    <>
                      {user ? (
                        <button
                          type="button"
                          onClick={handleFollow}
                          className={`inline-flex h-[30px] items-center gap-1.5 rounded-md border px-3.5 text-[11px] font-semibold transition-colors ${
                            data.isFollowing
                              ? "border-[#38C8E0]/50 bg-[#38C8E0]/10 text-[#38C8E0] hover:bg-[#38C8E0]/20"
                              : "border-transparent text-[#06222A] hover:brightness-110"
                          }`}
                          style={data.isFollowing ? undefined : { background: ACCENT }}
                        >
                          {data.isFollowing ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          {data.isFollowing ? "Following" : "Follow"}
                        </button>
                      ) : (
                        <Link
                          href="/login"
                          className="inline-flex h-[30px] items-center gap-1.5 rounded-md px-3.5 text-[11px] font-semibold text-[#06222A] transition-colors hover:brightness-110"
                          style={{ background: ACCENT }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Follow
                        </Link>
                      )}

                      {user ? (
                        <button
                          type="button"
                          onClick={handleUpvoteTaste}
                          className={`inline-flex h-[30px] items-center gap-1.5 rounded-md border px-3.5 text-[11px] font-semibold backdrop-blur-sm transition-colors ${
                            data.userUpvotedProfile
                              ? "border-[#38C8E0]/50 bg-[#38C8E0]/10 text-[#38C8E0]"
                              : "border-[#2A3341] bg-[#11161D]/90 text-white hover:border-[#38C8E0]/50"
                          }`}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                          Upvote taste
                        </button>
                      ) : (
                        <Link
                          href="/login"
                          className="inline-flex h-[30px] items-center gap-1.5 rounded-md border border-[#2A3341] bg-[#11161D]/90 px-3.5 text-[11px] font-semibold text-white backdrop-blur-sm transition-colors hover:border-[#38C8E0]/50"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                          Upvote taste
                        </Link>
                      )}

                      <a
                        href={`mailto:?subject=${encodeURIComponent(`${displayName} on Analithe`)}&body=${encodeURIComponent(window.location.href)}`}
                        className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border border-[#2A3341] bg-[#11161D]/90 text-[#CBD5E1] backdrop-blur-sm transition-colors hover:border-[#38C8E0]/50 hover:text-white"
                        aria-label="Share by email"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border border-[#2A3341] bg-[#11161D]/90 text-[#CBD5E1] backdrop-blur-sm transition-colors hover:border-[#38C8E0]/50 hover:text-white"
                        aria-label="Copy profile link"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-[#38C8E0]" /> : <Share2 className="h-3.5 w-3.5" />}
                      </button>
                    </>
                  )}
                </div>

                <div className="grid w-full grid-cols-5 divide-x divide-[#1E2630] overflow-hidden rounded-lg border border-[#1E2630] bg-[#11161D]/80 backdrop-blur-md lg:w-[340px]">
                  {stats.map((stat) => (
                    <div key={stat.label} className="px-1 py-[9px] text-center">
                      <p className="font-condensed text-[18px] font-bold leading-none text-white">{stat.value}</p>
                      <p className="mt-1 text-[7.5px] uppercase tracking-[0.08em] text-[#8A94A6]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {traitChips.map((trait) => {
                const Icon = TRAIT_ICONS[trait.icon] ?? Sparkles;
                return (
                  <span
                    key={trait.label}
                    className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[#2A3341]/80 bg-[#11161D]/70 px-3 text-[9px] text-[#CBD5E1] backdrop-blur-sm"
                  >
                    <Icon className="h-2.5 w-2.5 text-[#8A94A6]" />
                    {trait.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-16 z-30 border-b border-[#1E2630] bg-[#0A0D12]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1080px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-[63px]">
          <div className="scrollbar-none flex items-stretch gap-5 overflow-x-auto sm:gap-6">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => goToSection(tab.id)}
                  className={`relative flex h-12 shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] transition-colors ${
                    active ? "text-white" : "text-[#8A94A6] hover:text-[#CBD5E1]"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined ? <span className="text-[9px] text-[#64748B]">{tab.count}</span> : null}
                  {active ? <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#38C8E0]" /> : null}
                </button>
              );
            })}
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 text-[9px] text-[#8A94A6] md:flex">
            <Palette className="h-3 w-3 text-[#38C8E0]" />
            Profile theme:
            <span className="text-[#CBD5E1]">Midnight Ink</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-6 lg:px-[63px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 space-y-10">
            {/* Showcase */}
            <section id="showcase" className="scroll-mt-32">
              <SectionHead
                eyebrow="PINNED"
                title="The Showcase"
                hint="Pick what defines you — pin up to 4 blocks."
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                {/* Pinned work */}
                {pinnedWork ? (
                  <article className="group relative min-h-[420px] overflow-hidden rounded-lg border border-[#1E2630]">
                    <img
                      src={pinnedWork.image || asset("monster.jpg")}
                      alt={pinnedWork.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(10,13,18,.55) 0%, rgba(10,13,18,0) 34%, rgba(10,13,18,.35) 58%, rgba(10,13,18,.94) 100%)",
                      }}
                    />
                    <div className="relative flex h-full min-h-[420px] flex-col justify-between p-4">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/90">
                        {pinnedWork.label}
                      </span>
                      <div>
                        <p className="font-condensed text-[9.5px] uppercase tracking-[0.16em] text-[#94A3B8]">
                          {pinnedWork.meta}
                        </p>
                        <h3 className="mt-1 font-condensed text-[40px] font-bold leading-[0.95] text-white">
                          {pinnedWork.title}
                        </h3>
                        <p className="mt-2 font-quote text-[12.5px] italic leading-relaxed text-[#E2E8F0]">
                          {pinnedWork.quote}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-[#94A3B8]">
                          {pinnedWork.rating ? (
                            <span className="inline-flex items-center gap-1 text-[#FCD34D]">
                              <Star className="h-3 w-3 fill-current" />
                              {pinnedWork.rating}
                            </span>
                          ) : null}
                          {pinnedWork.stats.map((stat, index) => (
                            <span key={stat} className="inline-flex items-center gap-1">
                              {index === 0 ? <Feather className="h-2.5 w-2.5" /> : <CalendarDays className="h-2.5 w-2.5" />}
                              {stat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ) : (
                  <article className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#2A3341] bg-[#0D1117]/40 p-6 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2A3341] text-[#8A94A6]">
                      <Star className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[12px] font-medium text-white">No pinned work yet</p>
                      <p className="mt-1 max-w-[220px] text-[10px] leading-relaxed text-[#8A94A6]">
                        Pin the story that defines your taste.
                      </p>
                    </div>
                    {isOwn ? (
                      <Link
                        href="/settings?tab=showcase"
                        className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-[#38C8E0]/30 bg-[#38C8E0]/10 px-3 py-1.5 text-[10px] font-semibold text-[#38C8E0] hover:bg-[#38C8E0]/20"
                      >
                        <Plus className="h-3 w-3" /> Pin a work
                      </Link>
                    ) : null}
                  </article>
                )}

                <div className="flex flex-col gap-3">
                  {/* Pinned quote */}
                  <article className="relative flex min-h-[178px] flex-col overflow-hidden rounded-lg border border-[#1E2630] bg-[#11161D] p-5">
                    <span className="pointer-events-none absolute -top-1 right-4 font-quote text-[120px] leading-none text-white/[0.04]">
                      “
                    </span>
                    <p className="text-[8.5px] uppercase tracking-[0.32em] text-[#8A94A6]">
                      {pinnedQuote?.label ?? "A LINE WORTH KEEPING"}
                    </p>
                    <p className="mt-3 max-w-[560px] font-quote text-[20px] italic leading-[1.35] text-white">
                      {pinnedQuote?.text ?? "Pin a quote that sums up the way you see stories."}
                    </p>
                    <div className="mt-auto flex items-center gap-2 pt-5 text-[11px] text-[#94A3B8]">
                      <span className="h-px w-7 bg-[#475569]" />
                      {pinnedQuote?.attribution || (isOwn ? "Add one in the profile studio" : "—")}
                    </div>
                  </article>

                  <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-[1.36fr_1fr]">
                    {/* Taste DNA */}
                    <article className="rounded-lg border border-[#1E2630] bg-[#11161D] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[8.5px] uppercase tracking-[0.32em] text-[#8A94A6]">TASTE DNA</p>
                        <Dna className="h-3.5 w-3.5 text-[#38C8E0]" />
                      </div>
                      <div className="mt-3 space-y-2.5">
                        {tasteDna.length > 0 ? (
                          tasteDna.map((dimension) => (
                            <div key={dimension.label}>
                              <div className="flex items-baseline justify-between gap-2 text-[10.5px]">
                                <span className="text-[#CBD5E1]">{dimension.label}</span>
                                <span className="font-condensed text-[10px] text-[#8A94A6]">{dimension.value}</span>
                              </div>
                              <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${dimension.value}%`, background: ACCENT }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] leading-relaxed text-[#8A94A6]">
                            {isOwn ? "Map your taste DNA in the profile studio." : "No taste map yet."}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-md bg-white/[0.03] px-2 py-2">
                          <p className="text-[8.5px] text-[#8A94A6]">Fav theme</p>
                          <p className="mt-0.5 text-[10px] font-medium leading-snug text-white">
                            {data.favoriteTheme || "—"}
                          </p>
                        </div>
                        <div className="rounded-md bg-white/[0.03] px-2 py-2">
                          <p className="text-[8.5px] text-[#8A94A6]">Mood</p>
                          <p className="mt-0.5 text-[10px] font-medium leading-snug text-white">
                            {data.mood || "—"}
                          </p>
                        </div>
                      </div>
                    </article>

                    {/* Currently into */}
                    <article className="rounded-lg border border-[#1E2630] bg-[#11161D] p-4">
                      <p className="text-[8.5px] uppercase tracking-[0.32em] text-[#8A94A6]">CURRENTLY INTO</p>
                      <div className="mt-3 space-y-3">
                        {currentlyInto.length > 0 ? (
                          currentlyInto.map((item) => {
                            const Icon = INTO_ICONS[item.icon] ?? BookOpen;
                            return (
                              <div key={`${item.title}-${item.meta}`} className="flex items-center gap-2.5">
                                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.03] text-[#8A94A6]">
                                  <Icon className="h-3 w-3" />
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-[10.5px] font-medium text-white">{item.title}</p>
                                  <p className="truncate text-[8.5px] text-[#8A94A6]">{item.meta}</p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[10px] leading-relaxed text-[#8A94A6]">
                            {isOwn ? "Share what you're into right now." : "Nothing pinned right now."}
                          </p>
                        )}
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </section>

            {/* Favorite works */}
            <section id="favorites" className="scroll-mt-32">
              <SectionHead
                eyebrow="HALL OF FAME"
                title="Favorite Works"
                action={
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFavoriteFilter("ALL")}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${
                        favoriteFilter === "ALL" ? "bg-white text-[#0A0D12]" : "text-[#CBD5E1] hover:text-white"
                      }`}
                    >
                      All <span className={`text-[9px] ${favoriteFilter === "ALL" ? "text-[#475569]" : "text-[#64748B]"}`}>{favorites.length}</span>
                    </button>
                    {(Object.keys(workCounts) as WorkType[])
                      .filter((type) => workCounts[type] > 0)
                      .map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFavoriteFilter(type)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium capitalize transition-colors ${
                            favoriteFilter === type ? "bg-white text-[#0A0D12]" : "text-[#CBD5E1] hover:text-white"
                          }`}
                        >
                          {type.charAt(0) + type.slice(1).toLowerCase()}
                          <span className={`text-[9px] ${favoriteFilter === type ? "text-[#475569]" : "text-[#64748B]"}`}>
                            {workCounts[type]}
                          </span>
                        </button>
                      ))}
                  </div>
                }
              />
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
                {visibleFavorites.map((work) => (
                  <article key={work.id} className="group min-w-0">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[#1E2630] bg-[#0D1117]">
                      <WorkCover work={work} />
                      <span className="absolute left-2 top-1 font-condensed text-[38px] font-bold leading-none text-white/90 [text-shadow:0_2px_10px_rgba(0,0,0,.6)]">
                        {String(favorites.findIndex((item) => item.id === work.id) + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`absolute right-2 top-2 text-[8px] font-semibold uppercase tracking-[0.12em] [text-shadow:0_1px_6px_rgba(0,0,0,.7)] ${WORK_TYPE_COLORS[work.type]}`}
                      >
                        {work.type}
                      </span>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="mt-2 min-w-0">
                      <h3 className="line-clamp-2 text-[11.5px] font-medium leading-snug text-white">{work.title}</h3>
                      <div className="mt-1 flex items-baseline justify-between gap-2">
                        <p className="truncate text-[9px] text-[#8A94A6]">{work.meta}</p>
                        {work.rating ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-[9px] text-[#FCD34D]">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            {work.rating}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}

                {isOwn ? (
                  <Link
                    href="/settings?tab=favorites"
                    className="group flex aspect-[3/4] flex-col items-center justify-center gap-3 self-start rounded-lg border border-dashed border-[#2A3341] bg-[#0D1117]/40 px-2 text-center transition-colors hover:border-[#38C8E0]/40 hover:bg-[#11161D]"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2A3341] bg-white/[0.02] text-[#8A94A6] transition-colors group-hover:border-[#38C8E0]/40 group-hover:text-[#38C8E0]">
                      <Plus className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[10px] text-[#8A94A6]">Add a favorite</span>
                      <span className="mt-1 block text-[8px] leading-relaxed text-[#64748B]">Anime · Manga · Novel · Film…</span>
                    </span>
                  </Link>
                ) : null}
                {visibleFavorites.length === 0 && !isOwn ? (
                  <p className="col-span-full py-6 text-center text-[11px] text-[#8A94A6]">
                    No favorite works yet.
                  </p>
                ) : null}
              </div>
            </section>

            {/* Favorite characters */}
            <section id="characters" className="scroll-mt-32">
              <SectionHead
                eyebrow="KINDRED SPIRITS"
                title="Favorite Characters"
                action={
                  isOwn ? (
                    <Link
                      href="/settings?tab=characters"
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-[#38C8E0] hover:text-[#6BDDF8]"
                    >
                      Manage <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : undefined
                }
              />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {characters.length === 0 ? (
                  <p className="col-span-full rounded-lg border border-dashed border-[#2A3341] bg-[#0D1117]/40 px-4 py-8 text-center text-[11px] text-[#8A94A6]">
                    No favorite characters yet.
                  </p>
                ) : null}
                {characters.map((character) => (
                  <article key={character.id} className="group overflow-hidden rounded-lg border border-[#1E2630] bg-[#11161D]">
                    <div className="relative aspect-[3/4] overflow-hidden bg-[#0D1117]">
                      {character.image ? (
                        <img
                          src={character.image}
                          alt={character.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-condensed text-4xl font-bold text-white/30">
                          {character.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
                      <span className="absolute left-3 top-3 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/90">
                        {character.label}
                      </span>
                    </div>
                    <div className="p-3.5">
                      <h3 className="truncate font-condensed text-[16px] font-bold leading-none text-white">{character.name}</h3>
                      <p className="mt-1 truncate text-[9px] text-[#8A94A6]">{character.series}</p>
                      {character.note ? (
                        <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-[#CBD5E1]">{character.note}</p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Quote wall */}
            <section id="quotes" className="scroll-mt-32">
              <SectionHead
                eyebrow="LINES THAT STAYED"
                title="Quote Wall"
                action={
                  isOwn ? (
                    <Link
                      href="/settings?tab=quotes"
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-[#38C8E0] hover:text-[#6BDDF8]"
                    >
                      <Plus className="h-3 w-3" /> Manage quotes
                    </Link>
                  ) : undefined
                }
              />
              <div className="grid gap-3 md:grid-cols-3">
                {!featuredQuote ? (
                  <p className="col-span-full rounded-lg border border-dashed border-[#2A3341] bg-[#0D1117]/40 px-4 py-8 text-center text-[11px] text-[#8A94A6]">
                    No quotes saved yet.
                  </p>
                ) : null}
                {featuredQuote ? (
                  <figure
                    className="relative flex min-h-[240px] flex-col overflow-hidden rounded-lg border border-[#38C8E0]/35 p-5 md:row-span-2"
                    style={{
                      background:
                        "linear-gradient(155deg, rgba(56,200,224,.16) 0%, rgba(56,200,224,.05) 52%, rgba(17,22,29,.92) 100%)",
                    }}
                  >
                    <span className="font-quote text-[54px] leading-[0.7] text-[#38C8E0]/80">“</span>
                    <blockquote className="mt-3 font-quote text-[23px] italic leading-[1.28] text-white">
                      {featuredQuote.text}
                    </blockquote>
                    <figcaption className="mt-auto flex items-center justify-between gap-3 pt-5 text-[11px] text-[#CBD5E1]">
                      <span>— {featuredQuote.attribution}</span>
                      {featuredQuote.favorite ? (
                        <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[7.5px] uppercase tracking-[0.14em] text-[#8A94A6]">
                          Favorite
                        </span>
                      ) : null}
                    </figcaption>
                  </figure>
                ) : null}

                {wallQuotes.slice(0, 2).map((quote) => (
                  <figure
                    key={quote.id}
                    className="flex min-h-[117px] flex-col justify-between rounded-lg border border-[#1E2630] bg-[#11161D] p-4"
                  >
                    <blockquote className="font-quote text-[13.5px] italic leading-snug text-[#F1F5F9]">{quote.text}</blockquote>
                    <figcaption className="mt-3 text-[9px] text-[#8A94A6]">
                      — {quote.attribution}
                      {quote.source ? <span className="text-[#94A3B8]">, {quote.source}</span> : null}
                    </figcaption>
                  </figure>
                ))}

                {wallQuotes.slice(2).map((quote) => (
                  <figure
                    key={quote.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-[#1E2630] bg-[#11161D] p-5 md:col-span-2 md:flex-row md:items-end"
                  >
                    <div className="min-w-0">
                      <blockquote className="font-quote text-[13.5px] italic leading-snug text-[#F1F5F9]">{quote.text}</blockquote>
                      <figcaption className="mt-3 text-[9px] text-[#8A94A6]">
                        — {quote.attribution}
                        {quote.source ? <span className="text-[#94A3B8]">, {quote.source}</span> : null}
                      </figcaption>
                    </div>
                    {quote.original ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[9px] font-medium text-[#38C8E0]">
                        <Feather className="h-3 w-3" /> Original
                      </span>
                    ) : null}
                  </figure>
                ))}
              </div>
            </section>

            {/* Personal lists */}
            <section id="lists" className="scroll-mt-32">
              <SectionHead
                eyebrow="CURATED"
                title="Personal Lists"
                action={
                  isOwn ? (
                    <Link
                      href="/settings?tab=lists"
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-[#38C8E0] hover:text-[#6BDDF8]"
                    >
                      <Plus className="h-3 w-3" /> Manage lists
                    </Link>
                  ) : undefined
                }
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lists.length === 0 ? (
                  <p className="col-span-full rounded-lg border border-dashed border-[#2A3341] bg-[#0D1117]/40 px-4 py-8 text-center text-[11px] text-[#8A94A6]">
                    No personal lists yet.
                  </p>
                ) : null}
                {lists.map((list) => (
                  <article key={list.id} className="overflow-hidden rounded-lg border border-[#1E2630] bg-[#11161D]">
                    <div className="relative h-[147px] overflow-hidden bg-[#0C1016]">
                      <div className="absolute inset-0 flex items-center justify-center gap-1.5 px-5">
                        {Array.from({ length: 3 }).map((_, index) => {
                          const src = list.images[index];
                          return (
                            <div
                              key={index}
                              className="h-[114px] w-[92px] overflow-hidden rounded-md border border-white/10 shadow-[0_10px_24px_rgba(0,0,0,.45)]"
                              style={{ background: "linear-gradient(160deg,#1B212D,#11151D)" }}
                            >
                              {src ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                            </div>
                          );
                        })}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#11161D] via-transparent to-transparent" />
                    </div>
                    <div className="p-4">
                      <p className="font-condensed text-[9px] uppercase tracking-[0.18em] text-[#8A94A6]">{list.index}</p>
                      <h3 className="mt-1 line-clamp-2 min-h-[2.5em] text-[11.5px] font-medium leading-snug text-white">
                        {list.title}
                      </h3>
                      <div className="mt-3 flex items-center justify-between text-[9px] text-[#8A94A6]">
                        <span>{list.entries} entries</span>
                        <button
                          type="button"
                          onClick={() => handleLikeList(list.id)}
                          disabled={!user || isPreview}
                          className={`inline-flex items-center gap-1 transition-colors disabled:cursor-default ${
                            data.collections.find((collection) => collection.id === list.id)?.likedByMe
                              ? "text-[#FB7185]"
                              : "text-[#8A94A6] hover:text-[#FB7185]"
                          }`}
                          aria-label="Like this list"
                        >
                          <Heart
                            className={`h-3 w-3 ${
                              data.collections.find((collection) => collection.id === list.id)?.likedByMe
                                ? "fill-current"
                                : ""
                            }`}
                          />
                          {list.likes ?? 0}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Recent activity */}
            <section id="activity" className="scroll-mt-32">
              <SectionHead
                eyebrow="LATEST"
                title="Recent Activity"
                action={
                  <Link
                    href={isOwn ? "/write" : "#activity"}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-[#38C8E0] hover:text-[#6BDDF8]"
                  >
                    All {data.totalAnalyses} analyses <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />

              {featured ? (
                <Link
                  href={featured.id ? `/analyses/${featured.id}` : "#activity"}
                  className="group block overflow-hidden rounded-xl border border-[#1E2630] bg-[#11161D] transition-colors hover:border-[#2A3341]"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="relative h-[180px] shrink-0 overflow-hidden md:h-auto md:w-[240px]">
                      {featured.image ? (
                        <img src={featured.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{ background: "linear-gradient(150deg,#0F2F3A,#11161D 60%,#0A0D12)" }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#11161D] via-transparent to-transparent md:bg-gradient-to-r" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <div className="flex flex-wrap items-center gap-2 text-[9px] text-[#8A94A6]">
                        <span className="rounded border border-[#38C8E0]/30 bg-[#38C8E0]/10 px-2 py-0.5 text-[9px] text-[#38C8E0]">
                          {featured.type}
                        </span>
                        <span>{featured.meta}</span>
                      </div>
                      <h3 className="mt-2 font-condensed text-[24px] font-bold leading-tight text-white">{featured.title}</h3>
                      <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-[#94A3B8]">{featured.excerpt}</p>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-[9px] text-[#8A94A6]">
                        <div className="flex items-center gap-4">
                          <span className="inline-flex items-center gap-1">
                            <ArrowUp className="h-3 w-3" />
                            {featured.upvotes}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {featured.comments}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {featured.views}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#38C8E0]">
                          Read analysis
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-[#2A3341] bg-[#0D1117]/40 px-5 py-8 text-center">
                  <p className="text-sm font-medium text-white">No analyses yet</p>
                  <p className="mt-1 max-w-[300px] text-[11px] leading-relaxed text-[#8A94A6]">
                    Break down an anime or character and it&apos;ll show up here for others to explore.
                  </p>
                  {isOwn ? (
                    <Link
                      href="/write"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#38C8E0]/30 bg-[#38C8E0]/10 px-3 py-1.5 text-[11px] font-semibold text-[#38C8E0] hover:bg-[#38C8E0]/20"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Start your first analysis
                    </Link>
                  ) : null}
                </div>
              )}

              {activityEntries.length > 0 ? (
                <div className="mt-3 divide-y divide-[#1E2630] overflow-hidden rounded-xl border border-[#1E2630] bg-[#11161D]">
                  {activityEntries.map((entry) => {
                    const { Icon, className } = ACTIVITY_ICONS[entry.icon];
                    return (
                      <div key={entry.id} className="flex items-center gap-3 px-4 py-[11px]">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${className}`}>
                          {entry.icon === "star" ? <Icon className="h-3 w-3 fill-current" /> : <Icon className="h-3 w-3" />}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-[10px] text-[#94A3B8]">
                          {entry.text} <span className="font-medium text-white">{entry.highlight}</span>
                        </p>
                        <span className="shrink-0 text-[9px] text-[#64748B]">{entry.time}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          </div>

          {/* Sidebar — pinned under the tabs, with its own scroll like a social profile rail */}
          <aside
            ref={asideRef}
            className="scrollbar-none space-y-4 lg:sticky lg:top-[7.25rem] lg:max-h-[calc(100vh-7.75rem)] lg:self-start lg:overflow-y-auto lg:pr-1"
          >
            <section
              className="relative overflow-hidden rounded-xl border border-[#38C8E0]/35 p-4"
              style={{
                background:
                  "linear-gradient(150deg, rgba(56,200,224,.12) 0%, rgba(56,200,224,.03) 48%, rgba(13,19,26,.7) 100%), #0D131A",
              }}
            >
              <div className="flex items-center gap-3.5">
                <TasteRing percent={tastePercent} />
                <div className="min-w-0">
                  <h2 className="font-condensed text-[14px] font-bold tracking-[0.05em] text-white">TASTE MATCH</h2>
                  <p className="mt-1 text-[9px] leading-relaxed text-[#8A94A6]">
                    {isOwn ? "Your taste fingerprint across everything you've read." : `You and ${displayName} see stories the same way.`}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-[8.5px] uppercase tracking-[0.24em] text-[#8A94A6]">You both love</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sharedTaste.length > 0 ? (
                  sharedTaste.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded border border-white/10 bg-white/[0.05] px-2 py-[3px] text-[9px] text-[#E2E8F0]"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] text-[#8A94A6]">No shared tags yet.</span>
                )}
              </div>
              <Link
                href={isOwn ? "/settings" : "#activity"}
                className="mt-3 flex h-[31px] w-full items-center justify-center rounded-md border border-[#2A3341] bg-[#0A0D12]/60 text-[10px] font-medium text-white transition-colors hover:border-[#38C8E0]/40 hover:bg-[#11161D]"
              >
                {isOwn ? "Manage taste profile" : "Compare full tastes"}
              </Link>
            </section>

            <SidePanel title="Interests & Hobbies">
              <div className="grid grid-cols-2 gap-x-2 gap-y-3 px-4 pb-4 pt-3">
                {interests.length > 0 ? (
                  interests.map((interest) => (
                    <span key={`${interest.emoji}-${interest.label}`} className="flex items-center gap-1.5 text-[9.5px] text-[#CBD5E1]">
                      <span className="text-[10px] leading-none">{interest.emoji}</span>
                      {interest.label}
                    </span>
                  ))
                ) : (
                  <span className="col-span-2 text-[9.5px] text-[#8A94A6]">
                    {isOwn ? "Add a few interests in the profile studio." : "No interests listed."}
                  </span>
                )}
              </div>
              <div className="border-t border-[#1E2630] px-4 py-3">
                <p className="text-[8px] uppercase tracking-[0.22em] text-[#8A94A6]">Currently exploring</p>
                <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#CBD5E1]">
                  {isPreview ? CURRENTLY_EXPLORING : data.currentlyExploring || "—"}
                </p>
              </div>
            </SidePanel>

            <SidePanel title="About Me">
              <p className="px-4 pb-4 pt-2 text-[9.5px] leading-relaxed text-[#94A3B8]">{aboutText}</p>
            </SidePanel>

            <SidePanel
              title="Badges"
              right={<span className="font-condensed text-[9px] text-[#8A94A6]">4 / 24</span>}
            >
              <div className="grid grid-cols-4 gap-2 px-4 pb-4 pt-4">
                {BADGES.map((badge) => {
                  const Icon = BADGE_ICONS[badge.icon] ?? Sparkles;
                  return (
                    <div key={badge.id} className="flex flex-col items-center gap-1.5">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06]"
                        style={{ background: badge.gradient, color: badge.iconColor }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-center text-[7.5px] leading-tight text-[#8A94A6]">{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            </SidePanel>

            <SidePanel title="Elsewhere">
              <div className="space-y-0.5 px-2 pb-3 pt-2">
                {elsewhere.length > 0 ? (
                  elsewhere.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#232C3A] bg-white/[0.03] text-[#CBD5E1]">
                        {link.icon === "instagram" ? (
                          <Instagram className="h-3 w-3" />
                        ) : link.icon === "globe" ? (
                          <Globe className="h-3 w-3" />
                        ) : link.icon === "mal" ? (
                          <span className="font-condensed text-[7px] font-bold text-[#7DD3FC]">MAL</span>
                        ) : (
                          <span className="font-condensed text-[9px] font-bold">X</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10.5px] text-[#CBD5E1]">{link.label}</span>
                      <span className="shrink-0 text-[9px] text-[#8A94A6]">{link.value}</span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0 text-[#64748B]" />
                    </a>
                  ))
                ) : (
                  <p className="px-2 py-3 text-[9.5px] text-[#8A94A6]">
                    {isOwn ? "Add social links in the profile studio." : "No links added."}
                  </p>
                )}
              </div>
            </SidePanel>
          </aside>
        </div>
      </div>
    </div>
  );
}
