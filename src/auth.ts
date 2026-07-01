import NextAuth from "next-auth";
import { upsertIdentity } from "@/lib/data";
import { avatarUrl } from "@/lib/avatar";

const SCOPE = process.env.HACKCLUB_SCOPE || "openid profile email slack_id";

export const AUTH_CONFIGURED =
  !!process.env.HACKCLUB_CLIENT_ID && !!process.env.HACKCLUB_CLIENT_SECRET;

const hackclubProvider: any = {
  id: "hackclub",
  name: "Hack Club",
  type: "oidc",
  issuer: "https://auth.hackclub.com",
  clientId: process.env.HACKCLUB_CLIENT_ID,
  clientSecret: process.env.HACKCLUB_CLIENT_SECRET,
  authorization: { params: { scope: SCOPE } },

  profile(profile: Record<string, any>) {

    const slackId = profile.slack_id ?? null;
    if (!slackId) console.warn("[auth] sign-in without slack_id claim — occupancy disabled for this session");
    return {
      id: profile.sub,
      name: profile.name ?? profile.nickname ?? null,
      email: profile.email ?? null,

      image: profile.picture ?? avatarUrl(profile.slack_id) ?? null,
      slackId,
      nickname: profile.nickname ?? null,
    };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [hackclubProvider],
  callbacks: {
    async jwt({ token, user }) {

      if (user) {
        const u = user as Record<string, any>;
        token.slackId = u.slackId ?? null;
        token.nickname = u.nickname ?? null;
        if (u.image) token.picture = u.image;
        if (u.name) token.name = u.name;
        if (u.email) token.email = u.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.slackId = (token.slackId as string) ?? null;
        session.user.nickname = (token.nickname as string) ?? null;
      }
      return session;
    },
  },
  events: {

    async signIn({ user }) {
      const u = user as Record<string, any>;
      const slackId = u?.slackId;
      if (!slackId) return;
      try {
        await upsertIdentity({
          slackId,
          email: u.email ?? null,
          name: u.name ?? u.nickname ?? null,
          nickname: u.nickname ?? null,
          image: u.image ?? null,
        });
      } catch (e) {
        console.error("[auth] upsertIdentity failed:", e);
      }
    },
  },
});
