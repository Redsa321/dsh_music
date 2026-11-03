import { z } from "zod";

export const localeSchema = z.enum(["en", "uk", "ru", "pl"]);
export type Locale = z.infer<typeof localeSchema>;
export const vibeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1200),
  tags: z.array(z.string().max(40)).max(8),
  energy: z.number().min(0).max(100),
  artists: z.array(z.string().max(100)).max(20),
  genres: z.array(z.string().max(60)).max(20),
});
export type Vibe = z.infer<typeof vibeSchema>;
export const controlsSchema = z.object({
  energy: z.number().min(0).max(100),
  discovery: z.number().min(0).max(100),
  includeArtists: z.array(z.string().max(100)).max(20),
  excludeArtists: z.array(z.string().max(100)).max(20),
  includeGenres: z.array(z.string().max(60)).max(20),
  excludeGenres: z.array(z.string().max(60)).max(20),
  language: z.string().max(50),
  region: z.string().regex(/^[A-Z]{2}$/),
  activity: z.string().max(100),
});
export type PlaylistControls = z.infer<typeof controlsSchema>;
export const defaultControls: PlaylistControls = {
  energy: 45, discovery: 25, includeArtists: [], excludeArtists: [],
  includeGenres: [], excludeGenres: [], language: "Any", region: "PL", activity: "Unwinding",
};
export const trackSchema = z.object({
  id: z.string().max(100), videoId: z.string().regex(/^[\w-]{11}$/),
  title: z.string().max(300), artist: z.string().max(200),
  thumbnail: z.string().url().max(1000), duration: z.number().nonnegative().max(86400),
  reason: z.string().max(500), origin: z.enum(["familiar", "discovery"]),
  feedback: z.number().int().min(-1).max(1).default(0),
  available: z.boolean().default(true),
});
export type Track = z.infer<typeof trackSchema>;
export interface Playlist {
  id: string; title: string; description: string; vibe: Vibe; controls: PlaylistControls;
  tracks: Track[]; createdAt: string; updatedAt: string; version: number;
  status: "draft" | "saving" | "saved" | "partial" | "failed";
  resolutionStatus: "complete" | "partial";
  youtubePlaylistId?: string; youtubeUrl?: string; musicUrl?: string;
  feedback: number; error?: string;
}
export interface SavedMood { id: string; name: string; vibe: Vibe; controls: PlaylistControls; createdAt: string; }
export interface ChatMessage { id: string; role: "user" | "assistant"; content: string; }
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const themeSchema = z.object({
  name: z.string().min(1).max(80), mode: z.enum(["dark", "light"]),
  background: color, surface: color, text: color, accent: color,
  gradientFrom: color, gradientTo: color,
  blur: z.number().min(0).max(60), opacity: z.number().min(0.1).max(1),
  radius: z.number().min(0).max(40), shadow: z.number().min(0).max(1),
  borderOpacity: z.number().min(0).max(1), gradientAngle: z.number().min(0).max(360),
  motion: z.boolean(),
});
export type ThemeConfig = z.infer<typeof themeSchema>;
export interface ApiStatus {
  demoAvailable: boolean;
  configured: { google: boolean; openai: boolean; database: boolean };
  user: { id: string; name: string | null; email: string | null; image: string | null } | null;
  youtubeConnected: boolean;
}
