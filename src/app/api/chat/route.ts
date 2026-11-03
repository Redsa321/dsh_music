import { z } from "zod";
import { localeSchema } from "@/lib/contracts";
import { db } from "@/lib/server/db";
import { chatWithAI } from "@/lib/server/ai";
import { api, assertSameOrigin, readJson, requireUser, rateLimit, AppError } from "@/lib/server/http";
import { asJson } from "@/lib/server/service";
export const runtime = "nodejs";
export const maxDuration = 90;
const input = z.object({ conversationId: z.string().optional(), message: z.string().trim().min(1).max(5000), mode: z.enum(["guided", "free"]), locale: localeSchema, consent: z.literal(true) });
export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const userId = await requireUser(); rateLimit(userId, "chat", 12);
    const body = await readJson(request, input);
    let conversation = body.conversationId ? await db.conversation.findFirst({ where: { id: body.conversationId, userId } }) : null;
    if (body.conversationId && !conversation) throw new AppError("NOT_FOUND", "This conversation was not found.", 404);
    if (!conversation) conversation = await db.conversation.create({ data: { userId, mode: body.mode, locale: body.locale } });
    const existing = await db.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "desc" }, take: 15 });
    const preferences = await db.conversation.findMany({ where: { userId, NOT: { id: conversation.id } }, orderBy: { updatedAt: "desc" }, take: 3, select: { vibe: true } });
    await db.user.update({ where: { id: userId }, data: { aiConsentAt: new Date(), locale: body.locale } });
    const answer = await chatWithAI([...existing.reverse().map(message => ({ role: message.role as "user" | "assistant", content: message.content })), { role: "user", content: body.message }], body.mode, body.locale, preferences.map(item => item.vibe));
    await db.$transaction([
      db.message.create({ data: { conversationId: conversation.id, role: "user", content: body.message } }),
      db.message.create({ data: { conversationId: conversation.id, role: "assistant", content: answer.reply } }),
      db.conversation.update({ where: { id: conversation.id }, data: { mode: body.mode, locale: body.locale, vibe: asJson(answer.vibe) } }),
    ]);
    return { conversationId: conversation.id, ...answer };
  });
}
