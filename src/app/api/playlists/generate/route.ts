import { z } from "zod";
import { vibeSchema, controlsSchema } from "@/lib/contracts";
import { api, assertSameOrigin, readJson, requireUser, rateLimit } from "@/lib/server/http";
import { generatePlaylist } from "@/lib/server/service";
export const runtime = "nodejs";
export const maxDuration = 180;
const input = z.object({ vibe: vibeSchema, controls: controlsSchema, conversationId: z.string().optional() });
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request); const userId = await requireUser(); rateLimit(userId, "generate", 3, 300_000);
    const body = await readJson(request, input);
    return { playlist: await generatePlaylist(userId, body.vibe, body.controls) };
  });
}
