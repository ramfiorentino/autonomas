import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getSubscription } from "@/lib/subscription";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
        token.expires_at = account.expires_at;
      }

      // Always sync subscription tier/status from Redis
      if (token.sub) {
        const sub = await getSubscription(token.sub);
        token.tier = sub.tier;
        token.status = sub.status;
      }

      // Token refresh logic — return early if not expired or no expiry info
      if (
        !token.expires_at ||
        typeof token.expires_at !== "number" ||
        Date.now() < token.expires_at * 1000
      ) {
        return token;
      }

      // Refresh expired token
      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refresh_token as string,
          }),
        });

        const tokens = await response.json();

        if (!response.ok) throw tokens;

        return {
          ...token,
          access_token: tokens.access_token,
          expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
        };
      } catch (error) {
        console.error("Token refresh failed:", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.access_token = token.access_token as string;
      session.refresh_token = token.refresh_token as string;
      session.error = token.error as string | undefined;
      session.tier = (token.tier as "paid" | "free") ?? "free";
      session.status = (token.status as "active" | "past_due" | "cancelled" | "free") ?? "free";
      return session;
    },
  },
});

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    access_token: string;
    refresh_token: string;
    error?: string;
    tier: "paid" | "free";
    status: "active" | "past_due" | "cancelled" | "free";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    tier?: "paid" | "free";
    status?: "active" | "past_due" | "cancelled" | "free";
  }
}
