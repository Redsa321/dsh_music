import type { Playlist, PlaylistControls, Track, Vibe } from "@/lib/contracts";

const songs = [
  ["dQw4w9WgXcQ", "Never Gonna Give You Up", "Rick Astley"],
  ["9bZkp7q19f0", "Gangnam Style", "PSY"],
  ["kJQP7kiw5Fk", "Despacito", "Luis Fonsi"],
  ["JGwWNGJdvx8", "Shape of You", "Ed Sheeran"],
  ["fJ9rUzIMcZQ", "Bohemian Rhapsody", "Queen"],
  ["YQHsXMglC9A", "Hello", "Adele"],
  ["hT_nvWreIhg", "Counting Stars", "OneRepublic"],
  ["CevxZvSJLk8", "Roar", "Katy Perry"],
  ["OPf0YbXqDm0", "Uptown Funk", "Mark Ronson ft. Bruno Mars"],
  ["pRpeEdMmmQ0", "Waka Waka", "Shakira"],
  ["60ItHLz5WEA", "Faded", "Alan Walker"],
  ["e-ORhEE9VVg", "Blank Space", "Taylor Swift"],
  ["RBumgq5yVrA", "Let Her Go", "Passenger"],
  ["2Vv-BfVoq4g", "Perfect", "Ed Sheeran"],
  ["SlPhMPnQ58k", "Memories", "Maroon 5"],
  ["UceaB4D0jpo", "New Rules", "Dua Lipa"],
  ["nfs8NYg7yQM", "Attention", "Charlie Puth"],
  ["gCYcHz2k5x0", "Apologize", "Timbaland ft. OneRepublic"],
  ["09R8_2nJtjg", "Sugar", "Maroon 5"],
  ["3tmd-ClpJxA", "Chandelier", "Sia"],
  ["lp-EO5I60KA", "Thinking Out Loud", "Ed Sheeran"],
  ["fRh_vgS2dFE", "Sorry", "Justin Bieber"],
  ["PT2_F-1esPk", "Closer", "The Chainsmokers"],
  ["YykjpeuMNEk", "Hymn for the Weekend", "Coldplay"],
  ["34Na4j8AVgA", "Starboy", "The Weeknd"],
  ["CwfoyVa980U", "Lean On", "Major Lazer & DJ Snake"],
  ["papuvlVeZg8", "Rockabye", "Clean Bandit"],
  ["RgKAFK5djSk", "See You Again", "Wiz Khalifa ft. Charlie Puth"],
  ["uelHwf8o7_U", "Love the Way You Lie", "Eminem ft. Rihanna"],
  ["LjhCEhWiKXk", "Just the Way You Are", "Bruno Mars"],
] as const;

export const demoVibe: Vibe = {
  name: "Soft momentum",
  description: "Warm, hopeful songs that keep you moving without asking too much of you.",
  tags: ["warm", "reflective", "gently upbeat"],
  energy: 58,
  artists: ["OneRepublic", "Dua Lipa"],
  genres: ["pop", "indie pop"],
};

export const demoControls: PlaylistControls = {
  energy: 58,
  discovery: 25,
  includeArtists: ["OneRepublic"],
  excludeArtists: [],
  includeGenres: ["pop"],
  excludeGenres: ["metal"],
  language: "Any",
  region: "PL",
  activity: "Evening reset",
};

export const demoTracks: Track[] = songs.map(([videoId, title, artist], index) => ({
  id: `demo-${index + 1}`,
  videoId,
  title,
  artist,
  thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  duration: 180 + (index * 17) % 95,
  reason: index < 8 ? "Fits the warm energy you described." : "Adds a little discovery without breaking the mood.",
  origin: index < 22 ? "familiar" : "discovery",
  feedback: 0,
  available: true,
}));

export function makeDemoPlaylist(id = `demo-${Date.now()}`): Playlist {
  const now = new Date().toISOString();
  return {
    id,
    title: demoVibe.name,
    description: demoVibe.description,
    vibe: structuredClone(demoVibe),
    controls: structuredClone(demoControls),
    tracks: structuredClone(demoTracks),
    createdAt: now,
    updatedAt: now,
    version: 1,
    status: "draft",
    resolutionStatus: "complete",
    feedback: 0,
  };
}
