import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowUp, CheckCheck, ChevronDown, Eye, PenSquare, Plus, Settings2, Sparkles } from "lucide-react";
import { getProfile, followUser, removeProfileUpvote, unfollowUser, upvoteProfile } from "../api/users";
import { useAuth } from "../hooks/useAuth";
import { formatDate, pluralize, ANALYSIS_TYPE_LABELS } from "../utils/formatting";
import { AnalysisCard } from "../components/AnalysisCard";
import type { CharacterEntry, Collection, TopAnimeEntry, UserProfile as ProfileData } from "../types";

const PROFILE_DISPLAY_STYLE = { fontFamily: "Rajdhani, sans-serif" } as const;
const PROFILE_MONO_STYLE = { fontFamily: '"JetBrains Mono", monospace' } as const;
const RING_CIRCUMFERENCE = 232.5;
const FALLBACK_GRADIENTS = [
  "linear-gradient(160deg,#3a1f1f,#5b2a2a)",
  "linear-gradient(160deg,#1f2a3a,#2a3d5b)",
  "linear-gradient(160deg,#2a1f3a,#3d2a5b)",
  "linear-gradient(160deg,#3a2a1f,#5b3d2a)",
  "linear-gradient(160deg,#1f3a2e,#2a5b45)",
];

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

function getLevelProgress(score: number) {
  const levelSize = 25;
  const level = Math.max(1, Math.floor(score / levelSize) + 1);
  const progress = clamp(((score % levelSize) / levelSize) * 100, 0, 100);
  return {
    level,
    nextLevel: level + 1,
    progress,
  };
}

function getFallbackGradient(seed: string) {
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return FALLBACK_GRADIENTS[total % FALLBACK_GRADIENTS.length];
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="flex items-center gap-2 text-[15px] font-bold uppercase tracking-[0.04em] text-[#EEF1F7]"
      style={PROFILE_DISPLAY_STYLE}
    >
      <span className="inline-block h-3.5 w-[3px] bg-[#4CD3F0] [clip-path:polygon(0_0,100%_0,60%_100%,0_100%)]" />
      {children}
    </span>
  );
}

function PanelShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[10px] border border-[#232A38] bg-[#11151D]">
      <div
        className="pointer-events-none absolute left-0 top-0 h-7 w-7 opacity-50"
        style={{ background: "linear-gradient(135deg, #4CD3F0 0%, transparent 60%)" }}
      />
      <div className="relative flex items-center justify-between px-4 pb-2 pt-3.5">
        <PanelTitle>{title}</PanelTitle>
        {action}
      </div>
      {children}
    </section>
  );
}

function SideRankRow({
  rank,
  title,
  meta,
  imageUrl,
  fallbackKey,
  href,
}: {
  rank: number;
  title: string;
  meta: string;
  imageUrl?: string;
  fallbackKey: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-[#161B25]">
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[11px] font-semibold ${
          rank === 1
            ? "bg-[#E8B44C] text-[#3A2A00]"
            : rank === 2
              ? "bg-[#B9C2D4] text-[#1A1E26]"
              : rank === 3
                ? "bg-[#C98A55] text-[#2A1B0D]"
                : "bg-[#565F73] text-[#0A0D12]"
        }`}
        style={PROFILE_MONO_STYLE}
      >
        {rank}
      </span>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="h-[34px] w-[34px] shrink-0 rounded-md border border-[#232A38] object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-[#232A38] text-[11px] font-semibold text-[#EEF1F7]"
          style={{
            ...PROFILE_DISPLAY_STYLE,
            background: getFallbackGradient(fallbackKey),
          }}
        >
          {title.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-[#EEF1F7]">{title}</div>
        <div className="truncate text-[11px] text-[#8A93A8]">{meta}</div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}

function TopAnimePanel({ items, isOwn }: { items: TopAnimeEntry[]; isOwn: boolean }) {
  return (
    <PanelShell
      title="Top anime"
      action={
        isOwn ? (
          <Link href="/settings" className="text-[11px] font-medium text-[#8A93A8] transition-colors hover:text-[#4CD3F0]">
            Edit
          </Link>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-1 px-3 pb-4">
        {items.length === 0 ? (
          <p className="px-1 text-xs italic text-[#8A93A8]">No favorite anime added yet.</p>
        ) : (
          items.slice(0, 3).map((anime) => (
            <SideRankRow
              key={anime.rank}
              rank={anime.rank}
              title={anime.title}
              meta={`Ranked #${anime.rank}`}
              imageUrl={anime.imageUrl}
              fallbackKey={anime.title}
              href={`/anime/${anime.animeId}`}
            />
          ))
        )}
      </div>
    </PanelShell>
  );
}

function TopCharactersPanel({ items, isOwn }: { items: CharacterEntry[]; isOwn: boolean }) {
  return (
    <PanelShell
      title="Characters"
      action={
        isOwn ? (
          <Link href="/settings" className="text-[11px] font-medium text-[#8A93A8] transition-colors hover:text-[#4CD3F0]">
            Edit
          </Link>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-1 px-3 pb-4">
        {items.length === 0 ? (
          <p className="px-1 text-xs italic text-[#8A93A8]">No favorite characters added yet.</p>
        ) : (
          items.slice(0, 3).map((character) => (
            <SideRankRow
              key={character.rank}
              rank={character.rank}
              title={character.name}
              meta={character.animeName || "Favorite character"}
              imageUrl={character.imageUrl}
              fallbackKey={`${character.name}-${character.animeName}`}
            />
          ))
        )}
      </div>
    </PanelShell>
  );
}

function CollectionsSection({ collections, isOwn }: { collections: Collection[]; isOwn: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(collections[0]?.id ?? null);

  useEffect(() => {
    setExpanded(collections[0]?.id ?? null);
  }, [collections]);

  if (collections.length === 0 && !isOwn) return null;

  return (
    <PanelShell
      title="Collections"
      action={
        isOwn ? (
          <Link href="/settings" className="text-[11px] font-medium text-[#8A93A8] transition-colors hover:text-[#4CD3F0]">
            Manage
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-2 px-3 pb-4">
        {collections.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#313A4C] bg-[#161B25] px-4 py-5 text-center text-sm text-[#8A93A8]">
            Collections will show up here once this profile starts curating lists.
          </div>
        ) : (
          collections.map((collection) => {
            const isExpanded = expanded === collection.id;
            return (
              <div key={collection.id} className="overflow-hidden rounded-md border border-[#232A38] bg-[#161B25]">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : collection.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#EEF1F7]">{collection.title}</p>
                    {collection.description ? (
                      <p className="mt-1 truncate text-xs text-[#8A93A8]">{collection.description}</p>
                    ) : (
                      <p className="mt-1 text-xs text-[#565F73]">{formatDate(collection.createdAt)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#8A93A8]">
                    <span>{pluralize(collection.itemCount, "item")}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {isExpanded && collection.items && collection.items.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-3 lg:grid-cols-5">
                    {collection.items.map((item) => (
                      <Link key={item.id} href={`/anime/${item.animeId}`} className="group block">
                        <div className="aspect-[2/3] overflow-hidden rounded-md border border-[#232A38] bg-[#1B212D]">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] font-semibold text-[#EEF1F7]"
                              style={{
                                ...PROFILE_DISPLAY_STYLE,
                                background: getFallbackGradient(item.title),
                              }}
                            >
                              {item.title}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </PanelShell>
  );
}

export default function UserProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    getProfile(username)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username]);

  const handleFollow = async () => {
    if (!profile || !user) return;

    try {
      if (profile.isFollowing) {
        await unfollowUser(profile.username);
        setProfile({
          ...profile,
          isFollowing: false,
          followerCount: Math.max(0, profile.followerCount - 1),
        });
      } else {
        await followUser(profile.username);
        setProfile({
          ...profile,
          isFollowing: true,
          followerCount: profile.followerCount + 1,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpvoteTaste = async () => {
    if (!profile || !user) return;

    try {
      if (profile.userUpvotedProfile) {
        const res = await removeProfileUpvote(profile.username);
        setProfile({
          ...profile,
          userUpvotedProfile: false,
          profileUpvoteCount: res.profileUpvoteCount,
        });
      } else {
        const res = await upvoteProfile(profile.username);
        setProfile({
          ...profile,
          userUpvotedProfile: true,
          profileUpvoteCount: res.profileUpvoteCount,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const stats = useMemo(
    () =>
      profile
        ? [
            { label: "Analyses", value: profile.totalAnalyses },
            { label: "Upvotes", value: profile.totalUpvotesReceived + profile.profileUpvoteCount },
            { label: "Followers", value: profile.followerCount },
            { label: "Views", value: profile.profileViewCount },
          ]
        : [],
    [profile]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_minmax(0,1fr)_230px]">
          <div className="h-72 animate-pulse rounded-[10px] border border-[#232A38] bg-[#11151D]" />
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-[10px] border border-[#232A38] bg-[#11151D]" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-[10px] border border-[#232A38] bg-[#11151D]" />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-[10px] border border-[#232A38] bg-[#11151D]" />
          </div>
          <div className="h-72 animate-pulse rounded-[10px] border border-[#232A38] bg-[#11151D]" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="py-20 text-center text-[#8A93A8]">User not found.</div>;
  }

  const isOwn = user?.username === profile.username;
  const tierLabel = getTier(profile.reputationScore);
  const { level, nextLevel, progress } = getLevelProgress(profile.reputationScore);
  const ringOffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * progress) / 100;

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 md:px-6 md:py-8">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_minmax(0,1fr)_230px]">
        {/* Left column - only visible on lg screens and above */}
        <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <TopCharactersPanel items={profile.topCharacters} isOwn={isOwn} />
        </div>

        {/* Main column */}
        <div className="space-y-4">
          {/* Profile Hero */}
          <section className="relative overflow-hidden rounded-[10px] border border-[#232A38] bg-[#11151D] px-5 py-6 sm:px-6">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(120deg, rgba(76,211,240,.10), rgba(91,110,245,.10) 55%, transparent 80%), #11151D",
              }}
            />
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-[180px] w-[180px] opacity-[0.08]"
              style={{
                border: "1px solid #4CD3F0",
                transform: "rotate(20deg)",
                clipPath: "polygon(30% 0,100% 0,100% 70%,70% 100%,0 100%,0 30%)",
              }}
            />
            <div className="relative z-10 flex flex-wrap items-center gap-5">
              <div className="relative h-[82px] w-[82px] shrink-0">
                <svg width="82" height="82" viewBox="0 0 82 82" className="absolute left-0 top-0 -rotate-90">
                  <circle cx="41" cy="41" r="37" fill="none" stroke="#232A38" strokeWidth="4" />
                  <circle
                    cx="41"
                    cy="41"
                    r="37"
                    fill="none"
                    stroke="#4CD3F0"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div
                  className="absolute inset-2 flex items-center justify-center overflow-hidden rounded-full text-[26px] font-bold text-[#EEF1F7]"
                  style={{
                    ...PROFILE_DISPLAY_STYLE,
                    background: profile.avatarUrl ? undefined : "linear-gradient(160deg, #5B6EF5, #2A7A8C)",
                  }}
                >
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.username} className="h-full w-full object-cover" />
                  ) : (
                    profile.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-[5px] border border-[#4CD3F0] bg-[#0A0D12] px-1.5 py-[2px] text-[10px] font-semibold tracking-[0.03em] text-[#4CD3F0]"
                  style={PROFILE_MONO_STYLE}
                >
                  LV {level}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-[26px] font-bold leading-[1.15] text-[#EEF1F7]" style={PROFILE_DISPLAY_STYLE}>
                  {profile.username}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#313A4C] bg-[#1B212D] px-2.5 py-1 text-xs font-medium text-[#8A93A8]">
                    <span className="h-[5px] w-[5px] rounded-full bg-[#4CD3F0]" />
                    {tierLabel}
                  </span>
                  <span className="text-[11px] text-[#565F73]">
                    {Math.round(progress)}% to rank {nextLevel}
                  </span>
                  {profile.pronouns ? <span className="text-[11px] text-[#8A93A8]">{profile.pronouns}</span> : null}
                </div>
                {profile.bio ? (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8A93A8]">{profile.bio}</p>
                ) : null}
              </div>

              <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">
                {isOwn ? (
                  <>
                    <Link
                      href="/settings"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#313A4C] px-4 py-2 text-sm font-semibold text-[#EEF1F7] transition-colors hover:border-[#4CD3F0] hover:bg-[#161B25] sm:w-auto"
                    >
                      <PenSquare className="h-4 w-4" />
                      Edit Profile
                    </Link>
                    <Link
                      href="/write"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#4CD3F0] bg-[#4CD3F0] px-4 py-2 text-sm font-semibold text-[#04222B] transition-colors hover:bg-[#6BDDF8] sm:w-auto"
                    >
                      <Sparkles className="h-4 w-4" />
                      New Analysis
                    </Link>
                  </>
                ) : user ? (
                  <>
                    <button
                      type="button"
                      onClick={handleFollow}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-4 py-2 text-sm font-semibold transition-colors sm:w-auto ${
                        profile.isFollowing
                          ? "border-[#4CD3F0] bg-[rgba(76,211,240,0.12)] text-[#4CD3F0] hover:bg-[rgba(76,211,240,0.18)]"
                          : "border-[#313A4C] text-[#EEF1F7] hover:border-[#4CD3F0] hover:bg-[#161B25]"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      {profile.isFollowing ? "Following" : "Follow"}
                    </button>
                    <button
                      type="button"
                      onClick={handleUpvoteTaste}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-4 py-2 text-sm font-semibold transition-colors sm:w-auto ${
                        profile.userUpvotedProfile
                          ? "border-[#4CD3F0] bg-[rgba(76,211,240,0.12)] text-[#4CD3F0] hover:bg-[rgba(76,211,240,0.18)]"
                          : "border-[#313A4C] text-[#EEF1F7] hover:border-[#4CD3F0] hover:bg-[#161B25]"
                      }`}
                    >
                      <ArrowUp className="h-4 w-4" />
                      Upvote
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#313A4C] px-4 py-2 text-sm font-semibold text-[#EEF1F7] transition-colors hover:border-[#4CD3F0] hover:bg-[#161B25] sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      Follow
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#4CD3F0] bg-[#4CD3F0] px-4 py-2 text-sm font-semibold text-[#04222B] transition-colors hover:bg-[#6BDDF8] sm:w-auto"
                    >
                      <ArrowUp className="h-4 w-4" />
                      Upvote
                    </Link>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Stats + Profile Pulse Combined Panel */}
          <section className="overflow-hidden rounded-[10px] border border-[#232A38] bg-[#11151D]">
            {/* Stats Row - 4 columns on all screens */}
            <div className="grid grid-cols-4 border-b border-[#232A38]">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`px-3 py-3 text-center ${index < stats.length - 1 ? "border-r border-[#232A38]" : ""}`}
                >
                  <div className={`text-[18px] font-semibold ${stat.value > 0 ? "text-[#4CD3F0]" : "text-[#EEF1F7]"}`} style={PROFILE_MONO_STYLE}>
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.06em] text-[#8A93A8]">{stat.label}</div>
                </div>
              ))}
            </div>
            {/* Profile Pulse */}
            <div className="px-4 py-3 text-sm text-[#8A93A8]">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-[11px] text-[#565F73]">Joined</div>
                  <div className="text-[#EEF1F7] text-[12px]">{formatDate(profile.createdAt)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] text-[#565F73]">Following</div>
                  <div className="text-[#EEF1F7] text-[12px]" style={PROFILE_MONO_STYLE}>{profile.followingCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-[11px] text-[#565F73]">Taste Upvotes</div>
                  <div className="text-[#EEF1F7] text-[12px]" style={PROFILE_MONO_STYLE}>{profile.profileUpvoteCount}</div>
                </div>
              </div>
              {isOwn ? (
                <div className="mt-3 text-center">
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#313A4C] px-3 py-1.5 text-[12px] font-semibold text-[#EEF1F7] transition-colors hover:border-[#4CD3F0] hover:bg-[#161B25]"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Manage profile
                  </Link>
                </div>
              ) : null}
            </div>
          </section>

          {/* Top Characters Panel - Mobile only */}
          <div className="lg:hidden">
            <TopCharactersPanel items={profile.topCharacters} isOwn={isOwn} />
          </div>

          {/* Top Anime Panel - Mobile only */}
          <div className="lg:hidden">
            <TopAnimePanel items={profile.topAnime} isOwn={isOwn} />
          </div>

          {/* Collections Section */}
          <CollectionsSection collections={profile.collections} isOwn={isOwn} />

          {/* Recent Activity - Moved to bottom */}
          <PanelShell title="Recent activity">
            <div className="px-3 pb-4 pt-1 space-y-3">
              {profile.recentAnalyses.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-7 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#313A4C] text-[#4CD3F0] [transform:rotate(45deg)]">
                    <CheckCheck className="h-[18px] w-[18px] -rotate-45" />
                  </div>
                  <p className="text-sm font-medium text-[#EEF1F7]">No analyses yet</p>
                  <p className="mt-1 max-w-[280px] text-[13px] leading-6 text-[#8A93A8]">
                    Break down an anime or character and it&apos;ll show up here for others to explore.
                  </p>
                  {isOwn ? (
                    <Link
                      href="/write"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[rgba(76,211,240,0.3)] bg-[rgba(76,211,240,0.1)] px-4 py-2 text-[13px] font-semibold text-[#4CD3F0] transition-colors hover:bg-[rgba(76,211,240,0.18)]"
                    >
                      <Plus className="h-4 w-4" />
                      Start your first analysis
                    </Link>
                  ) : null}
                </div>
              ) : (
                profile.recentAnalyses.map((analysis) => (
                  <AnalysisCard key={analysis.id} analysis={analysis} showAuthorActions={false} />
                ))
              )}
            </div>
          </PanelShell>
        </div>

        {/* Right column - only visible on lg screens and above */}
        <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <TopAnimePanel items={profile.topAnime} isOwn={isOwn} />
        </div>
      </div>
    </div>
  );
}
