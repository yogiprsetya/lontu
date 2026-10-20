import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedSignIn } from "@/lib/auth/allowlist";
import { upsertUser } from "@/lib/server/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile?.sub) return false;
      const allowed = isAllowedSignIn(
        { email: profile.email, emailVerified: profile.email_verified === true },
        process.env.ALLOWED_EMAILS,
      );
      if (!allowed) return false;
      await upsertUser({ id: profile.sub, email: profile.email!, name: profile.name, image: profile.picture });
      return true;
    },
    jwt({ token, profile }) {
      if (profile?.sub) token.sub = profile.sub;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
