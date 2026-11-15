import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  ListChecks,
  Loader2,
  LogOut,
  Plus,
  Quote,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  createCollection,
  deleteCollection,
  updateCollection as updateCollectionRequest,
  addCollectionItem,
  removeCollectionItem,
  setFavoriteWorks,
  setProfileQuotes,
  setTopCharacters,
  updateProfile,
  getProfile,
} from "../api/users";
import { searchAnime, searchCharacters, type AnimeListResponse, type CharacterSearchResult } from "../api/anime";
import type {
  CharacterEntry,
  Collection,
  CollectionItem,
  CurrentlyIntoEntry,
  FavoriteWorkEntry,
  InterestEntry,
  PinnedQuote,
  PinnedWork,
  ProfileQuoteEntry,
  ProfileWorkType,
  TasteDimensionEntry,
  UserProfile,
} from "../types";

const ACCENT = "#38C8E0";
const FIELD =
  "w-full rounded-md border border-[#2A3341] bg-[#0B1017] px-3 py-2 text-[12px] text-white placeholder:text-[#5B6678] outline-none transition-colors focus:border-[#38C8E0]/60 focus:ring-2 focus:ring-[#38C8E0]/10";
const LABEL = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A94A6]";

const WORK_TYPES: ProfileWorkType[] = ["ANIME", "MANGA", "MANHWA", "NOVEL", "MOVIE"];
const TRAIT_ICON_KEYS = ["sparkles", "target", "moon", "swords", "pen"];
const INTO_ICONS = ["book", "headphones", "screen", "bookmark"];

type TabId = "identity" | "showcase" | "favorites" | "characters" | "quotes" | "lists" | "account";

const TABS: { id: TabId; label: string; icon: typeof UserIcon }[] = [
  { id: "identity", label: "Identity", icon: UserIcon },
  { id: "showcase", label: "Showcase", icon: Sparkles },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "characters", label: "Characters", icon: Users },
  { id: "quotes", label: "Quotes", icon: Quote },
  { id: "lists", label: "Lists", icon: ListChecks },
  { id: "account", label: "Account", icon: Settings },
];

interface IdentityDraft {
  username: string;
  displayName: string;
  bio: string;
  pronouns: string;
  avatarUrl: string;
  bannerUrl: string;
  location: string;
  languages: string;
  websiteUrl: string;
  instagram: string;
  twitter: string;
  malUsername: string;
  readingTitle: string;
  readingChapter: string;
}

interface ShowcaseDraft {
  pinnedWork: PinnedWork;
  pinnedQuote: PinnedQuote;
  tasteDna: TasteDimensionEntry[];
  favoriteTheme: string;
  mood: string;
  currentlyInto: CurrentlyIntoEntry[];
  traits: string[];
  interests: InterestEntry[];
  currentlyExploring: string;
}

interface FavoriteDraft {
  key: string;
  title: string;
  type: ProfileWorkType;
  meta: string;
  rating: string;
  imageUrl: string;
  animeId: number | null;
}

interface QuoteDraft {
  key: string;
  text: string;
  attribution: string;
  source: string;
  favorite: boolean;
  original: boolean;
}

const EMPTY_PINNED_WORK: PinnedWork = {
  label: "",
  meta: "",
  title: "",
  quote: "",
  rating: "",
  stats: [],
  image: "",
};

const EMPTY_SHOWCASE: ShowcaseDraft = {
  pinnedWork: EMPTY_PINNED_WORK,
  pinnedQuote: { label: "", text: "", attribution: "" },
  tasteDna: [],
  favoriteTheme: "",
  mood: "",
  currentlyInto: [],
  traits: [],
  interests: [],
  currentlyExploring: "",
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function favoritesFromProfile(items: FavoriteWorkEntry[] | undefined): FavoriteDraft[] {
  return (items ?? []).map((item) => ({
    key: item.id || uid(),
    title: item.title,
    type: item.type,
    meta: item.meta,
    rating: item.rating,
    imageUrl: item.imageUrl,
    animeId: item.animeId,
  }));
}

function quotesFromProfile(items: ProfileQuoteEntry[] | undefined): QuoteDraft[] {
  return (items ?? []).map((item) => ({
    key: item.id || uid(),
    text: item.text,
    attribution: item.attribution,
    source: item.source,
    favorite: item.favorite,
    original: item.original,
  }));
}

function trimOrEmpty(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function fileToDataUrl(file: File, maxWidth: number, maxHeight: number, quality = 0.86): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not decode that image"));
      image.onload = () => {
        const ratio = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas is not available"));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[9.5px] leading-relaxed text-[#64748B]">{hint}</span> : null}
    </label>
  );
}

function SectionCard({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#1E2630] bg-[#11161D]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#1E2630] px-4 py-3.5">
        <div>
          <h2 className="font-condensed text-[13px] font-bold uppercase tracking-[0.12em] text-white">{title}</h2>
          {description ? <p className="mt-1 text-[10px] leading-relaxed text-[#8A94A6]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function ImageField({
  label,
  value,
  onChange,
  maxWidth,
  maxHeight,
  aspect = "square",
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxWidth: number;
  maxHeight: number;
  aspect?: "square" | "wide" | "portrait";
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setLocalError("");
    try {
      onChange(await fileToDataUrl(file, maxWidth, maxHeight));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const previewClass =
    aspect === "wide" ? "h-16 w-28" : aspect === "portrait" ? "h-28 w-20" : "h-16 w-16 rounded-md";

  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 overflow-hidden rounded-md border border-[#2A3341] bg-[#0B1017] ${previewClass}`}>
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#475569]">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2A3341] bg-[#0B1017] px-2.5 py-1.5 text-[10px] font-medium text-[#E2E8F0] transition-colors hover:border-[#38C8E0]/50 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Upload image
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1 rounded-md border border-[#2A3341] px-2.5 py-1.5 text-[10px] text-[#8A94A6] transition-colors hover:border-[#FB7185]/50 hover:text-[#FB7185]"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            ) : null}
          </div>
          <input
            type="text"
            value={value.startsWith("data:") ? "" : value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={value.startsWith("data:") ? "Uploaded image" : "https://image-url…"}
            className={FIELD}
          />
          {localError ? <p className="text-[9.5px] text-[#FB7185]">{localError}</p> : null}
          {hint ? <p className="text-[9px] leading-relaxed text-[#64748B]">{hint}</p> : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}

interface SearchPick {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
}

function SearchAdd({
  mode,
  placeholder,
  onPick,
}: {
  mode: "anime" | "character";
  placeholder: string;
  onPick: (pick: SearchPick) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchPick[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        if (mode === "anime") {
          const data: AnimeListResponse = await searchAnime(term);
          if (cancelled) return;
          setResults(
            data.results.map((item) => ({
              id: Number(item.id),
              title: item.title,
              subtitle: [item.type, item.releaseDate?.slice(0, 4)].filter(Boolean).join(" · "),
              imageUrl: item.image ?? "",
            }))
          );
        } else {
          const data: { results: CharacterSearchResult[] } = await searchCharacters(term);
          if (cancelled) return;
          setResults(
            data.results.map((item) => ({
              id: item.characterId,
              title: item.name,
              subtitle: item.animeName ?? "",
              imageUrl: item.imageUrl ?? "",
            }))
          );
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5B6678]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className={`${FIELD} pl-8`}
        />
        {busy ? <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#5B6678]" /> : null}
      </div>
      {results.length > 0 ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-[#2A3341] bg-[#0D131A] p-1 shadow-2xl">
          {results.map((result) => (
            <button
              key={`${mode}-${result.id}`}
              type="button"
              onClick={() => {
                onPick(result);
                setQuery("");
                setResults([]);
              }}
              className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left transition-colors hover:bg-white/[0.05]"
            >
              <span className="h-9 w-7 shrink-0 overflow-hidden rounded bg-[#11161D]">
                {result.imageUrl ? <img src={result.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] text-white">{result.title}</span>
                {result.subtitle ? <span className="block truncate text-[9px] text-[#8A94A6]">{result.subtitle}</span> : null}
              </span>
              <Plus className="h-3.5 w-3.5 shrink-0 text-[#38C8E0]" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#2A3341] bg-[#0B1017] transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? "text-[#8A94A6] hover:border-[#FB7185]/50 hover:text-[#FB7185]"
          : "text-[#8A94A6] hover:border-[#38C8E0]/50 hover:text-[#38C8E0]"
      }`}
    >
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const [tab, setTab] = useState<TabId>(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    return TABS.some((item) => item.id === requested) ? (requested as TabId) : "identity";
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [identity, setIdentity] = useState<IdentityDraft>({
    username: "",
    displayName: "",
    bio: "",
    pronouns: "",
    avatarUrl: "",
    bannerUrl: "",
    location: "",
    languages: "",
    websiteUrl: "",
    instagram: "",
    twitter: "",
    malUsername: "",
    readingTitle: "",
    readingChapter: "",
  });
  const [showcase, setShowcase] = useState<ShowcaseDraft>(EMPTY_SHOWCASE);
  const [favorites, setFavorites] = useState<FavoriteDraft[]>([]);
  const [characters, setCharacters] = useState<CharacterEntry[]>([]);
  const [quotes, setQuotes] = useState<QuoteDraft[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newList, setNewList] = useState({ title: "", description: "" });
  const [creatingList, setCreatingList] = useState(false);

  const applyProfile = useCallback((profile: UserProfile) => {
    setIdentity({
      username: profile.username,
      displayName: profile.displayName ?? profile.username,
      bio: profile.bio ?? "",
      pronouns: profile.pronouns ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      bannerUrl: profile.bannerUrl ?? "",
      location: profile.location ?? "",
      languages: profile.languages ?? "",
      websiteUrl: profile.websiteUrl ?? "",
      instagram: profile.instagram ?? "",
      twitter: profile.twitter ?? "",
      malUsername: profile.malUsername ?? "",
      readingTitle: profile.currentlyReading?.title ?? "",
      readingChapter: profile.currentlyReading?.chapter ?? "",
    });
    setShowcase({
      pinnedWork: profile.pinnedWork ?? EMPTY_PINNED_WORK,
      pinnedQuote: profile.pinnedQuote ?? { label: "", text: "", attribution: "" },
      tasteDna: profile.tasteDna ?? [],
      favoriteTheme: profile.favoriteTheme ?? "",
      mood: profile.mood ?? "",
      currentlyInto: profile.currentlyInto ?? [],
      traits: profile.traits ?? [],
      interests: profile.interests ?? [],
      currentlyExploring: profile.currentlyExploring ?? "",
    });
    setFavorites(favoritesFromProfile(profile.favoriteWorks));
    setCharacters(profile.topCharacters ?? []);
    setQuotes(quotesFromProfile(profile.quotes));
    setCollections(profile.collections ?? []);
  }, []);

  const loadProfile = useCallback(
    async (username: string) => {
      const profile = await getProfile(username);
      applyProfile(profile);
    },
    [applyProfile]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadProfile(user.username)
      .catch((err) => {
        if (!cancelled) {
          setStatus({ type: "err", text: err instanceof Error ? err.message : "Could not load your profile" });
          setIdentity((current) => ({
            ...current,
            username: user.username,
            displayName: user.username,
            bio: user.bio ?? "",
            pronouns: user.pronouns ?? "",
            avatarUrl: user.avatarUrl ?? "",
          }));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.username, loadProfile]);

  const switchTab = (next: TabId) => {
    setTab(next);
    setStatus(null);
    window.history.replaceState(null, "", `/settings?tab=${next}`);
    document.querySelector("main")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const run = async (task: () => Promise<void>, success: string) => {
    setSaving(true);
    setStatus(null);
    try {
      await task();
      setStatus({ type: "ok", text: success });
    } catch (err) {
      setStatus({ type: "err", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  const saveIdentity = () =>
    run(async () => {
      if (!user) return;
      const data = await updateProfile(user.username, {
        username: identity.username.trim(),
        display_name: identity.displayName,
        bio: identity.bio,
        pronouns: identity.pronouns,
        avatar_url: identity.avatarUrl,
        banner_url: identity.bannerUrl,
        location: identity.location,
        languages: identity.languages,
        website_url: identity.websiteUrl,
        instagram: identity.instagram,
        twitter: identity.twitter,
        mal_username: identity.malUsername,
        currently_reading_title: identity.readingTitle,
        currently_reading_chapter: identity.readingChapter,
      });
      updateUser({
        username: data.username,
        bio: data.bio ?? identity.bio,
        pronouns: data.pronouns ?? identity.pronouns,
        avatarUrl: data.avatarUrl,
      });
      if (data.username !== user.username) {
        await loadProfile(data.username);
      }
    }, "Identity saved");

  const saveShowcase = () =>
    run(async () => {
      if (!user) return;
      await updateProfile(user.username, {
        pinned_work: showcase.pinnedWork,
        pinned_quote: showcase.pinnedQuote,
        taste_dna: showcase.tasteDna,
        favorite_theme: showcase.favoriteTheme,
        profile_mood: showcase.mood,
        currently_into: showcase.currentlyInto,
        traits: showcase.traits,
        interests: showcase.interests,
        currently_exploring: showcase.currentlyExploring,
      });
    }, "Showcase saved");

  const saveFavorites = () =>
    run(async () => {
      if (!user) return;
      const response = await setFavoriteWorks(
        user.username,
        favorites
          .filter((item) => item.title.trim())
          .map((item) => ({
            title: item.title.trim(),
            type: item.type,
            meta: item.meta,
            rating: item.rating,
            image_url: item.imageUrl,
            anime_id: item.animeId,
          }))
      );
      setFavorites(favoritesFromProfile(response.results));
    }, "Favorites saved");

  const saveCharacters = () =>
    run(async () => {
      if (!user) return;
      const response = await setTopCharacters(
        user.username,
        characters.map((item) => ({
          character_id: item.characterId,
          name: item.name,
          image_url: item.imageUrl,
          anime_name: item.animeName,
          note: item.note ?? "",
          label: item.label ?? "",
        }))
      );
      setCharacters(response.results);
    }, "Characters saved");

  const saveQuotes = () =>
    run(async () => {
      if (!user) return;
      const response = await setProfileQuotes(
        user.username,
        quotes
          .filter((item) => item.text.trim())
          .map((item) => ({
            text: item.text,
            attribution: item.attribution,
            source: item.source,
            favorite: item.favorite,
            original: item.original,
          }))
      );
      setQuotes(quotesFromProfile(response.results));
    }, "Quotes saved");

  const handleCreateList = async () => {
    if (!user || newList.title.trim().length < 2) {
      setStatus({ type: "err", text: "Give your list a title first" });
      return;
    }
    setCreatingList(true);
    setStatus(null);
    try {
      const created = await createCollection(user.username, newList.title.trim(), newList.description);
      setCollections((current) => [created, ...current]);
      setNewList({ title: "", description: "" });
      setStatus({ type: "ok", text: "List created" });
    } catch (err) {
      setStatus({ type: "err", text: err instanceof Error ? err.message : "Could not create that list" });
    } finally {
      setCreatingList(false);
    }
  };

  const handleUpdateList = async (id: string, data: { title: string; description: string }) => {
    try {
      const updated = await updateCollectionRequest(id, {
        title: data.title.trim(),
        description: data.description,
      });
      setCollections((current) => current.map((item) => (item.id === id ? updated : item)));
      setStatus({ type: "ok", text: "List updated" });
    } catch (err) {
      setStatus({ type: "err", text: err instanceof Error ? err.message : "Could not update that list" });
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!window.confirm("Delete this list? This can't be undone.")) return;
    try {
      await deleteCollection(id);
      setCollections((current) => current.filter((item) => item.id !== id));
      setStatus({ type: "ok", text: "List deleted" });
    } catch (err) {
      setStatus({ type: "err", text: err instanceof Error ? err.message : "Could not delete that list" });
    }
  };

  const handleAddListItem = async (collectionId: string, pick: SearchPick) => {
    try {
      const item = await addCollectionItem(collectionId, {
        anime_id: pick.id,
        title: pick.title,
        image_url: pick.imageUrl,
      });
      setCollections((current) =>
        current.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                itemCount: collection.itemCount + 1,
                items: [...(collection.items ?? []), item],
              }
            : collection
        )
      );
    } catch (err) {
      setStatus({ type: "err", text: err instanceof Error ? err.message : "Could not add that item" });
    }
  };

  const handleRemoveListItem = async (collectionId: string, item: CollectionItem) => {
    try {
      await removeCollectionItem(collectionId, item.id);
      setCollections((current) =>
        current.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                itemCount: Math.max(0, collection.itemCount - 1),
                items: (collection.items ?? []).filter((entry) => entry.id !== item.id),
              }
            : collection
        )
      );
    } catch (err) {
      setStatus({ type: "err", text: err instanceof Error ? err.message : "Could not remove that item" });
    }
  };

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-condensed text-2xl font-bold uppercase tracking-wide text-white">Profile studio</p>
        <p className="text-sm text-[#8A94A6]">Sign in to shape your profile.</p>
        <Link
          href="/login"
          className="mt-1 inline-flex h-9 items-center rounded-md px-4 text-[12px] font-semibold text-[#06222A]"
          style={{ background: ACCENT }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-6 lg:px-[63px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/users/${encodeURIComponent(user.username)}`}
            className="mb-2 inline-flex items-center gap-1.5 text-[10px] text-[#8A94A6] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" /> Back to profile
          </Link>
          <p className="font-condensed text-[9px] font-bold uppercase tracking-[0.34em] text-[#38C8E0]">
            Profile studio
          </p>
          <h1 className="mt-1 font-condensed text-[30px] font-bold leading-none text-white">Shape your identity</h1>
          <p className="mt-1.5 text-[11px] text-[#8A94A6]">
            Everything here is public. Changes appear on your profile instantly after saving.
          </p>
        </div>
        <Link
          href={`/users/${encodeURIComponent(user.username)}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#2A3341] bg-[#11161D] px-3.5 text-[11px] font-semibold text-white transition-colors hover:border-[#38C8E0]/50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View public profile
        </Link>
      </div>

      {status ? (
        <div
          className={`mb-4 rounded-lg border px-3.5 py-2.5 text-[11px] ${
            status.type === "ok"
              ? "border-[#38C8E0]/30 bg-[#38C8E0]/10 text-[#7DE3F4]"
              : "border-[#FB7185]/30 bg-[#FB7185]/10 text-[#FDA4AF]"
          }`}
        >
          {status.text}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-20 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:pb-0">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-[#38C8E0]/10 text-[#38C8E0]"
                    : "text-[#8A94A6] hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-40 animate-pulse rounded-xl border border-[#1E2630] bg-[#11161D]" />
              <div className="h-52 animate-pulse rounded-xl border border-[#1E2630] bg-[#11161D]" />
            </div>
          ) : (
            <>
              {tab === "identity" ? (
                <>
                  <SectionCard
                    title="Portrait & banner"
                    description="Upload an image or paste a URL. Uploads are resized in your browser before saving."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ImageField
                        label="Avatar"
                        value={identity.avatarUrl}
                        onChange={(avatarUrl) => setIdentity({ ...identity, avatarUrl })}
                        maxWidth={512}
                        maxHeight={512}
                        hint="Square images look best."
                      />
                      <ImageField
                        label="Banner"
                        value={identity.bannerUrl}
                        onChange={(bannerUrl) => setIdentity({ ...identity, bannerUrl })}
                        maxWidth={1800}
                        maxHeight={720}
                        aspect="wide"
                        hint="Wide image, at least 1200px across."
                      />
                    </div>
                  </SectionCard>

                  <SectionCard title="Identity" description="How you show up across Analithe.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Display name" hint="Shown as the big name on your profile.">
                        <input
                          value={identity.displayName}
                          onChange={(event) => setIdentity({ ...identity, displayName: event.target.value })}
                          maxLength={80}
                          className={FIELD}
                          placeholder="xhi clox"
                        />
                      </Field>
                      <Field label="Username" hint="Letters, numbers, hyphens and underscores only.">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#5B6678]">
                            @
                          </span>
                          <input
                            value={identity.username}
                            onChange={(event) => setIdentity({ ...identity, username: event.target.value })}
                            maxLength={30}
                            className={`${FIELD} pl-7`}
                            placeholder="xhi-clox"
                          />
                        </div>
                      </Field>
                      <Field label="Pronouns">
                        <input
                          value={identity.pronouns}
                          onChange={(event) => setIdentity({ ...identity, pronouns: event.target.value })}
                          maxLength={50}
                          className={FIELD}
                          placeholder="she/her, he/him, they/them"
                        />
                      </Field>
                      <Field label="Location">
                        <input
                          value={identity.location}
                          onChange={(event) => setIdentity({ ...identity, location: event.target.value })}
                          maxLength={120}
                          className={FIELD}
                          placeholder="Dhaka, Bangladesh"
                        />
                      </Field>
                      <Field label="Languages">
                        <input
                          value={identity.languages}
                          onChange={(event) => setIdentity({ ...identity, languages: event.target.value })}
                          maxLength={200}
                          className={FIELD}
                          placeholder="English, বাংলা"
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Bio" hint={`${identity.bio.length}/500 characters`}>
                          <textarea
                            value={identity.bio}
                            onChange={(event) => setIdentity({ ...identity, bio: event.target.value })}
                            maxLength={500}
                            rows={3}
                            className={`${FIELD} resize-none`}
                            placeholder="A reader, observer, and occasional overthinker…"
                          />
                        </Field>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Currently reading" description="A small live status under your name.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Title">
                        <input
                          value={identity.readingTitle}
                          onChange={(event) => setIdentity({ ...identity, readingTitle: event.target.value })}
                          maxLength={200}
                          className={FIELD}
                          placeholder="Vagabond"
                        />
                      </Field>
                      <Field label="Progress">
                        <input
                          value={identity.readingChapter}
                          onChange={(event) => setIdentity({ ...identity, readingChapter: event.target.value })}
                          maxLength={80}
                          className={FIELD}
                          placeholder="Ch. 214 / 327"
                        />
                      </Field>
                    </div>
                  </SectionCard>

                  <SectionCard title="Elsewhere" description="Links shown in the sidebar and under your name.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Instagram">
                        <input
                          value={identity.instagram}
                          onChange={(event) => setIdentity({ ...identity, instagram: event.target.value })}
                          maxLength={120}
                          className={FIELD}
                          placeholder="@xhi-clox"
                        />
                      </Field>
                      <Field label="X / Twitter">
                        <input
                          value={identity.twitter}
                          onChange={(event) => setIdentity({ ...identity, twitter: event.target.value })}
                          maxLength={120}
                          className={FIELD}
                          placeholder="@xhi-clox"
                        />
                      </Field>
                      <Field label="MyAnimeList username">
                        <input
                          value={identity.malUsername}
                          onChange={(event) => setIdentity({ ...identity, malUsername: event.target.value })}
                          maxLength={120}
                          className={FIELD}
                          placeholder="xhi-clox"
                        />
                      </Field>
                      <Field label="Website">
                        <input
                          value={identity.websiteUrl}
                          onChange={(event) => setIdentity({ ...identity, websiteUrl: event.target.value })}
                          maxLength={500}
                          className={FIELD}
                          placeholder="https://analithe.app"
                        />
                      </Field>
                    </div>
                  </SectionCard>

                  <SaveBar saving={saving} onSave={saveIdentity} label="Save identity" />
                </>
              ) : null}

              {tab === "showcase" ? (
                <>
                  <SectionCard
                    title="The pinned work"
                    description="The one story that defines your taste. This is the large card in your showcase."
                  >
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Eyebrow / label">
                            <input
                              value={showcase.pinnedWork.label}
                              onChange={(event) =>
                                setShowcase({
                                  ...showcase,
                                  pinnedWork: { ...showcase.pinnedWork, label: event.target.value },
                                })
                              }
                              maxLength={120}
                              className={FIELD}
                              placeholder="THE ONE THAT DEFINES ME"
                            />
                          </Field>
                          <Field label="Meta line">
                            <input
                              value={showcase.pinnedWork.meta}
                              onChange={(event) =>
                                setShowcase({
                                  ...showcase,
                                  pinnedWork: { ...showcase.pinnedWork, meta: event.target.value },
                                })
                              }
                              maxLength={160}
                              className={FIELD}
                              placeholder="MANGA · NAOKI URASAWA"
                            />
                          </Field>
                          <Field label="Title">
                            <input
                              value={showcase.pinnedWork.title}
                              onChange={(event) =>
                                setShowcase({
                                  ...showcase,
                                  pinnedWork: { ...showcase.pinnedWork, title: event.target.value },
                                })
                              }
                              maxLength={200}
                              className={FIELD}
                              placeholder="MONSTER"
                            />
                          </Field>
                          <Field label="Rating">
                            <input
                              value={showcase.pinnedWork.rating}
                              onChange={(event) =>
                                setShowcase({
                                  ...showcase,
                                  pinnedWork: { ...showcase.pinnedWork, rating: event.target.value },
                                })
                              }
                              maxLength={20}
                              className={FIELD}
                              placeholder="9.8"
                            />
                          </Field>
                        </div>
                        <Field label="Why it defines you">
                          <textarea
                            value={showcase.pinnedWork.quote}
                            onChange={(event) =>
                              setShowcase({
                                ...showcase,
                                pinnedWork: { ...showcase.pinnedWork, quote: event.target.value },
                              })
                            }
                            maxLength={500}
                            rows={2}
                            className={`${FIELD} resize-none`}
                            placeholder="It taught me that the scariest monsters are the ones who make perfect sense."
                          />
                        </Field>
                        <Field label="Small facts" hint="Separate facts with a comma — first one gets the pen icon.">
                          <input
                            value={showcase.pinnedWork.stats.join(", ")}
                            onChange={(event) =>
                              setShowcase({
                                ...showcase,
                                pinnedWork: {
                                  ...showcase.pinnedWork,
                                  stats: event.target.value
                                    .split(",")
                                    .map((stat) => stat.trim())
                                    .filter(Boolean)
                                    .slice(0, 6),
                                },
                              })
                            }
                            className={FIELD}
                            placeholder="Re-read 3×, Since 2019"
                          />
                        </Field>
                      </div>
                      <ImageField
                        label="Cover"
                        value={showcase.pinnedWork.image}
                        onChange={(image) =>
                          setShowcase({ ...showcase, pinnedWork: { ...showcase.pinnedWork, image } })
                        }
                        maxWidth={700}
                        maxHeight={1000}
                        aspect="portrait"
                      />
                    </div>
                  </SectionCard>

                  <SectionCard title="The pinned quote" description="A line you live by, shown beside your pinned work.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Eyebrow / label">
                        <input
                          value={showcase.pinnedQuote.label}
                          onChange={(event) =>
                            setShowcase({
                              ...showcase,
                              pinnedQuote: { ...showcase.pinnedQuote, label: event.target.value },
                            })
                          }
                          maxLength={120}
                          className={FIELD}
                          placeholder="A LINE I LIVE BY"
                        />
                      </Field>
                      <Field label="Attribution">
                        <input
                          value={showcase.pinnedQuote.attribution}
                          onChange={(event) =>
                            setShowcase({
                              ...showcase,
                              pinnedQuote: { ...showcase.pinnedQuote, attribution: event.target.value },
                            })
                          }
                          maxLength={200}
                          className={FIELD}
                          placeholder="The same old curiosity"
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Quote">
                          <textarea
                            value={showcase.pinnedQuote.text}
                            onChange={(event) =>
                              setShowcase({
                                ...showcase,
                                pinnedQuote: { ...showcase.pinnedQuote, text: event.target.value },
                              })
                            }
                            maxLength={500}
                            rows={2}
                            className={`${FIELD} resize-none`}
                            placeholder="And, when you can't go back, you have to worry only about the best way of moving forward."
                          />
                        </Field>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Taste DNA"
                    description="Four dimensions that describe what you look for in a story."
                    actions={
                      <button
                        type="button"
                        onClick={() =>
                          setShowcase({
                            ...showcase,
                            tasteDna: [...showcase.tasteDna, { label: "", value: 70 }].slice(0, 6),
                          })
                        }
                        disabled={showcase.tasteDna.length >= 6}
                        className="inline-flex items-center gap-1 rounded-md border border-[#2A3341] px-2 py-1 text-[10px] text-[#CBD5E1] transition-colors hover:border-[#38C8E0]/50 disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" /> Add dimension
                      </button>
                    }
                  >
                    {showcase.tasteDna.length === 0 ? (
                      <p className="text-[11px] text-[#8A94A6]">No dimensions yet.</p>
                    ) : null}
                    <div className="space-y-3">
                      {showcase.tasteDna.map((dimension, index) => (
                        <div key={index} className="flex items-end gap-2">
                          <div className="min-w-0 flex-1">
                            <Field label="Dimension">
                              <input
                                value={dimension.label}
                                onChange={(event) => {
                                  const next = [...showcase.tasteDna];
                                  next[index] = { ...next[index], label: event.target.value };
                                  setShowcase({ ...showcase, tasteDna: next });
                                }}
                                maxLength={60}
                                className={FIELD}
                                placeholder="Psychological"
                              />
                            </Field>
                          </div>
                          <div className="w-32">
                            <Field label={`${dimension.value}%`}>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={dimension.value}
                                onChange={(event) => {
                                  const next = [...showcase.tasteDna];
                                  next[index] = { ...next[index], value: Number(event.target.value) };
                                  setShowcase({ ...showcase, tasteDna: next });
                                }}
                                className="h-8 w-full accent-[#38C8E0]"
                              />
                            </Field>
                          </div>
                          <IconButton
                            label="Remove dimension"
                            danger
                            onClick={() =>
                              setShowcase({
                                ...showcase,
                                tasteDna: showcase.tasteDna.filter((_, i) => i !== index),
                              })
                            }
                          >
                            <X className="h-3 w-3" />
                          </IconButton>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Favorite theme">
                        <input
                          value={showcase.favoriteTheme}
                          onChange={(event) => setShowcase({ ...showcase, favoriteTheme: event.target.value })}
                          maxLength={120}
                          className={FIELD}
                          placeholder="Identity & fate"
                        />
                      </Field>
                      <Field label="Profile mood">
                        <input
                          value={showcase.mood}
                          onChange={(event) => setShowcase({ ...showcase, mood: event.target.value })}
                          maxLength={120}
                          className={FIELD}
                          placeholder="Thought-provoking"
                        />
                      </Field>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Currently into"
                    description="Up to four things you're reading, watching, or listening to."
                    actions={
                      <button
                        type="button"
                        onClick={() =>
                          setShowcase({
                            ...showcase,
                            currentlyInto: [
                              ...showcase.currentlyInto,
                              { icon: "book", title: "", meta: "" },
                            ].slice(0, 4),
                          })
                        }
                        disabled={showcase.currentlyInto.length >= 4}
                        className="inline-flex items-center gap-1 rounded-md border border-[#2A3341] px-2 py-1 text-[10px] text-[#CBD5E1] transition-colors hover:border-[#38C8E0]/50 disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" /> Add item
                      </button>
                    }
                  >
                    {showcase.currentlyInto.length === 0 ? (
                      <p className="text-[11px] text-[#8A94A6]">Nothing yet.</p>
                    ) : null}
                    <div className="space-y-3">
                      {showcase.currentlyInto.map((item, index) => (
                        <div key={index} className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)_minmax(0,1fr)_28px]">
                          <select
                            value={item.icon}
                            onChange={(event) => {
                              const next = [...showcase.currentlyInto];
                              next[index] = { ...next[index], icon: event.target.value };
                              setShowcase({ ...showcase, currentlyInto: next });
                            }}
                            className={FIELD}
                          >
                            {INTO_ICONS.map((icon) => (
                              <option key={icon} value={icon}>
                                {icon}
                              </option>
                            ))}
                          </select>
                          <input
                            value={item.title}
                            onChange={(event) => {
                              const next = [...showcase.currentlyInto];
                              next[index] = { ...next[index], title: event.target.value };
                              setShowcase({ ...showcase, currentlyInto: next });
                            }}
                            maxLength={120}
                            className={FIELD}
                            placeholder="Vagabond"
                          />
                          <input
                            value={item.meta}
                            onChange={(event) => {
                              const next = [...showcase.currentlyInto];
                              next[index] = { ...next[index], meta: event.target.value };
                              setShowcase({ ...showcase, currentlyInto: next });
                            }}
                            maxLength={120}
                            className={FIELD}
                            placeholder="Ch. 214 / 327"
                          />
                          <IconButton
                            label="Remove item"
                            danger
                            onClick={() =>
                              setShowcase({
                                ...showcase,
                                currentlyInto: showcase.currentlyInto.filter((_, i) => i !== index),
                              })
                            }
                          >
                            <X className="h-3 w-3" />
                          </IconButton>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Traits & interests"
                    description="Short chips under your name and in the sidebar."
                  >
                    <div>
                      <span className={LABEL}>Profile traits</span>
                      <div className="flex flex-wrap gap-1.5">
                        {showcase.traits.map((trait, index) => (
                          <span
                            key={`${trait}-${index}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#2A3341] bg-[#0B1017] px-2.5 py-1 text-[10px] text-[#CBD5E1]"
                          >
                            {trait || "Untitled"}
                            <button
                              type="button"
                              onClick={() =>
                                setShowcase({
                                  ...showcase,
                                  traits: showcase.traits.filter((_, i) => i !== index),
                                })
                              }
                              className="text-[#64748B] transition-colors hover:text-[#FB7185]"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                        {showcase.traits.length < 5 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setShowcase({ ...showcase, traits: [...showcase.traits, TRAIT_ICON_KEYS[showcase.traits.length] ?? "Writing analyses"] })
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#2A3341] px-2.5 py-1 text-[10px] text-[#8A94A6] transition-colors hover:border-[#38C8E0]/50 hover:text-[#38C8E0]"
                          >
                            <Plus className="h-2.5 w-2.5" /> Add trait
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-3 space-y-2">
                        {showcase.traits.map((trait, index) => (
                          <input
                            key={`trait-input-${index}`}
                            value={trait}
                            onChange={(event) => {
                              const next = [...showcase.traits];
                              next[index] = event.target.value;
                              setShowcase({ ...showcase, traits: next });
                            }}
                            maxLength={60}
                            className={FIELD}
                            placeholder="e.g. Character studies"
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className={LABEL}>Interests & hobbies</span>
                      <div className="space-y-2">
                        {showcase.interests.map((interest, index) => (
                          <div key={index} className="grid grid-cols-[58px_minmax(0,1fr)_28px] gap-2">
                            <input
                              value={interest.emoji}
                              onChange={(event) => {
                                const next = [...showcase.interests];
                                next[index] = { ...next[index], emoji: event.target.value };
                                setShowcase({ ...showcase, interests: next });
                              }}
                              maxLength={8}
                              className={FIELD}
                              placeholder="🧠"
                            />
                            <input
                              value={interest.label}
                              onChange={(event) => {
                                const next = [...showcase.interests];
                                next[index] = { ...next[index], label: event.target.value };
                                setShowcase({ ...showcase, interests: next });
                              }}
                              maxLength={60}
                              className={FIELD}
                              placeholder="Psychology"
                            />
                            <IconButton
                              label="Remove interest"
                              danger
                              onClick={() =>
                                setShowcase({
                                  ...showcase,
                                  interests: showcase.interests.filter((_, i) => i !== index),
                                })
                              }
                            >
                              <X className="h-3 w-3" />
                            </IconButton>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setShowcase({
                              ...showcase,
                              interests: [...showcase.interests, { emoji: "✨", label: "" }].slice(0, 20),
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#2A3341] px-2 py-1 text-[10px] text-[#8A94A6] transition-colors hover:border-[#38C8E0]/50 hover:text-[#38C8E0]"
                        >
                          <Plus className="h-3 w-3" /> Add interest
                        </button>
                      </div>
                    </div>

                    <Field label="Currently exploring">
                      <textarea
                        value={showcase.currentlyExploring}
                        onChange={(event) => setShowcase({ ...showcase, currentlyExploring: event.target.value })}
                        maxLength={500}
                        rows={2}
                        className={`${FIELD} resize-none`}
                        placeholder="Existentialism, unreliable narrators, symbolism in fiction…"
                      />
                    </Field>
                  </SectionCard>

                  <SaveBar saving={saving} onSave={saveShowcase} label="Save showcase" />
                </>
              ) : null}

              {tab === "favorites" ? (
                <>
                  <SectionCard
                    title="Favorite works"
                    description="The Hall of Fame on your profile. Add anime, manga, manhwa, novels, or films."
                    actions={
                      <button
                        type="button"
                        onClick={() =>
                          setFavorites([
                            ...favorites,
                            { key: uid(), title: "", type: "ANIME", meta: "", rating: "", imageUrl: "", animeId: null },
                          ])
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-[#2A3341] px-2 py-1 text-[10px] text-[#CBD5E1] transition-colors hover:border-[#38C8E0]/50"
                      >
                        <Plus className="h-3 w-3" /> Add work
                      </button>
                    }
                  >
                    <SearchAdd
                      mode="anime"
                      placeholder="Search anime to add quickly…"
                      onPick={(pick) =>
                        setFavorites([
                          ...favorites,
                          {
                            key: uid(),
                            title: pick.title,
                            type: "ANIME",
                            meta: pick.subtitle,
                            rating: "",
                            imageUrl: pick.imageUrl,
                            animeId: pick.id,
                          },
                        ])
                      }
                    />

                    {favorites.length === 0 ? (
                      <p className="py-2 text-center text-[11px] text-[#8A94A6]">No favorites yet. Add your first one.</p>
                    ) : null}

                    <div className="space-y-3">
                      {favorites.map((favorite, index) => (
                        <div key={favorite.key} className="rounded-lg border border-[#1E2630] bg-[#0B1017] p-3">
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                            <div className="space-y-2">
                              <input
                                value={favorite.title}
                                onChange={(event) => {
                                  const next = [...favorites];
                                  next[index] = { ...next[index], title: event.target.value };
                                  setFavorites(next);
                                }}
                                maxLength={500}
                                className={FIELD}
                                placeholder="Title"
                              />
                              <input
                                value={favorite.meta}
                                onChange={(event) => {
                                  const next = [...favorites];
                                  next[index] = { ...next[index], meta: event.target.value };
                                  setFavorites(next);
                                }}
                                maxLength={300}
                                className={FIELD}
                                placeholder="Dark fantasy · 2013"
                              />
                              <ImageField
                                label="Cover"
                                value={favorite.imageUrl}
                                onChange={(imageUrl) => {
                                  const next = [...favorites];
                                  next[index] = { ...next[index], imageUrl };
                                  setFavorites(next);
                                }}
                                maxWidth={600}
                                maxHeight={800}
                                aspect="portrait"
                              />
                            </div>
                            <div className="space-y-2">
                              <select
                                value={favorite.type}
                                onChange={(event) => {
                                  const next = [...favorites];
                                  next[index] = { ...next[index], type: event.target.value as ProfileWorkType };
                                  setFavorites(next);
                                }}
                                className={FIELD}
                              >
                                {WORK_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={favorite.rating}
                                onChange={(event) => {
                                  const next = [...favorites];
                                  next[index] = { ...next[index], rating: event.target.value };
                                  setFavorites(next);
                                }}
                                maxLength={20}
                                className={FIELD}
                                placeholder="Rating 9.8"
                              />
                              <div className="flex items-center justify-end gap-1">
                                <IconButton
                                  label="Move up"
                                  disabled={index === 0}
                                  onClick={() => {
                                    const next = [...favorites];
                                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                    setFavorites(next);
                                  }}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </IconButton>
                                <IconButton
                                  label="Move down"
                                  disabled={index === favorites.length - 1}
                                  onClick={() => {
                                    const next = [...favorites];
                                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                                    setFavorites(next);
                                  }}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </IconButton>
                                <IconButton
                                  label="Remove favorite"
                                  danger
                                  onClick={() => setFavorites(favorites.filter((_, i) => i !== index))}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </IconButton>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SaveBar saving={saving} onSave={saveFavorites} label="Save favorites" />
                </>
              ) : null}

              {tab === "characters" ? (
                <>
                  <SectionCard
                    title="Favorite characters"
                    description="Four kindred spirits, each with a label and a short note."
                    actions={
                      <span className="text-[10px] text-[#64748B]">{characters.length} / 10</span>
                    }
                  >
                    <SearchAdd
                      mode="character"
                      placeholder="Search characters to add…"
                      onPick={(pick) => {
                        if (characters.length >= 10) return;
                        if (characters.some((item) => item.characterId === pick.id)) return;
                        setCharacters([
                          ...characters,
                          {
                            characterId: pick.id,
                            name: pick.title,
                            imageUrl: pick.imageUrl,
                            animeName: pick.subtitle,
                            note: "",
                            label: "",
                            rank: characters.length + 1,
                          },
                        ]);
                      }}
                    />

                    {characters.length === 0 ? (
                      <p className="py-2 text-center text-[11px] text-[#8A94A6]">No characters yet.</p>
                    ) : null}

                    <div className="space-y-3">
                      {characters.map((character, index) => (
                        <div key={`${character.characterId}-${index}`} className="rounded-lg border border-[#1E2630] bg-[#0B1017] p-3">
                          <div className="flex gap-3">
                            <div className="h-24 w-16 shrink-0 overflow-hidden rounded border border-[#2A3341] bg-[#11161D]">
                              {character.imageUrl ? (
                                <img src={character.imageUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[#475569]">
                                  <UserIcon className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                  value={character.name}
                                  onChange={(event) => {
                                    const next = [...characters];
                                    next[index] = { ...next[index], name: event.target.value };
                                    setCharacters(next);
                                  }}
                                  maxLength={300}
                                  className={FIELD}
                                  placeholder="Name"
                                />
                                <input
                                  value={character.animeName}
                                  onChange={(event) => {
                                    const next = [...characters];
                                    next[index] = { ...next[index], animeName: event.target.value };
                                    setCharacters(next);
                                  }}
                                  maxLength={500}
                                  className={FIELD}
                                  placeholder="Series"
                                />
                                <input
                                  value={character.label ?? ""}
                                  onChange={(event) => {
                                    const next = [...characters];
                                    next[index] = { ...next[index], label: event.target.value };
                                    setCharacters(next);
                                  }}
                                  maxLength={80}
                                  className={FIELD}
                                  placeholder="THE DEFIANT"
                                />
                                <div className="flex items-center justify-end gap-1">
                                  <IconButton
                                    label="Move up"
                                    disabled={index === 0}
                                    onClick={() => {
                                      const next = [...characters];
                                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                      setCharacters(next.map((item, i) => ({ ...item, rank: i + 1 })));
                                    }}
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </IconButton>
                                  <IconButton
                                    label="Move down"
                                    disabled={index === characters.length - 1}
                                    onClick={() => {
                                      const next = [...characters];
                                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                                      setCharacters(next.map((item, i) => ({ ...item, rank: i + 1 })));
                                    }}
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </IconButton>
                                  <IconButton
                                    label="Remove character"
                                    danger
                                    onClick={() =>
                                      setCharacters(
                                        characters
                                          .filter((_, i) => i !== index)
                                          .map((item, i) => ({ ...item, rank: i + 1 }))
                                      )
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </IconButton>
                                </div>
                              </div>
                              <textarea
                                value={character.note ?? ""}
                                onChange={(event) => {
                                  const next = [...characters];
                                  next[index] = { ...next[index], note: event.target.value };
                                  setCharacters(next);
                                }}
                                maxLength={500}
                                rows={2}
                                className={`${FIELD} resize-none`}
                                placeholder="Why this character stays with you…"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SaveBar saving={saving} onSave={saveCharacters} label="Save characters" />
                </>
              ) : null}

              {tab === "quotes" ? (
                <>
                  <SectionCard
                    title="Quote wall"
                    description="One quote can be featured. The rest fill your wall."
                    actions={
                      <button
                        type="button"
                        onClick={() =>
                          setQuotes([
                            ...quotes,
                            { key: uid(), text: "", attribution: "", source: "", favorite: false, original: false },
                          ])
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-[#2A3341] px-2 py-1 text-[10px] text-[#CBD5E1] transition-colors hover:border-[#38C8E0]/50"
                      >
                        <Plus className="h-3 w-3" /> Add quote
                      </button>
                    }
                  >
                    {quotes.length === 0 ? (
                      <p className="py-2 text-center text-[11px] text-[#8A94A6]">No quotes yet.</p>
                    ) : null}
                    <div className="space-y-3">
                      {quotes.map((quote, index) => (
                        <div key={quote.key} className="rounded-lg border border-[#1E2630] bg-[#0B1017] p-3">
                          <textarea
                            value={quote.text}
                            onChange={(event) => {
                              const next = [...quotes];
                              next[index] = { ...next[index], text: event.target.value };
                              setQuotes(next);
                            }}
                            maxLength={1000}
                            rows={2}
                            className={`${FIELD} resize-none`}
                            placeholder="“The world is not beautiful, therefore it is.”"
                          />
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <input
                              value={quote.attribution}
                              onChange={(event) => {
                                const next = [...quotes];
                                next[index] = { ...next[index], attribution: event.target.value };
                                setQuotes(next);
                              }}
                              maxLength={300}
                              className={FIELD}
                              placeholder="Attribution"
                            />
                            <input
                              value={quote.source}
                              onChange={(event) => {
                                const next = [...quotes];
                                next[index] = { ...next[index], source: event.target.value };
                                setQuotes(next);
                              }}
                              maxLength={300}
                              className={FIELD}
                              placeholder="Source"
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-4">
                              <label className="inline-flex items-center gap-1.5 text-[10px] text-[#CBD5E1]">
                                <input
                                  type="radio"
                                  name="featured-quote"
                                  checked={quote.favorite}
                                  onChange={() =>
                                    setQuotes(
                                      quotes.map((item, i) => ({ ...item, favorite: i === index }))
                                    )
                                  }
                                  className="accent-[#38C8E0]"
                                />
                                Featured
                              </label>
                              <label className="inline-flex items-center gap-1.5 text-[10px] text-[#CBD5E1]">
                                <input
                                  type="checkbox"
                                  checked={quote.original}
                                  onChange={(event) => {
                                    const next = [...quotes];
                                    next[index] = { ...next[index], original: event.target.checked };
                                    setQuotes(next);
                                  }}
                                  className="accent-[#38C8E0]"
                                />
                                Original
                              </label>
                            </div>
                            <IconButton
                              label="Remove quote"
                              danger
                              onClick={() => setQuotes(quotes.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </IconButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SaveBar saving={saving} onSave={saveQuotes} label="Save quotes" />
                </>
              ) : null}

              {tab === "lists" ? (
                <>
                  <SectionCard title="Create a list" description="Group works around a mood, theme, or idea.">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="space-y-2">
                        <input
                          value={newList.title}
                          onChange={(event) => setNewList({ ...newList, title: event.target.value })}
                          maxLength={200}
                          className={FIELD}
                          placeholder="Stories that changed my perspective"
                        />
                        <input
                          value={newList.description}
                          onChange={(event) => setNewList({ ...newList, description: event.target.value })}
                          maxLength={1000}
                          className={FIELD}
                          placeholder="Optional description"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateList}
                        disabled={creatingList}
                        className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-md px-3.5 text-[11px] font-semibold text-[#06222A] disabled:opacity-50"
                        style={{ background: ACCENT }}
                      >
                        {creatingList ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Create list
                      </button>
                    </div>
                  </SectionCard>

                  {collections.length === 0 ? (
                    <SectionCard title="Your lists">
                      <p className="py-2 text-center text-[11px] text-[#8A94A6]">
                        No lists yet. Create your first one above.
                      </p>
                    </SectionCard>
                  ) : null}

                  {collections.map((collection) => (
                    <CollectionEditor
                      key={collection.id}
                      collection={collection}
                      onUpdate={handleUpdateList}
                      onDelete={handleDeleteList}
                      onAddItem={handleAddListItem}
                      onRemoveItem={handleRemoveListItem}
                    />
                  ))}
                </>
              ) : null}

              {tab === "account" ? (
                <>
                  <SectionCard title="Account" description="Your sign-in and identity details.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Username">
                        <input value={identity.username} readOnly className={`${FIELD} opacity-70`} />
                      </Field>
                      <Field label="Display name">
                        <input value={identity.displayName} readOnly className={`${FIELD} opacity-70`} />
                      </Field>
                    </div>
                    <p className="text-[10px] leading-relaxed text-[#64748B]">
                      Edit your username and display name in the Identity tab. Email and password changes are managed
                      through your account provider.
                    </p>
                    <div className="flex flex-wrap gap-2 border-t border-[#1E2630] pt-4">
                      <Link
                        href={`/users/${encodeURIComponent(identity.username)}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#2A3341] px-3 text-[10px] font-medium text-[#CBD5E1] transition-colors hover:border-[#38C8E0]/50 hover:text-white"
                      >
                        <ExternalLink className="h-3 w-3" /> View profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          window.location.href = "/";
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#FB7185]/30 bg-[#FB7185]/10 px-3 text-[10px] font-medium text-[#FDA4AF] transition-colors hover:bg-[#FB7185]/20"
                      >
                        <LogOut className="h-3 w-3" /> Sign out
                      </button>
                    </div>
                  </SectionCard>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveBar({ saving, onSave, label }: { saving: boolean; onSave: () => void; label: string }) {
  return (
    <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-xl border border-[#1E2630] bg-[#0A0D12]/95 px-4 py-3 backdrop-blur">
      <span className="mr-auto text-[10px] text-[#64748B]">Changes are saved to your live profile.</span>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-3.5 text-[11px] font-semibold text-[#06222A] transition-opacity disabled:opacity-50"
        style={{ background: ACCENT }}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}

function CollectionEditor({
  collection,
  onUpdate,
  onDelete,
  onAddItem,
  onRemoveItem,
}: {
  collection: Collection;
  onUpdate: (id: string, data: { title: string; description: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddItem: (id: string, pick: SearchPick) => Promise<void>;
  onRemoveItem: (id: string, item: CollectionItem) => Promise<void>;
}) {
  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(collection.title);
    setDescription(collection.description);
  }, [collection.id, collection.title, collection.description]);

  const save = async () => {
    setBusy(true);
    try {
      await onUpdate(collection.id, { title, description });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title={collection.title || "Untitled list"}
      description={`${collection.itemCount} entries · ${collection.likeCount ?? 0} likes`}
      actions={
        <>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-[#2A3341] px-2 py-1 text-[10px] text-[#CBD5E1] transition-colors hover:border-[#38C8E0]/50 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
          </button>
          <button
            type="button"
            onClick={() => onDelete(collection.id)}
            className="inline-flex items-center gap-1 rounded-md border border-[#FB7185]/30 px-2 py-1 text-[10px] text-[#FDA4AF] transition-colors hover:bg-[#FB7185]/10"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title">
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} className={FIELD} />
        </Field>
        <Field label="Description">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            className={FIELD}
          />
        </Field>
      </div>

      <div className="space-y-2">
        {(collection.items ?? []).length === 0 ? (
          <p className="text-[10px] text-[#8A94A6]">No entries yet.</p>
        ) : null}
        {(collection.items ?? []).map((item) => (
          <div key={item.id} className="flex items-center gap-2.5 rounded-md border border-[#1E2630] bg-[#0B1017] p-2">
            <span className="h-12 w-8 shrink-0 overflow-hidden rounded bg-[#11161D]">
              {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] text-white">{item.title}</span>
              <span className="block text-[9px] text-[#64748B]">#{item.rank}</span>
            </span>
            <IconButton label="Remove entry" danger onClick={() => onRemoveItem(collection.id, item)}>
              <X className="h-3 w-3" />
            </IconButton>
          </div>
        ))}
      </div>

      <SearchAdd mode="anime" placeholder="Search anime to add to this list…" onPick={(pick) => onAddItem(collection.id, pick)} />
    </SectionCard>
  );
}
