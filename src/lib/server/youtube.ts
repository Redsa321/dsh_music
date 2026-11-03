import type { Track } from "@/lib/contracts";
import type { Candidate } from "./ai";
import { db } from "./db";
import { encryptToken, decryptToken } from "./crypto";
import { AppError } from "./http";
import { candidateMatches, durationSeconds } from "./catalog";

export async function googleAccessToken(userId: string): Promise<string> {
  const connection = await db.providerConnection.findUnique({ where: { userId } });
  if (!connection) throw new AppError("YOUTUBE_CONNECT_REQUIRED", "Connect YouTube access to find and save real music.", 403);
  if (connection.expiresAt.getTime() > Date.now() + 60_000) return decryptToken(connection.accessToken);
  if (!connection.refreshToken) throw new AppError("YOUTUBE_RECONNECT_REQUIRED", "Reconnect Google/YouTube access to continue.", 401);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, refresh_token: decryptToken(connection.refreshToken), grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(15_000), cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      await clearProviderData(userId);
      throw new AppError("YOUTUBE_RECONNECT_REQUIRED", "Google access expired. Reconnect your account.", 401);
    }
    throw new AppError("GOOGLE_UNAVAILABLE", "Google is temporarily unavailable. Try again shortly.", 502);
  }
  const data = await response.json() as { access_token: string; expires_in: number; refresh_token?: string };
  await db.providerConnection.update({ where: { userId }, data: { accessToken: encryptToken(data.access_token), expiresAt: new Date(Date.now() + data.expires_in * 1000), ...(data.refresh_token ? { refreshToken: encryptToken(data.refresh_token) } : {}) } });
  return data.access_token;
}

export async function clearProviderData(userId: string) {
  await db.$transaction([
    db.providerConnection.deleteMany({ where: { userId } }),
    db.playlist.updateMany({ where: { userId }, data: { tracks: [], savedVideoIds: [], youtubePlaylistId: null, status: "draft", resolutionStatus: "partial", saveLockedAt: null, saveError: "Provider access was disconnected. Regenerate this mood to find tracks again." } }),
  ]);
}

export async function revokeGoogle(userId: string) {
  const connection = await db.providerConnection.findUnique({ where: { userId } });
  if (connection) {
    const token = decryptToken(connection.refreshToken || connection.accessToken);
    const response = await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }), signal: AbortSignal.timeout(15_000) });
    // An already-invalid token requires no further revocation.
    if (!response.ok && response.status !== 400) throw new AppError("REVOKE_FAILED", "Google could not revoke access. Please try again or remove access in your Google account settings.", 502);
  }
  await clearProviderData(userId);
}

export async function youtubeRequest<T>(userId: string, endpoint: string, params: Record<string, string>, method = "GET", body?: unknown): Promise<T> {
  const accessToken = await googleAccessToken(userId);
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { error?: { errors?: { reason?: string }[] } };
    const reason = detail.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") throw new AppError("YOUTUBE_QUOTA_EXCEEDED", "The daily YouTube API allowance has been reached. Your draft is safe; try again after the quota resets.", 429);
    if (response.status === 401) throw new AppError("YOUTUBE_RECONNECT_REQUIRED", "Reconnect Google/YouTube access to continue.", 401);
    if (reason === "youtubeSignupRequired") throw new AppError("YOUTUBE_ACCOUNT_REQUIRED", "Open YouTube once to finish creating your channel, then try again.", 403);
    throw new AppError("YOUTUBE_REQUEST_FAILED", "YouTube could not complete this action. Check your connection and try again.", 502);
  }
  return response.status === 204 ? {} as T : await response.json() as T;
}

type Video = { id: string; snippet: { title: string; channelTitle: string; thumbnails?: { medium?: { url: string } } }; status: { embeddable?: boolean; privacyStatus?: string }; contentDetails: { duration: string; regionRestriction?: { allowed?: string[]; blocked?: string[] } } };
export async function videoDetails(userId: string, ids: string[], region: string): Promise<Track[]> {
  if (!ids.length) return [];
  const result = await youtubeRequest<{ items: Video[] }>(userId, "videos", { part: "snippet,contentDetails,status", id: ids.slice(0, 50).join(",") });
  return (result.items || []).filter(video => {
    const restriction = video.contentDetails.regionRestriction;
    return video.status.embeddable && video.status.privacyStatus === "public" && !restriction?.blocked?.includes(region) && (!restriction?.allowed || restriction.allowed.includes(region));
  }).map(video => ({ id: video.id, videoId: video.id, title: video.snippet.title, artist: video.snippet.channelTitle, thumbnail: video.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`, duration: durationSeconds(video.contentDetails.duration), reason: "", origin: "discovery", feedback: 0, available: true }));
}

export async function searchYouTube(userId: string, query: string, region: string): Promise<Track[]> {
  const key = `v1:${region}:${query.toLowerCase().trim()}`;
  const cached = await db.catalogCache.findUnique({ where: { key } });
  if (cached && cached.expiresAt.getTime() > Date.now()) return cached.data as unknown as Track[];
  const results = await youtubeRequest<{ items: { id: { videoId: string } }[] }>(userId, "search", { part: "snippet", q: query, type: "video", maxResults: "5", videoEmbeddable: "true", videoSyndicated: "true", regionCode: region });
  const tracks = await videoDetails(userId, (results.items || []).map(item => item.id.videoId), region);
  await db.catalogCache.upsert({ where: { key }, create: { key, data: JSON.parse(JSON.stringify(tracks)), expiresAt: new Date(Date.now() + 7 * 86400_000) }, update: { data: JSON.parse(JSON.stringify(tracks)), fetchedAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86400_000) } });
  return tracks;
}

export async function resolveCandidate(userId: string, candidate: Candidate, region: string): Promise<Track | null> {
  const tracks = await searchYouTube(userId, `${candidate.artist} ${candidate.title} official`, region);
  const match = tracks.find(track => candidateMatches(candidate, track.title, track.artist));
  return match ? { ...match, artist: candidate.artist, title: candidate.title, reason: candidate.reason.slice(0, 500), origin: candidate.origin } : null;
}
