import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./server/db";
import { encryptToken } from "./server/crypto";

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.DATABASE_URL && (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET) && process.env.TOKEN_ENCRYPTION_KEY);

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: googleConfigured() ? [GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: { params: { scope: "openid email profile https://www.googleapis.com/auth/youtube.force-ssl", access_type: "offline", prompt: "consent" } },
  })] : [],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.sub) {
        const user = await db.user.upsert({
          where: { googleSubject: profile.sub },
          create: { googleSubject: profile.sub, name: token.name, email: token.email, image: token.picture },
          update: { name: token.name, email: token.email, image: token.picture },
        });
        token.userId = user.id;
        token.sessionVersion = user.sessionVersion;
        if (account.access_token && account.scope?.includes("youtube")) {
          const update = {
            accessToken: encryptToken(account.access_token),
            ...(account.refresh_token ? { refreshToken: encryptToken(account.refresh_token) } : {}),
            expiresAt: new Date((account.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000),
            scopes: account.scope,
          };
          await db.providerConnection.upsert({ where: { userId: user.id }, create: { userId: user.id, ...update }, update });
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId !== "string") return { ...session, user: undefined };
      const user = await db.user.findUnique({ where: { id: token.userId } });
      if (!user || user.sessionVersion !== token.sessionVersion) return { ...session, user: undefined };
      session.user = { id: user.id, name: user.name, email: user.email, image: user.image };
      return session;
    },
  },
  pages: { signIn: "/", error: "/" },
};
