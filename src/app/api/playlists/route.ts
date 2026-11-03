import { db } from "@/lib/server/db";
import { api, requireUser } from "@/lib/server/http";
import { playlistDto } from "@/lib/server/service";
export const runtime = "nodejs";
export async function GET() {
  return api(async () => {
    const userId = await requireUser();
    const playlists = await db.playlist.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, include: { feedback: true } });
    return { playlists: playlists.map(playlistDto) };
  });
}
