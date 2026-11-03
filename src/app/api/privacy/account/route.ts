import { db } from "@/lib/server/db";
import { revokeGoogle } from "@/lib/server/youtube";
import { api, assertSameOrigin, requireUser } from "@/lib/server/http";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const userId = await requireUser();
    await revokeGoogle(userId);
    await db.user.delete({ where: { id: userId } });
    return { deleted: true, remotePlaylistsRemain: true };
  });
}
