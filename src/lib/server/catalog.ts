import type { PlaylistControls, Track } from "@/lib/contracts";
import type { Candidate } from "./ai";

export function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
export function candidateAllowed(candidate: Candidate, controls: PlaylistControls) {
  const artist = normalize(candidate.artist);
  if (controls.excludeArtists.some(excluded => artist.includes(normalize(excluded)))) return false;
  return !candidate.genres.some(genre => controls.excludeGenres.some(excluded => normalize(genre).includes(normalize(excluded))));
}
export function candidateMatches(candidate: Candidate, title: string, channel: string) {
  const haystack = normalize(`${title} ${channel}`);
  const titleTokens = normalize(candidate.title).split(" ").filter(Boolean);
  const artistTokens = normalize(candidate.artist).split(" ").filter(Boolean);
  return titleTokens.every(token => haystack.includes(token)) && artistTokens.some(token => haystack.includes(token));
}
export function deduplicateTracks(tracks: Track[]) {
  const videos = new Set<string>(); const songs = new Set<string>();
  return tracks.filter(track => {
    const key = `${normalize(track.artist)}:${normalize(track.title)}`;
    if (videos.has(track.videoId) || songs.has(key)) return false;
    videos.add(track.videoId); songs.add(key); return true;
  });
}
export function durationSeconds(iso: string) {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0;
}
