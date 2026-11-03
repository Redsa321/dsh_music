import { z } from "zod";
import { api, assertSameOrigin, readJson, requireUser } from "@/lib/server/http";
import { setFeedback } from "@/lib/server/service";

export const runtime = "nodejs";
const input = z.object({ trackId: z.string().max(100).default(""), value: z.number().int().min(-1).max(1) });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertSameOrigin(request);
    const userId = await requireUser();
    const body = await readJson(request, input);
    return { playlist: await setFeedback(userId, (await context.params).id, body.trackId, body.value) };
  });
}
