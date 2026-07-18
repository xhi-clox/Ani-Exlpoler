import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { updateProfile, getTopAnime, setTopAnime, getTopCharacters, setTopCharacters } from "../api/users";
import { searchAnime, searchCharacters } from "../api/anime";
import type { TopAnimeEntry, CharacterEntry } from "../types";

function useDebouncedCallback(callback: (q: string) => Promise<void>, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return useCallback((q: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => callback(q), delay);
  }, [callback, delay]);
}

function TopListEditor<T>({
  items,
  setItems,
  searchPlaceholder,
  emptyText,
  renderPreview,
  onSearch,
  onAdd,
  maxItems = 10,
}: {
  items: T[];
  setItems: (items: T[]) => void;
  searchPlaceholder: string;
  emptyText: string;
  renderPreview: (item: T) => { id: number | string; imageUrl?: string; title: string; subtitle?: string };
  onSearch: (q: string) => Promise<{ id: number | string; imageUrl?: string; title: string; subtitle?: string }[]>;
  onAdd: (item: T, result: { id: number | string; imageUrl?: string; title: string; subtitle?: string }) => T;
  maxItems?: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: number | string; imageUrl?: string; title: string; subtitle?: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [error, setError] = useState("");

  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    try {
      setResults(await onSearch(q));
    } catch { setResults([]); }
  }, 350);

  const handleSearch = (value: string) => {
    setQuery(value);
    debouncedSearch(value);
  };

  const addItem = async (r: { id: number | string; imageUrl?: string; title: string; subtitle?: string }) => {
    if (items.length >= maxItems) return;
    const exists = items.some((i) => renderPreview(i).id === r.id);
    if (exists) { setError("Already in your list"); return; }
    const newItem = onAdd({ ...r } as unknown as T, r);
    const updated = [...items, newItem];
    setItems(updated);
    setQuery("");
    setResults([]);
    setShowSearch(false);
    setError("");
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, rank: i + 1 } as T));
    setItems(updated);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const updated = [...items];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    const reordered = updated.map((item, i) => ({ ...item, rank: i + 1 } as T));
    setItems(reordered);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        {items.length < maxItems && (
          <button onClick={() => setShowSearch(!showSearch)} className="text-sm text-primary hover:underline">
            {showSearch ? "Cancel" : "Add"}
          </button>
        )}
        <span className="text-xs text-muted-foreground">{items.length}/{maxItems}</span>
      </div>

      {showSearch && (
        <div className="mb-4 p-3 border border-border rounded-xl bg-card">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full px-3 py-2 rounded-lg bg-secondary border-0 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
          {results.length > 0 && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {results.map((r) => (
                <button key={String(r.id)} onClick={() => addItem(r)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary text-left text-sm transition-colors">
                  {r.imageUrl && <div className="w-8 h-10 rounded overflow-hidden bg-secondary shrink-0"><img src={r.imageUrl} alt="" className="w-full h-full object-cover" /></div>}
                  <div className="min-w-0">
                    <p className="text-card-foreground truncate">{r.title}</p>
                    {r.subtitle && <p className="text-muted-foreground text-xs truncate">{r.subtitle}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive mb-2">{error}</p>}

      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground italic">{emptyText}</p>}
        {items.map((item, index) => {
          const preview = renderPreview(item);
          return (
            <div key={String(preview.id)} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-card">
              <div className="w-8 h-10 rounded overflow-hidden bg-secondary shrink-0">
                {preview.imageUrl ? <img src={preview.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">?</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-card-foreground truncate">
                  <span className="text-muted-foreground font-medium mr-2">#{index + 1}</span>
                  {preview.title}
                </p>
                {preview.subtitle && <p className="text-xs text-muted-foreground truncate">{preview.subtitle}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveItem(index, -1)} disabled={index === 0} className="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs" title="Move up">▲</button>
                <button onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="w-6 h-6 flex items-center justify-center rounded hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs" title="Move down">▼</button>
                <button onClick={() => removeItem(index)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors text-xs" title="Remove">✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [animeItems, setAnimeItems] = useState<TopAnimeEntry[]>([]);
  const [charItems, setCharItems] = useState<CharacterEntry[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [savingLists, setSavingLists] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setBio(user.bio || "");
      setPronouns(user.pronouns || "");
      setAvatarUrl(user.avatarUrl || "");
      Promise.all([
        getTopAnime(user.username),
        getTopCharacters(user.username),
      ]).then(([a, c]) => {
        setAnimeItems(a.results);
        setCharItems(c.results);
        setLoadingLists(false);
      }).catch(() => setLoadingLists(false));
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const data = await updateProfile(user.username, { username, bio, pronouns, avatar_url: avatarUrl });
      updateUser({ username: data.username, bio: data.bio, pronouns: data.pronouns, avatarUrl: data.avatar_url });
      setMessage("Saved!");
    } catch (err: any) {
      setError(err?.message || "Failed to save profile");
    }
    setSaving(false);
  };

  const handleSaveLists = async () => {
    if (!user) return;
    setSavingLists(true);
    setError("");
    try {
      await Promise.all([
        setTopAnime(user.username, animeItems.map((i) => ({ anime_id: i.animeId, title: i.title, image_url: i.imageUrl }))),
        setTopCharacters(user.username, charItems.map((i) => ({ character_id: i.characterId, name: i.name, image_url: i.imageUrl, anime_name: i.animeName }))),
      ]);
      setMessage("Lists saved!");
    } catch (err: any) {
      setError(err?.message || "Failed to save lists");
    }
    setSavingLists(false);
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Please log in to edit your settings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-8 rounded-[22px] border border-border/80 bg-card/80 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.2)] backdrop-blur-sm sm:p-6">
        <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          Profile Controls
        </p>
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.08em] text-foreground sm:text-3xl">Settings</h1>
      </div>
      <div className="space-y-6">
        <section className="rounded-[22px] border border-border/80 bg-card/85 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.18)] sm:p-6">
          <h2 className="mb-4 font-display text-lg font-semibold uppercase tracking-[0.08em] text-card-foreground">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30}
                className="w-full px-3 py-2 rounded-xl bg-secondary border-0 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Your username" />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3}
                className="w-full px-3 py-2 rounded-xl bg-secondary border-0 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Tell us about your taste..." />
              <p className="text-xs text-muted-foreground mt-1">{bio.length}/500</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Pronouns</label>
              <input type="text" value={pronouns} onChange={(e) => setPronouns(e.target.value)} maxLength={50}
                className="w-full px-3 py-2 rounded-xl bg-secondary border-0 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. she/her, he/him, they/them" />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Avatar URL</label>
              <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} maxLength={500}
                className="w-full px-3 py-2 rounded-xl bg-secondary border-0 text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="https://..." />
              {avatarUrl && (
                <div className="mt-2 w-16 h-16 rounded-full overflow-hidden border border-border bg-secondary">
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
            </div>
        </div>
        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {message === "Saved!" && <span className="text-sm text-primary">{message}</span>}
        </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-[22px] border border-border/80 bg-card/85 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.18)] sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold uppercase tracking-[0.08em] text-card-foreground">Top 10 Anime</h2>
            {loadingLists ? (
              <div className="space-y-3"><div className="h-16 bg-secondary rounded animate-pulse" /><div className="h-16 bg-secondary rounded animate-pulse" /></div>
            ) : (
              <TopListEditor
                items={animeItems}
                setItems={setAnimeItems}
                searchPlaceholder="Search anime..."
                emptyText="No anime in your top 10 yet."
                renderPreview={(item: TopAnimeEntry) => ({ id: item.animeId, imageUrl: item.imageUrl, title: item.title })}
                onSearch={async (q) => {
                  const data = await searchAnime(q);
                  return data.results.map((r) => ({ id: parseInt(r.id), imageUrl: r.image || undefined, title: r.title }));
                }}
                onAdd={(_item, result) => ({ animeId: Number(result.id), title: result.title, imageUrl: result.imageUrl || "", rank: animeItems.length + 1 } as TopAnimeEntry)}
              />
            )}
          </section>

          <section className="rounded-[22px] border border-border/80 bg-card/85 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.18)] sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold uppercase tracking-[0.08em] text-card-foreground">Top 10 Characters</h2>
            {loadingLists ? (
              <div className="space-y-3"><div className="h-16 bg-secondary rounded animate-pulse" /><div className="h-16 bg-secondary rounded animate-pulse" /></div>
            ) : (
              <TopListEditor
                items={charItems}
                setItems={setCharItems}
                searchPlaceholder="Search characters..."
                emptyText="No characters in your top 10 yet."
                renderPreview={(item: CharacterEntry) => ({ id: item.characterId, imageUrl: item.imageUrl, title: item.name, subtitle: item.animeName })}
                onSearch={async (q) => {
                  const data = await searchCharacters(q);
                  return data.results.map((r) => ({ id: r.characterId, imageUrl: r.imageUrl || undefined, title: r.name, subtitle: r.animeName || undefined }));
                }}
                onAdd={(_item, result) => ({ characterId: Number(result.id), name: result.title, imageUrl: result.imageUrl || "", animeName: result.subtitle || "", rank: charItems.length + 1 } as CharacterEntry)}
              />
            )}
          </section>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button onClick={handleSaveLists} disabled={savingLists}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {savingLists ? "Saving..." : "Save Lists"}
          </button>
          {message === "Lists saved!" && <span className="text-sm text-primary">{message}</span>}
        </div>
      </div>
    </div>
  );
}
