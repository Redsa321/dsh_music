import { z } from "zod";
import { trackSchema } from "@/lib/contracts";
import { db } from "@/lib/server/db";
import { api, AppError, assertSameOrigin, readJson, requireUser } from "@/lib/server/http";
import { ownedPlaylist, playlistDto, updatePlaylist } from "@/lib/server/service";

export const runtime = "nodejs";

const patchSchema = z.object({
  version: z.number().int().positive(),
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  tracks: z.array(trackSchema).min(1).max(100).optional(),
}).refine(value => value.title !== undefined || value.description !== undefined || value.tracks !== undefined, "No playlist changes were supplied.");

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  return api(async () => {
    const userId = await requireUser();
    return { playlist: playlistDto(await ownedPlaylist(userId, (await params).id)) };
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return api(async () => {
    assertSameOrigin(request);
    const userId = await requireUser();
    const body = await readJson(request, patchSchema);
    return { playlist: await updatePlaylist(userId, (await params).id, body) };
  });
}

export async function DELETE(request: Request, { params }: Context) {
  return api(async () => {
    assertSameOrigin(request);
    const userId = await requireUser();
    const id = (await params).id;
    const existing = await ownedPlaylist(userId, id);
    if (existing.status === "saving") throw new AppError("SAVE_IN_PROGRESS", "Wait for the YouTube save to finish before removing this local record.", 409);
    await db.playlist.delete({ where: { id } });
    return { deleted: id, remotePlaylistRemains: Boolean(existing.youtubePlaylistId) };
  });
}
