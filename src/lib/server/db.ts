import { PrismaClient } from "@prisma/client";

const globalDb = globalThis as unknown as { dshPrisma?: PrismaClient };
export const db = globalDb.dshPrisma ?? new PrismaClient({ log: ["error"] });
if (process.env.NODE_ENV !== "production") globalDb.dshPrisma = db;
