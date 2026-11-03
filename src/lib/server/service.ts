import type { Playlist as DbPlaylist, Prisma } from "@prisma/client";
import { type Playlist, type PlaylistControls, type Track, type Vibe, vibeSchema, controlsSchema } from "@/lib/contracts";
import { db } from "./db";
import { AppError } from "./http";
import { suggestTracks } from "./ai";
import { candidateAllowed, deduplicateTracks } from "./catalog";
import { googleAccessToken, resolveCandidate, youtubeRequest } from "./youtube";

export const asJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));

export function playlistDto(row: DbPlaylist & { feedback?: { trackId: string; value: number }[] }): Playlist {
  const feedback = row.feedback || [];
  const tracks = row.tracks as unknown as Track[];
  return {
    id: row.id, title: row.title, description: row.description,
    vibe: vibeSchema.parse(row.vibe), controls: controlsSchema.parse(row.controls),
    tracks: tracks.map(track => ({ ...track, feedback: feedback.find(item => item.trackId === track.id)?.value || 0 })),
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), version: row.version,
    status: row.status as Playlist["status"], resolutionStatus: row.resolutionStatus as Playlist["resolutionStatus"],
    feedback: feedback.find(item => !item.trackId)?.value || 0,
    ...(row.youtubePlaylistId ? { youtubePlaylistId: row.youtubePlaylistId, youtubeUrl: `https://www.youtube.com/playlist?list=${row.youtubePlaylistId}`, musicUrl: `https://music.youtube.com/playlist?list=${row.youtubePlaylistId}` } : {}),
    ...(row.saveError ? { error: row.saveError } : {}),
  };
}

export async function ownedPlaylist(userId: string, id: string) {
  const row = await db.playlist.findFirst({ where: { id, userId }, include: { feedback: true } });
  if (!row) throw new AppError("NOT_FOUND", "This playlist was not found.", 404);
  return row;
}

export async function generatePlaylist(userId: string, vibe: Vibe, controls: PlaylistControls): Promise<Playlist> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.aiConsentAt) throw new AppError("AI_CONSENT_REQUIRED", "Start a conversation and allow AI processing before generating music.", 403);
  await googleAccessToken(userId);
  const preferences = await db.conversation.findMany({ where: { userId, vibe: { not: undefined } }, orderBy: { updatedAt: "desc" }, take: 5, select: { vibe: true } });
  const feedback = await db.feedback.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 20, include: { playlist: { select: { title: true, tracks: true } } } });
  const signals = feedback.map(item => ({ value: item.value, playlist: item.playlist.title, track: (item.playlist.tracks as unknown as Track[]).find(track => track.id === item.trackId)?.title }));
  const plan = await suggestTracks(vibe, controls, preferences.map(item => item.vibe), signals);
  const candidates = plan.candidates.filter(candidate => candidateAllowed(candidate, controls)).slice(0, 38);
  let tracks: Track[] = [];
  for (let offset = 0; offset < candidates.length && tracks.length < 30; offset += 3) {
    const resolved = await Promise.all(candidates.slice(offset, offset + 3).map(candidate => resolveCandidate(userId, candidate, controls.region)));
    tracks = deduplicateTracks([...tracks, ...resolved.filter((track): track is Track => Boolean(track))]);
  }
  tracks = tracks.slice(0, 30);
  if (!tracks.length) throw new AppError("NO_MATCHES", "No playable music matched these preferences. Try broadening the artists or genres.", 422);
  const row = await db.playlist.create({ data: { userId, title: plan.title.slice(0, 100), description: plan.description.slice(0, 2000), vibe: asJson(vibe), controls: asJson(controls), tracks: asJson(tracks), resolutionStatus: tracks.length === 30 ? "complete" : "partial" } });
  return playlistDto(row);
}

export async function updatePlaylist(userId: string, id: string, input: { version: number; title?: string; description?: string; tracks?: Track[] }) {
  const existing = await ownedPlaylist(userId, id);
  if (existing.version !== input.version) throw new AppError("VERSION_CONFLICT", "This playlist changed in another tab. Refresh it before saving new edits.", 409);
  const data: Prisma.PlaylistUpdateManyMutationInput = { version: { increment: 1 } };
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.tracks !== undefined) {
    const unique = new Set(input.tracks.map(track => track.videoId));
    if (unique.size !== input.tracks.length) throw new AppError("DUPLICATE_TRACK", "A draft cannot contain the same video twice.", 422);
    data.tracks = asJson(input.tracks);
    data.resolutionStatus = input.tracks.length === 30 ? "complete" : "partial";
  }
  const result = await db.playlist.updateMany({ where: { id, userId, version: input.version }, data });
  if (!result.count) throw new AppError("VERSION_CONFLICT", "This playlist changed in another tab. Refresh it before saving new edits.", 409);
  return playlistDto(await ownedPlaylist(userId, id));
}

export async function setFeedback(userId: string, playlistId: string, trackId: string, value: number) {
  const playlist = await ownedPlaylist(userId, playlistId);
  if (trackId && !(playlist.tracks as unknown as Track[]).some(track => track.id === trackId)) throw new AppError("NOT_FOUND", "This track is not in that playlist.", 404);
  if (value === 0) await db.feedback.deleteMany({ where: { userId, playlistId, trackId } });
  else await db.feedback.upsert({ where: { userId_playlistId_trackId: { userId, playlistId, trackId } }, create: { userId, playlistId, trackId, value }, update: { value } });
  return playlistDto(await ownedPlaylist(userId, playlistId));
}

type RemotePlaylist = { id: string };

export async function savePlaylistToYouTube(userId: string, playlistId: string) {
  let row = await ownedPlaylist(userId, playlistId);
  if (row.status === "saved") return playlistDto(row);
  const locked = await db.playlist.updateMany({ where: { id: playlistId, userId, status: { not: "saving" } }, data: { status: "saving", saveError: null, saveAttemptedAt: new Date(), saveLockedAt: new Date() } });
  if (!locked.count) throw new AppError("SAVE_IN_PROGRESS", "This playlist is already being saved. Please wait a moment.", 409);
  try {
    let remoteId = row.youtubePlaylistId;
    if (!remoteId) {
      const created = await youtubeRequest<RemotePlaylist>(userId, "playlists", { part: "snippet,status" }, "POST", { snippet: { title: row.title.slice(0, 100), description: row.description.slice(0, 4900) }, status: { privacyStatus: "private" } });
      remoteId = created.id;
      row = await db.playlist.update({ where: { id: playlistId }, data: { youtubePlaylistId: remoteId }, include: { feedback: true } });
    }
    const saved = new Set(Array.isArray(row.savedVideoIds) ? row.savedVideoIds as string[] : []);
    const tracks = row.tracks as unknown as Track[];
    for (const track of tracks) {
      if (saved.has(track.videoId)) continue;
      await youtubeRequest(userId, "playlistItems", { part: "snippet" }, "POST", { snippet: { playlistId: remoteId, resourceId: { kind: "youtube#video", videoId: track.videoId } } });
      saved.add(track.videoId);
      await db.playlist.update({ where: { id: playlistId }, data: { savedVideoIds: asJson([...saved]) } });
    }
    const complete = await db.playlist.update({ where: { id: playlistId }, data: { status: "saved", saveError: null, saveLockedAt: null, savedVideoIds: asJson([...saved]) }, include: { feedback: true } });
    return playlistDto(complete);
  } catch (error) {
    const message = error instanceof AppError ? error.message : "YouTube could not finish saving this playlist. Retry safely when it is available.";
    await db.playlist.updateMany({ where: { id: playlistId, userId }, data: { status: "partial", saveError: message, saveLockedAt: null } });
    throw error;
  }
}
