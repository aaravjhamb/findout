import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      slackId?: string | null;
      nickname?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    slackId?: string | null;
    nickname?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    slackId?: string | null;
    nickname?: string | null;
  }
}
