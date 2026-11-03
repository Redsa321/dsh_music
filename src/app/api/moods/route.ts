import { z } from "zod";
import { controlsSchema, vibeSchema } from "@/lib/contracts";
import { db } from "@/lib/server/db";
import { asJson } from "@/lib/server/service";
import { api, assertSameOrigin, readJson, requireUser } from "@/lib/server/http";

export const runtime = "nodejs";
const input = z.object({ name: z.string().trim().min(1).max(100), vibe: vibeSchema, controls: controlsSchema });

export async function GET() {
  return api(async () => {
    const userId = await requireUser();
    const moods = await db.savedMood.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return { moods: moods.map(mood => ({ id: mood.id, name: mood.name, vibe: vibeSchema.parse(mood.vibe), controls: controlsSchema.parse(mood.controls), createdAt: mood.createdAt.toISOString() })) };
  });
}

export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const userId = await requireUser();
    const body = await readJson(request, input);
    const mood = await db.savedMood.create({ data: { userId, name: body.name, vibe: asJson(body.vibe), controls: asJson(body.controls) } });
    return { mood: { id: mood.id, name: mood.name, vibe: body.vibe, controls: body.controls, createdAt: mood.createdAt.toISOString() } };
  });
}
