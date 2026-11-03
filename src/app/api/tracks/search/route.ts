import { z } from "zod";
import { api, assertSameOrigin, rateLimit, readJson, requireUser } from "@/lib/server/http";
import { searchYouTube } from "@/lib/server/youtube";

export const runtime = "nodejs";

const input = z.object({
  query: z.string().trim().min(2).max(200),
  region: z.string().regex(/^[A-Z]{2}$/),
});

export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const userId = await requireUser();
    rateLimit(userId, "track-search", 12, 60_000);
    const body = await readJson(request, input);
    return { tracks: await searchYouTube(userId, body.query, body.region) };
  });
}
