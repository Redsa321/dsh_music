import { themeSchema } from "@/lib/contracts";
import { db } from "@/lib/server/db";
import { api, assertSameOrigin, readJson, requireUser } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET() {
  return api(async () => {
    const userId = await requireUser();
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { theme: true } });
    return { theme: user.theme ? themeSchema.parse(user.theme) : null };
  });
}

export async function PUT(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const userId = await requireUser();
    const theme = await readJson(request, themeSchema);
    await db.user.update({ where: { id: userId }, data: { theme } });
    return { theme };
  });
}
