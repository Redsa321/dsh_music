import { getServerSession } from "next-auth";
import { authOptions, googleConfigured } from "@/lib/auth";
import { db } from "@/lib/server/db";
import { api } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET() {
  return api(async () => {
    const configured = { google: googleConfigured(), openai: Boolean(process.env.OPENAI_API_KEY), database: Boolean(process.env.DATABASE_URL) };
    const session = configured.google ? await getServerSession(authOptions) : null;
    const connection = session?.user?.id ? await db.providerConnection.findUnique({ where: { userId: session.user.id }, select: { scopes: true } }) : null;
    return { demoAvailable: process.env.DEMO_ENABLED !== "false", configured, user: session?.user || null, youtubeConnected: Boolean(connection?.scopes.includes("youtube")) };
  });
}
