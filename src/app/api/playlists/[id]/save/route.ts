import { api, assertSameOrigin, rateLimit, requireUser } from "@/lib/server/http";
import { savePlaylistToYouTube } from "@/lib/server/service";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertSameOrigin(request);
    const userId = await requireUser();
    rateLimit(userId, "youtube-save", 5, 300_000);
    return { playlist: await savePlaylistToYouTube(userId, (await context.params).id) };
  });
}
