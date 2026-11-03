"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  AudioLines,
  BookHeart,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Heart,
  Languages,
  Library,
  ListMusic,
  LogOut,
  MessageCircleMore,
  MoreHorizontal,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { ApiStatus, ChatMessage, Locale, Playlist, SavedMood, ThemeConfig, Track, Vibe } from "@/lib/contracts";
import { demoControls, demoTracks, demoVibe, makeDemoPlaylist } from "@/lib/demo-data";
import { translate } from "@/lib/i18n/translations";

type View = "create" | "library" | "appearance" | "settings";
type LibraryTab = "playlists" | "moods";

const presets: ThemeConfig[] = [
  { name: "Midnight bloom", mode: "dark", background: "#07120f", surface: "#15251f", text: "#f3f7f3", accent: "#f2b56b", gradientFrom: "#123d32", gradientTo: "#111827", blur: 24, opacity: 0.74, radius: 24, shadow: 0.44, borderOpacity: 0.18, gradientAngle: 138, motion: true },
  { name: "Dawn mist", mode: "light", background: "#eef4ed", surface: "#ffffff", text: "#18342c", accent: "#d97642", gradientFrom: "#f9dec9", gradientTo: "#cde9df", blur: 22, opacity: 0.7, radius: 24, shadow: 0.18, borderOpacity: 0.48, gradientAngle: 145, motion: true },
  { name: "Carbon", mode: "dark", background: "#080a0b", surface: "#17191a", text: "#f5f5f3", accent: "#d9e0da", gradientFrom: "#232729", gradientTo: "#050606", blur: 18, opacity: 0.82, radius: 20, shadow: 0.5, borderOpacity: 0.13, gradientAngle: 150, motion: false },
  { name: "Porcelain", mode: "light", background: "#f0f0ec", surface: "#ffffff", text: "#222421", accent: "#456b5d", gradientFrom: "#ffffff", gradientTo: "#dfe3df", blur: 16, opacity: 0.83, radius: 20, shadow: 0.15, borderOpacity: 0.5, gradientAngle: 135, motion: false },
];

const welcomePrompts = [
  "I feel a little drained, but I want something hopeful.",
  "I need warm music for a quiet evening walk.",
  "Give me focused energy without anything too intense.",
];

interface StoredDemo {
  locale: Locale;
  messages: ChatMessage[];
  playlist: Playlist | null;
  history: Playlist[];
  moods: SavedMood[];
  theme: ThemeConfig;
}

const initialMessage: ChatMessage = {
  id: "hello",
  role: "assistant",
  content: "Tell me how you feel, what you are doing, or an artist you want nearby. I’ll listen for the shape of the moment.",
};

async function apiJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || "This request could not be completed.");
  return body;
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function themeStyle(theme: ThemeConfig): CSSProperties & Record<`--${string}`, string> {
  return {
    "--app-bg": theme.background,
    "--gradient-from": theme.gradientFrom,
    "--gradient-to": theme.gradientTo,
    "--glass": theme.surface,
    "--ink": theme.text,
    "--accent": theme.accent,
    "--glass-opacity": String(theme.opacity),
    "--glass-blur": `${theme.blur}px`,
    "--radius": `${theme.radius}px`,
    "--shadow-strength": String(theme.shadow),
    "--border-opacity": String(theme.borderOpacity),
    "--gradient-angle": `${theme.gradientAngle}deg`,
    colorScheme: theme.mode,
  };
}

function LanguagePicker({ locale, onChange, label }: { locale: Locale; onChange: (locale: Locale) => void; label?: string }) {
  return (
    <label className="language-picker">
      <Languages size={16} aria-hidden="true" />
      {label ? <span>{label}</span> : <span className="sr-only">Language</span>}
      <select value={locale} onChange={(event) => onChange(event.target.value as Locale)} aria-label="Interface language">
        <option value="en">EN</option><option value="uk">UK</option><option value="ru">RU</option><option value="pl">PL</option>
      </select>
    </label>
  );
}

function YouTubePlayer({ track, onPrevious, onNext, t }: { track: Track; onPrevious: () => void; onNext: () => void; t: (key: string) => string }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  function command(func: "playVideo" | "pauseVideo") {
    iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "https://www.youtube.com");
    setPlaying(func === "playVideo");
  }

  return (
    <section className="player-card glass" aria-label={t("Now playing")}>
      <div className="player-heading">
        <div><span className="eyebrow">{t("Now playing")}</span><h2>{track.title}</h2><p>{track.artist}</p></div>
        <AudioLines className={playing ? "playing-mark" : ""} aria-hidden="true" />
      </div>
      <div className="video-frame">
        <iframe ref={iframe} key={track.videoId} src={`https://www.youtube.com/embed/${track.videoId}?enablejsapi=1&playsinline=1&origin=${encodeURIComponent(origin)}`} title={`${track.title} — ${track.artist}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
      <div className="player-controls">
        <button className="icon-button" onClick={() => { setPlaying(false); onPrevious(); }} aria-label={t("Previous")}><ArrowLeft /></button>
        <button className="play-button" onClick={() => command(playing ? "pauseVideo" : "playVideo")} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button>
        <button className="icon-button" onClick={() => { setPlaying(false); onNext(); }} aria-label={t("Next")}><ArrowRight /></button>
      </div>
      <p className="player-note">YouTube playback · native controls and availability apply</p>
    </section>
  );
}

export function MusicApp() {
  const [demo, setDemo] = useState(false);
  const [view, setView] = useState<View>("create");
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("playlists");
  const [locale, setLocale] = useState<Locale>("en");
  const [mode, setMode] = useState<"guided" | "free">("guided");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [vibe, setVibe] = useState(structuredClone(demoVibe));
  const [controls, setControls] = useState(structuredClone(demoControls));
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [history, setHistory] = useState<Playlist[]>([]);
  const [moods, setMoods] = useState<SavedMood[]>([]);
  const [moodName, setMoodName] = useState("Soft evening reset");
  const [currentTrack, setCurrentTrack] = useState(0);
  const [theme, setTheme] = useState<ThemeConfig>(presets[0]);
  const [editingTheme, setEditingTheme] = useState<ThemeConfig>(presets[0]);
  const [notice, setNotice] = useState("");
  const [thinking, setThinking] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const t = (key: string) => translate(locale, key);
  const isLive = Boolean(apiStatus?.user);

  useEffect(() => {
    void fetch("/api/status", { cache: "no-store" }).then(apiJson<ApiStatus>).then((status) => {
      setApiStatus(status);
      if (status.user) {
        setDemo(true);
        // Never show a previous guest's local library as signed-in account data.
        setMessages([initialMessage]); setPlaylist(null); setHistory([]); setMoods([]); setConversationId(null);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem("dsh-music:demo:v1");
        if (raw) {
          const stored = JSON.parse(raw) as StoredDemo;
          setLocale(stored.locale || "en"); setMessages(stored.messages?.length ? stored.messages : [initialMessage]);
          setPlaylist(stored.playlist || null); setHistory(stored.history || []); setMoods(stored.moods || []);
          setTheme(stored.theme || presets[0]); setEditingTheme(stored.theme || presets[0]);
        }
      } catch { localStorage.removeItem("dsh-music:demo:v1"); }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated || isLive) return;
    const stored: StoredDemo = { locale, messages, playlist, history, moods, theme };
    localStorage.setItem("dsh-music:demo:v1", JSON.stringify(stored));
  }, [hydrated, isLive, locale, messages, playlist, history, moods, theme]);

  useEffect(() => {
    if (!isLive) return;
    void Promise.all([
      fetch("/api/playlists", { cache: "no-store" }).then(apiJson<{ playlists: Playlist[] }>),
      fetch("/api/moods", { cache: "no-store" }).then(apiJson<{ moods: SavedMood[] }>),
      fetch("/api/theme", { cache: "no-store" }).then(apiJson<{ theme: ThemeConfig | null }>),
    ]).then(([playlists, savedMoods, savedTheme]) => {
      setHistory(playlists.playlists); setMoods(savedMoods.moods);
      if (savedTheme.theme) { setTheme(savedTheme.theme); setEditingTheme(savedTheme.theme); }
    }).catch((error) => setNotice(error instanceof Error ? error.message : "Your private library could not be loaded."));
  }, [isLive]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeTrack = playlist?.tracks[currentTrack] || demoTracks[0];
  const contrastWarning = editingTheme.mode === "dark" && editingTheme.text.toLowerCase() === editingTheme.background.toLowerCase();

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = draftMessage.trim();
    if (!text) return;
    setDraftMessage("");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: text }]);
    setThinking(true);
    if (isLive) {
      try {
        const result = await apiJson<{ conversationId: string; reply: string; vibe: Vibe }>(await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conversationId || undefined, message: text, mode, locale, consent: true }) }));
        setConversationId(result.conversationId);
        setVibe(result.vibe);
        setControls((current) => ({ ...current, energy: result.vibe.energy, includeArtists: result.vibe.artists, includeGenres: result.vibe.genres }));
        setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: result.reply }]);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "The AI conversation is unavailable.");
      } finally { setThinking(false); }
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    const reply = mode === "guided"
      ? "I hear a calm evening with enough lift to keep you moving. I’ll keep the centre warm, favour the artists you mention, and leave a little space for discovery. Does this feel right?"
      : "That gives me a clear shape: warm, reflective, and gently energising. I’ve translated it into an editable vibe below.";
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: reply }]);
    setVibe((current) => ({ ...current, description: text.length > 18 ? `Music for this moment: ${text.slice(0, 118)}` : current.description }));
    setThinking(false);
  }

  async function generatePlaylist(fromMood?: SavedMood) {
    if (isLive) {
      setThinking(true);
      try {
        const selectedVibe = fromMood?.vibe || vibe;
        const selectedControls = fromMood?.controls || controls;
        const result = await apiJson<{ playlist: Playlist }>(await fetch("/api/playlists/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vibe: selectedVibe, controls: selectedControls, conversationId: conversationId || undefined }) }));
        setPlaylist(result.playlist); setCurrentTrack(0); setView("create"); setNotice("Your verified YouTube draft is ready.");
      } catch (error) { setNotice(error instanceof Error ? error.message : "Playlist generation is unavailable."); }
      finally { setThinking(false); }
      return;
    }
    const next = makeDemoPlaylist();
    if (fromMood) {
      next.title = fromMood.vibe.name;
      next.description = fromMood.vibe.description;
      next.vibe = structuredClone(fromMood.vibe);
      next.controls = structuredClone(fromMood.controls);
      const offset = history.length % 8;
      next.tracks = [...demoTracks.slice(offset), ...demoTracks.slice(0, offset)];
      setVibe(structuredClone(fromMood.vibe)); setControls(structuredClone(fromMood.controls));
    } else {
      next.title = vibe.name; next.description = vibe.description;
      next.vibe = structuredClone(vibe); next.controls = structuredClone(controls);
    }
    setPlaylist(next); setCurrentTrack(0); setView("create");
    setNotice("Your 30-track demo draft is ready to shape.");
  }

  function updateTrack(index: number, update: Partial<Track>) {
    setPlaylist((current) => current ? { ...current, version: current.version + 1, tracks: current.tracks.map((track, trackIndex) => trackIndex === index ? { ...track, ...update } : track), updatedAt: new Date().toISOString() } : current);
  }

  function moveTrack(index: number, direction: -1 | 1) {
    setPlaylist((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.tracks.length) return current;
      const tracks = [...current.tracks];
      [tracks[index], tracks[target]] = [tracks[target], tracks[index]];
      return { ...current, tracks, version: current.version + 1, updatedAt: new Date().toISOString() };
    });
    setCurrentTrack((current) => current === index ? current + direction : current === index + direction ? index : current);
  }

  function removeTrack(index: number) {
    setPlaylist((current) => current ? { ...current, tracks: current.tracks.filter((_, trackIndex) => trackIndex !== index), version: current.version + 1, updatedAt: new Date().toISOString() } : current);
    setCurrentTrack((current) => Math.max(0, Math.min(current, (playlist?.tracks.length || 1) - 2)));
  }

  async function replaceTrack(index: number) {
    if (isLive && playlist) {
      try {
        const current = playlist.tracks[index];
        const result = await apiJson<{ tracks: Track[] }>(await fetch("/api/tracks/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: `${current.artist} ${current.title}`, region: controls.region }) }));
        const replacement = result.tracks.find((track) => track.videoId !== current.videoId && !playlist.tracks.some((item) => item.videoId === track.videoId));
        if (!replacement) { setNotice("No different playable match was found. Try adding a song by name."); return; }
        updateTrack(index, { ...replacement, id: `${replacement.id}-replacement-${Date.now()}`, reason: "A playable alternative selected for this part of your vibe." });
      } catch (error) { setNotice(error instanceof Error ? error.message : "A replacement could not be found."); }
      return;
    }
    const used = new Set(playlist?.tracks.map((track) => track.videoId));
    const replacement = demoTracks.find((track) => !used.has(track.videoId)) || demoTracks[(index + 7) % demoTracks.length];
    updateTrack(index, { ...replacement, id: `${replacement.id}-replacement-${Date.now()}`, reason: "A fresh alternative for the same part of your vibe." });
    setNotice("Track replaced. Your other edits are untouched.");
  }

  async function addTrack() {
    const query = manualQuery.trim();
    if (!query || !playlist) return;
    if (playlist.tracks.length >= 30) { setNotice("This playlist is set to 30 tracks. Remove one before adding another."); return; }
    if (isLive) {
      try {
        const result = await apiJson<{ tracks: Track[] }>(await fetch("/api/tracks/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, region: controls.region }) }));
        const source = result.tracks.find((track) => !playlist.tracks.some((item) => item.videoId === track.videoId));
        if (!source) { setNotice("No new playable YouTube match was found."); return; }
        setPlaylist({ ...playlist, tracks: [...playlist.tracks, { ...source, id: `${source.id}-manual-${Date.now()}`, reason: "Added by you." }], version: playlist.version + 1, updatedAt: new Date().toISOString() });
        setManualQuery(""); setNotice(`${source.title} added to the draft.`);
      } catch (error) { setNotice(error instanceof Error ? error.message : "The YouTube search is unavailable."); }
      return;
    }
    const source = demoTracks.find((track) => `${track.title} ${track.artist}`.toLowerCase().includes(query.toLowerCase())) || demoTracks.find((track) => !playlist.tracks.some((item) => item.videoId === track.videoId));
    if (!source) { setNotice("No unused demo match found."); return; }
    setPlaylist({ ...playlist, tracks: [...playlist.tracks, { ...source, id: `${source.id}-manual-${Date.now()}`, reason: "Added by you." }], version: playlist.version + 1, updatedAt: new Date().toISOString() });
    setManualQuery(""); setNotice(`${source.title} added to the draft.`);
  }

  async function saveDemoPlaylist() {
    if (!playlist) return;
    if (isLive) {
      try {
        const persisted = await apiJson<{ playlist: Playlist }>(await fetch(`/api/playlists/${playlist.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: playlist.version, title: playlist.title, description: playlist.description, tracks: playlist.tracks }) }));
        const result = await apiJson<{ playlist: Playlist }>(await fetch(`/api/playlists/${persisted.playlist.id}/save`, { method: "POST" }));
        setPlaylist(result.playlist); setHistory((current) => [result.playlist, ...current.filter((item) => item.id !== result.playlist.id)]); setNotice("Your private YouTube playlist is saved.");
      } catch (error) { setNotice(error instanceof Error ? error.message : "YouTube could not save this playlist."); }
      return;
    }
    const saved = { ...playlist, status: "saved" as const, updatedAt: new Date().toISOString() };
    setPlaylist(saved);
    setHistory((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    setNotice("Saved to demo history. No YouTube playlist was created.");
  }

  async function saveMood() {
    if (!moodName.trim()) return;
    const mood: SavedMood = { id: crypto.randomUUID(), name: moodName.trim(), vibe: structuredClone(vibe), controls: structuredClone(controls), createdAt: new Date().toISOString() };
    if (isLive) {
      try {
        const result = await apiJson<{ mood: SavedMood }>(await fetch("/api/moods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: moodName.trim(), vibe, controls }) }));
        setMoods((current) => [result.mood, ...current]); setNotice("Mood saved to your private library.");
      } catch (error) { setNotice(error instanceof Error ? error.message : "The mood could not be saved."); }
      return;
    }
    setMoods((current) => [mood, ...current]); setNotice("Mood saved for one-click regeneration.");
  }

  async function deleteMood(id: string) {
    if (isLive) {
      try {
        await apiJson(await fetch(`/api/moods/${id}`, { method: "DELETE" }));
        setMoods((current) => current.filter((item) => item.id !== id));
      } catch (error) { setNotice(error instanceof Error ? error.message : "The mood could not be deleted."); }
      return;
    }
    setMoods((current) => current.filter((item) => item.id !== id));
  }

  async function submitFeedback(trackId: string, value: number) {
    if (!playlist) return;
    const nextValue = trackId
      ? (playlist.tracks.find((track) => track.id === trackId)?.feedback === value ? 0 : value)
      : (playlist.feedback === value ? 0 : value);
    if (isLive) {
      try {
        const result = await apiJson<{ playlist: Playlist }>(await fetch(`/api/playlists/${playlist.id}/feedback`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackId, value: nextValue }) }));
        setPlaylist(result.playlist);
      } catch (error) { setNotice(error instanceof Error ? error.message : "Feedback could not be saved."); }
      return;
    }
    if (trackId) updateTrack(playlist.tracks.findIndex((track) => track.id === trackId), { feedback: nextValue });
    else setPlaylist({ ...playlist, feedback: nextValue });
  }

  function resetDemo() {
    if (!window.confirm("Reset all demo conversations, playlists, moods, feedback, and theme changes?")) return;
    localStorage.removeItem("dsh-music:demo:v1");
    setMessages([initialMessage]); setPlaylist(null); setHistory([]); setMoods([]); setVibe(structuredClone(demoVibe)); setControls(structuredClone(demoControls)); setTheme(presets[0]); setEditingTheme(presets[0]); setView("create"); setNotice("Demo data reset.");
  }

  async function disconnectGoogle() {
    try {
      await apiJson(await fetch("/api/privacy/disconnect", { method: "POST" }));
      setApiStatus(null); setDemo(false); setPlaylist(null); setHistory([]); setMoods([]); setNotice("Google/YouTube access was disconnected.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Google access could not be disconnected."); }
  }

  async function deleteLiveAccount() {
    if (!window.confirm("Permanently delete your DSH-Music account, conversations, moods, themes, and local playlist history? Playlists already created on YouTube will remain.")) return;
    try {
      await apiJson(await fetch("/api/privacy/account", { method: "DELETE" }));
      setApiStatus(null); setDemo(false); setPlaylist(null); setHistory([]); setMoods([]); setNotice("Your DSH-Music account was deleted.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "The account could not be deleted."); }
  }

  async function applyTheme() {
    setTheme(editingTheme);
    if (!isLive) { setNotice("Theme applied and saved in this browser."); return; }
    try { await apiJson(await fetch("/api/theme", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingTheme) })); setNotice("Theme saved to your private account."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "The theme could not be saved."); }
  }

  const nav = [
    { id: "create" as const, label: t("Create"), icon: MessageCircleMore },
    { id: "library" as const, label: t("Library"), icon: Library },
    { id: "appearance" as const, label: t("Appearance"), icon: Palette },
    { id: "settings" as const, label: t("Settings"), icon: Settings },
  ];

  if (!demo) {
    return (
      <main className="welcome-page" style={themeStyle(theme)}>
        <div className="ambient ambient-one" /><div className="ambient ambient-two" />
        <header className="welcome-nav"><div className="brand"><span className="brand-mark"><AudioLines /></span><span>DSH<span>—</span>Music</span></div><LanguagePicker locale={locale} onChange={setLocale} /></header>
        <section className="hero">
          <div className="hero-copy"><span className="eyebrow"><Sparkles size={14} /> MUSIC THAT LISTENS FIRST</span><h1>{t("A soundtrack for your state of mind.")}</h1><p>{t("A short conversation. A feeling understood. Music that meets you where you are.")}</p><div className="hero-actions"><button className="primary large" onClick={() => setDemo(true)}>{t("Try the demo")}<ArrowRight /></button><Link className="secondary large" href="/api/auth/signin/google">{t("Continue with Google")}</Link></div><small>Guest mode is private to this browser · no paid API calls</small></div>
          <div className="hero-art glass"><div className="orb"><div className="orb-core"><AudioLines /></div></div><div className="floating-note note-one"><span>01</span><div><strong>Reflective</strong><small>Warm · unhurried</small></div></div><div className="floating-note note-two"><Play fill="currentColor" /><div><strong>Soft momentum</strong><small>30 songs waiting</small></div></div></div>
        </section>
      </main>
    );
  }

  return (
    <div className={`app-shell ${theme.motion ? "theme-motion" : ""}`} style={themeStyle(theme)}>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <aside className="sidebar glass">
        <div className="brand compact"><span className="brand-mark"><AudioLines /></span><span>DSH<span>—</span>Music</span></div>
        <nav aria-label="Primary navigation">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon /><span>{label}</span></button>)}</nav>
        <div className="sidebar-foot"><div className="demo-pill"><Sparkles /> <span>{isLive ? "Private account" : t("Demo mode")}</span></div><button onClick={() => isLive ? void signOut({ callbackUrl: "/" }) : setDemo(false)}><LogOut /><span>{isLive ? "Sign out" : "Leave demo"}</span></button></div>
      </aside>
      <div className="workspace">
        <header className="topbar"><div><span className="mobile-brand">DSH—Music</span><span className="breadcrumb">{nav.find((item) => item.id === view)?.label}</span></div><div className="top-actions"><div className="demo-pill"><Sparkles />{isLive ? "Private account" : t("Demo mode")}</div><LanguagePicker locale={locale} onChange={setLocale} /><button className="avatar" aria-label={isLive ? "Profile" : "Demo profile"}>{isLive ? (apiStatus?.user?.name?.[0] || "M") : "D"}</button></div></header>
        <main className="content">
          {view === "create" && !playlist && <section className="create-grid">
            <div className="chat-panel glass">
              <div className="section-heading"><div><span className="eyebrow">VIBE SESSION · 01</span><h1>{t("What does today sound like?")}</h1><p>{t("Tell me what you need from music right now.")}</p></div><div className="segmented"><button className={mode === "guided" ? "selected" : ""} onClick={() => setMode("guided")}>{t("Guided")}</button><button className={mode === "free" ? "selected" : ""} onClick={() => setMode("free")}>{t("Free-form")}</button></div></div>
              <div className="prompt-chips">{welcomePrompts.map((prompt) => <button key={prompt} onClick={() => setDraftMessage(prompt)}>{prompt}<ChevronRight /></button>)}</div>
              <div className="chat-log" aria-live="polite">{messages.map((message) => <div key={message.id} className={`message ${message.role}`}><span>{message.role === "assistant" ? <Sparkles /> : <CircleUserRound />}</span><p>{message.content}</p></div>)}{thinking && <div className="message assistant"><span><Sparkles /></span><p className="typing"><i/><i/><i/></p></div>}</div>
              <form className="composer" onSubmit={sendMessage}><textarea value={draftMessage} onChange={(event) => setDraftMessage(event.target.value)} placeholder="I feel… / I’m doing… / I want something like…" aria-label="Message to your music companion" rows={2} /><button className="primary" type="submit" disabled={!draftMessage.trim() || thinking}>{t("Send")}<ArrowUp /></button></form>
            </div>
            <aside className="vibe-panel glass">
              <div className="section-heading"><div><span className="eyebrow">{t("Your vibe")}</span><h2>Shape the feeling</h2></div><SlidersHorizontal /></div>
              <label className="field"><span>Vibe name</span><input value={vibe.name} onChange={(event) => setVibe({ ...vibe, name: event.target.value })} /></label>
              <label className="field"><span>Summary</span><textarea value={vibe.description} onChange={(event) => setVibe({ ...vibe, description: event.target.value })} rows={3} /></label>
              <div className="tag-row">{vibe.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <Slider label={t("Energy")} value={controls.energy} onChange={(value) => { setControls({ ...controls, energy: value }); setVibe({ ...vibe, energy: value }); }} />
              <Slider label={t("Discovery")} value={controls.discovery} onChange={(value) => setControls({ ...controls, discovery: value })} low="Mentioned artists" high="Something new" />
              <div className="field-pair"><TextField label={t("Include artists")} value={controls.includeArtists.join(", ")} onChange={(value) => setControls({ ...controls, includeArtists: splitList(value) })} /><TextField label={t("Avoid artists")} value={controls.excludeArtists.join(", ")} onChange={(value) => setControls({ ...controls, excludeArtists: splitList(value) })} /></div>
              <div className="field-pair"><TextField label={t("Include genres")} value={controls.includeGenres.join(", ")} onChange={(value) => setControls({ ...controls, includeGenres: splitList(value) })} /><TextField label={t("Avoid genres")} value={controls.excludeGenres.join(", ")} onChange={(value) => setControls({ ...controls, excludeGenres: splitList(value) })} /></div>
              <div className="field-pair"><TextField label={t("Activity")} value={controls.activity} onChange={(value) => setControls({ ...controls, activity: value })} /><label className="field"><span>{t("Song language")}</span><select value={controls.language} onChange={(event) => setControls({ ...controls, language: event.target.value })}><option>Any</option><option>English</option><option>Ukrainian</option><option>Russian</option><option>Polish</option></select></label></div>
              <label className="field"><span>{t("Region")}</span><select value={controls.region} onChange={(event) => setControls({ ...controls, region: event.target.value })}><option value="PL">Poland</option><option value="UA">Ukraine</option><option value="US">United States</option><option value="GB">United Kingdom</option></select></label>
              <button className="primary wide" onClick={() => void generatePlaylist()} disabled={thinking}><Sparkles />{thinking ? "Creating…" : t("Create my playlist")}<ArrowRight /></button>
            </aside>
          </section>}

          {view === "create" && playlist && <section className="playlist-workspace">
            <div className="workspace-heading"><div><button className="back-link" onClick={() => setPlaylist(null)}><ArrowLeft /> Back to conversation</button><span className="eyebrow">30-TRACK {isLive ? "VERIFIED" : "DEMO"} DRAFT · VERSION {playlist.version}</span><input className="title-input" value={playlist.title} onChange={(event) => setPlaylist({ ...playlist, title: event.target.value })} aria-label="Playlist title" /><p>{playlist.description}</p></div><div className="workspace-actions"><button className="secondary" onClick={() => void saveMood()}><BookHeart />{t("Save mood")}</button><button className="primary" onClick={() => void saveDemoPlaylist()}><Check />{t("Save privately to YouTube")}</button></div></div>
            <div className="demo-disclosure"><Sparkles /><div><strong>{isLive ? "This is a private YouTube draft." : "This is a demo playlist."}</strong><span>{isLive ? "Review, edit, and then save it privately to your YouTube account." : t("Demo playlists stay in this browser and are not saved to YouTube.")}</span></div></div>
            <div className="playlist-grid">
              <div className="left-stack"><YouTubePlayer key={activeTrack.id} track={activeTrack} onPrevious={() => setCurrentTrack((current) => (current - 1 + playlist.tracks.length) % playlist.tracks.length)} onNext={() => setCurrentTrack((current) => (current + 1) % playlist.tracks.length)} t={t} /><div className="feedback-card glass"><div><strong>How does this playlist feel?</strong><span>Your feedback refines later recommendations.</span></div><Feedback value={playlist.feedback} onChange={(feedback) => void submitFeedback("", feedback)} /></div><div className="save-mood-card glass"><label className="field"><span>Name this mood</span><input value={moodName} onChange={(event) => setMoodName(event.target.value)} /></label><button className="secondary" onClick={() => void saveMood()}><Heart />{t("Save mood")}</button></div></div>
              <div className="queue-card glass"><div className="queue-head"><div><span className="eyebrow">{t("Playlist draft")}</span><h2>{playlist.tracks.length} tracks</h2></div><MoreHorizontal /></div><div className="add-track"><Search /><input value={manualQuery} onChange={(event) => setManualQuery(event.target.value)} placeholder={t("Add a song")} onKeyDown={(event) => { if (event.key === "Enter") void addTrack(); }} /><button onClick={() => void addTrack()} aria-label={t("Add a song")}><Plus /></button></div><ol className="track-list">{playlist.tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} active={index === currentTrack} onPlay={() => setCurrentTrack(index)} onMove={moveTrack} onRemove={removeTrack} onReplace={(trackIndex) => void replaceTrack(trackIndex)} onFeedback={(value) => void submitFeedback(track.id, value)} t={t} />)}</ol></div>
            </div>
          </section>}

          {view === "library" && <section><PageHeading eyebrow="YOUR COLLECTION" title={t("Library")} description="Return to playlists and feelings worth keeping." /><div className="tab-list"><button className={libraryTab === "playlists" ? "active" : ""} onClick={() => setLibraryTab("playlists")}><ListMusic />{t("Playlist history")}<span>{history.length}</span></button><button className={libraryTab === "moods" ? "active" : ""} onClick={() => setLibraryTab("moods")}><BookHeart />{t("Saved moods")}<span>{moods.length}</span></button></div>{libraryTab === "playlists" ? <CardGrid empty={history.length === 0} emptyText="Your generated playlists will gather here.">{history.map((item) => <article className="library-card glass" key={item.id}><div className="cover-stack">{item.tracks.slice(0, 4).map((track) => <Image key={track.id} src={track.thumbnail} alt="" width={160} height={90} unoptimized />)}</div><span className="eyebrow"><Clock3 /> {new Date(item.createdAt).toLocaleDateString(locale)}</span><h2>{item.title}</h2><p>{item.description}</p><div className="card-meta"><span>{item.tracks.length} tracks</span><span>{isLive ? "Private history" : "Demo history"}</span></div><button className="secondary wide" onClick={() => { setPlaylist(structuredClone(item)); setCurrentTrack(0); setView("create"); }}>Open playlist<ArrowRight /></button></article>)}</CardGrid> : <CardGrid empty={moods.length === 0} emptyText="Save a vibe once, then return for a fresh variation.">{moods.map((mood) => <article className="library-card mood-card glass" key={mood.id}><div className="mood-orb"><Sparkles /></div><span className="eyebrow">{mood.vibe.tags.slice(0, 3).join(" · ")}</span><h2>{mood.name}</h2><p>{mood.vibe.description}</p><div className="energy-line"><span style={{ width: `${mood.controls.energy}%` }} /></div><div className="card-actions"><button className="primary" onClick={() => void generatePlaylist(mood)}><RefreshCw />{t("Generate similar")}</button><button className="icon-button danger" onClick={() => void deleteMood(mood.id)} aria-label="Delete saved mood"><Trash2 /></button></div></article>)}</CardGrid>}</section>}

          {view === "appearance" && <section><PageHeading eyebrow="PERSONAL SPACE" title={t("Theme studio")} description={t("Choose a starting point, then make it yours.")} /><div className="theme-layout"><div><h2 className="subheading">Glass presets</h2><div className="preset-grid">{presets.map((preset) => <button key={preset.name} className={`theme-preview ${editingTheme.name === preset.name ? "selected" : ""}`} style={themeStyle(preset)} onClick={() => setEditingTheme(preset)}><span className="preview-window"><i/><i/><i/></span><strong>{preset.name}</strong><small>{preset.mode} · {preset.blur}px blur</small>{editingTheme.name === preset.name && <Check className="selected-check" />}</button>)}</div></div><div className="theme-editor glass"><div className="section-heading"><div><span className="eyebrow">ADVANCED EDITOR</span><h2>Fine-tune the glass</h2></div><Palette /></div><div className="colour-grid"><ColorField label="Background" value={editingTheme.background} onChange={(background) => setEditingTheme({ ...editingTheme, background, name: "Custom theme" })} /><ColorField label="Gradient start" value={editingTheme.gradientFrom} onChange={(gradientFrom) => setEditingTheme({ ...editingTheme, gradientFrom, name: "Custom theme" })} /><ColorField label="Gradient end" value={editingTheme.gradientTo} onChange={(gradientTo) => setEditingTheme({ ...editingTheme, gradientTo, name: "Custom theme" })} /><ColorField label="Glass tint" value={editingTheme.surface} onChange={(surface) => setEditingTheme({ ...editingTheme, surface, name: "Custom theme" })} /><ColorField label="Text" value={editingTheme.text} onChange={(text) => setEditingTheme({ ...editingTheme, text, name: "Custom theme" })} /><ColorField label="Accent" value={editingTheme.accent} onChange={(accent) => setEditingTheme({ ...editingTheme, accent, name: "Custom theme" })} /></div><Slider label="Glass opacity" value={Math.round(editingTheme.opacity * 100)} onChange={(value) => setEditingTheme({ ...editingTheme, opacity: Math.max(.1, value / 100), name: "Custom theme" })} /><Slider label="Backdrop blur" value={editingTheme.blur} max={60} onChange={(blur) => setEditingTheme({ ...editingTheme, blur, name: "Custom theme" })} /><Slider label="Corner radius" value={editingTheme.radius} max={40} onChange={(radius) => setEditingTheme({ ...editingTheme, radius, name: "Custom theme" })} /><Slider label="Gradient angle" value={editingTheme.gradientAngle} max={360} onChange={(gradientAngle) => setEditingTheme({ ...editingTheme, gradientAngle, name: "Custom theme" })} />{contrastWarning && <p className="warning">Text and background colours need more contrast.</p>}<div className="theme-live-preview" style={themeStyle(editingTheme)}><div className="mini-glass"><span>Live preview</span><strong>Your music, your atmosphere.</strong><button>Primary action</button></div></div><div className="editor-actions"><button className="secondary" onClick={() => setEditingTheme(theme)}><RotateCcw />{t("Reset")}</button><button className="primary" onClick={() => void applyTheme()}><Check />{t("Apply theme")}</button></div></div></div></section>}

          {view === "settings" && <section><PageHeading eyebrow="YOUR SPACE" title={t("Language & privacy")} description="Control what is remembered, connected, and shown." /><div className="settings-grid"><article className="settings-card glass"><div className="settings-icon"><Languages /></div><div><h2>{t("Interface language")}</h2><p>The AI follows the language of your conversation. Song language is a separate playlist control.</p><LanguagePicker locale={locale} onChange={setLocale} label="Choose language" /></div></article><article className="settings-card glass"><div className="settings-icon"><Sparkles /></div><div><h2>AI and conversation data</h2><p>In live mode, the conversation you submit is sent to OpenAI to interpret your vibe. DSH-Music stores account conversations privately so you can revisit and delete them.</p><button className="secondary" onClick={() => setNotice(isLive ? "Your conversations and learned preferences are private to this account." : "Demo has no paid AI requests or server-stored chat data.")}>Review data use</button></div></article><article className="settings-card glass"><div className="settings-icon"><AudioLines /></div><div><h2>Google and YouTube</h2><p>{isLive ? "YouTube access is connected for private playlist creation. Disconnecting removes provider tokens and signs you out." : "Demo mode is not connected. In live mode, access is requested to create and edit private playlists on your behalf."}</p><button className="secondary" onClick={() => void disconnectGoogle()} disabled={!isLive}>{t("Disconnect Google/YouTube access")}</button></div></article><article className="settings-card glass danger-zone"><div className="settings-icon"><Trash2 /></div><div><h2>{isLive ? "Account deletion" : "Demo data"}</h2><p>{isLive ? "Permanently delete account conversations, preferences, playlist history, saved moods, themes, and credentials." : "Reset conversations, playlist history, moods, feedback, and custom theme data saved by this demo in your browser."}</p>{isLive ? <button className="danger-button" onClick={() => void deleteLiveAccount()}>{t("Delete DSH-Music account")}</button> : <button className="danger-button" onClick={resetDemo}>{t("Reset demo data")}</button>}<small>Deleting DSH-Music data does not delete playlists already created on YouTube.</small></div></article></div></section>}
        </main>
      </div>
      <nav className="mobile-nav glass" aria-label="Primary navigation">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon /><span>{label}</span></button>)}</nav>
      {notice && <div className="toast" role="status"><Check />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X /></button></div>}
    </div>
  );
}

function splitList(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }

function Slider({ label, value, onChange, low, high, max = 100 }: { label: string; value: number; onChange: (value: number) => void; low?: string; high?: string; max?: number }) {
  return <label className="slider-field"><span><strong>{label}</strong><b>{value}{max === 100 ? "%" : ""}</b></span><input type="range" min="0" max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />{(low || high) && <small><span>{low}</span><span>{high}</span></small>}</label>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Comma separated" /></label>;
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>;
}

function Feedback({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="feedback"><button className={value === 1 ? "chosen" : ""} onClick={() => onChange(value === 1 ? 0 : 1)} aria-label="Like"><ThumbsUp /></button><button className={value === -1 ? "chosen dislike" : ""} onClick={() => onChange(value === -1 ? 0 : -1)} aria-label="Dislike"><ThumbsDown /></button></div>;
}

function TrackRow({ track, index, active, onPlay, onMove, onRemove, onReplace, onFeedback, t }: { track: Track; index: number; active: boolean; onPlay: () => void; onMove: (index: number, direction: -1 | 1) => void; onRemove: (index: number) => void; onReplace: (index: number) => void; onFeedback: (value: number) => void; t: (key: string) => string }) {
  return <li className={`track-row ${active ? "active" : ""}`}><button className="track-main" onClick={onPlay} aria-label={`Play ${track.title}`}><span className="track-number">{active ? <AudioLines /> : String(index + 1).padStart(2, "0")}</span><Image src={track.thumbnail} alt="" width={45} height={45} unoptimized /><span className="track-copy"><strong>{track.title}</strong><small>{track.artist}</small><em>{track.origin === "familiar" ? t("From artists you mentioned") : t("Something new")}</em></span><time>{formatDuration(track.duration)}</time></button><Feedback value={track.feedback} onChange={onFeedback} /><div className="track-tools"><button onClick={() => onMove(index, -1)} disabled={index === 0} aria-label={t("Move up")}><ArrowUp /></button><button onClick={() => onMove(index, 1)} aria-label={t("Move down")}><ArrowDown /></button><button onClick={() => onReplace(index)} aria-label={`${t("Replace")} ${track.title}`}><RefreshCw /></button><button onClick={() => onRemove(index)} aria-label={`${t("Remove")} ${track.title}`}><Trash2 /></button></div></li>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="colour-field"><span>{label}</span><div><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><code>{value}</code></div></label>;
}

function CardGrid({ empty, emptyText, children }: { empty: boolean; emptyText: string; children: React.ReactNode }) {
  if (empty) return <div className="empty-state glass"><ListMusic /><h2>Nothing saved yet</h2><p>{emptyText}</p></div>;
  return <div className="card-grid">{children}</div>;
}
