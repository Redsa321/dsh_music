import { db } from "@/lib/server/db";
import { revokeGoogle } from "@/lib/server/youtube";
import { api, assertSameOrigin, requireUser } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const userId = await requireUser();
    await revokeGoogle(userId);
    await db.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
    return { disconnected: true, message: "Google/YouTube access was revoked and local provider data was removed. Sign in again to reconnect." };
  });
}
