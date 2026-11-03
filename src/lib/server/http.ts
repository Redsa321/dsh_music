import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, googleConfigured } from "@/lib/auth";

export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

export function assertSameOrigin(request: Request): void {
  const expected = new URL(process.env.APP_URL || process.env.NEXTAUTH_URL || request.url).origin;
  const origin = request.headers.get("origin");
  if (origin !== expected) throw new AppError("INVALID_ORIGIN", "This action must be requested from DSH-Music.", 403);
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new AppError("INVALID_BODY", "Send a JSON request.");
  const value = await request.text();
  if (value.length > 128_000) throw new AppError("BODY_TOO_LARGE", "This request is too large.", 413);
  try { return schema.parse(JSON.parse(value)); }
  catch (error) {
    if (error instanceof z.ZodError) throw error;
    throw new AppError("INVALID_BODY", "The request is not valid JSON.");
  }
}

export async function requireUser(): Promise<string> {
  if (!googleConfigured()) throw new AppError("SETUP_REQUIRED", "Google sign-in and the database need to be configured. You can explore the guest demo meanwhile.", 503);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new AppError("SIGN_IN_REQUIRED", "Sign in with Google to use your private account.", 401);
  return session.user.id;
}

const globalRate = globalThis as unknown as { dshRateLimits?: Map<string, { count: number; reset: number }> };
const buckets = globalRate.dshRateLimits ??= new Map();
export function rateLimit(userId: string, action: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  if (buckets.size > 2000) for (const [key, value] of buckets) if (value.reset < now) buckets.delete(key);
  const key = `${action}:${userId}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) { buckets.set(key, { count: 1, reset: now + windowMs }); return; }
  if (bucket.count >= limit) throw new AppError("RATE_LIMITED", "Please wait a moment before trying again.", 429);
  bucket.count++;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function api(action: () => Promise<unknown>): Promise<Response> {
  try { return json(await action()); }
  catch (error) {
    if (error instanceof AppError) return json({ error: { code: error.code, message: error.message } }, error.status);
    if (error instanceof z.ZodError) return json({ error: { code: "VALIDATION_ERROR", message: "Please check the submitted values.", fields: error.issues.map(x => x.path.join(".")) } }, 400);
    // Do not expose SQL, credentials, provider responses or private conversation data.
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error("DSH-Music request failed:", name);
    return json({ error: { code: "SERVICE_UNAVAILABLE", message: "This service is unavailable. Check the local setup and try again." } }, 503);
  }
}
