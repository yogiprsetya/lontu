import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "./config/db";
import { usersTable } from "./db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        return Boolean(profile?.email_verified);
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (trigger === "signIn" && user.email) {
        const existing = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.email, user.email));

        if (existing.length > 0) {
          token.userId = existing[0].id;
        } else {
          const inserted = await db
            .insert(usersTable)
            .values({
              email: user.email,
              name: user.name,
              image: user.image,
            })
            .returning();
          token.userId = inserted[0].id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
});
