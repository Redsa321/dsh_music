import { db } from "@/lib/server/db";
import { api, assertSameOrigin, requireUser, AppError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    assertSameOrigin(request);
    const userId = await requireUser();
    const id = (await context.params).id;
    const deleted = await db.savedMood.deleteMany({ where: { id, userId } });
    if (!deleted.count) throw new AppError("NOT_FOUND", "This saved mood was not found.", 404);
    return { deleted: id };
  });
}
