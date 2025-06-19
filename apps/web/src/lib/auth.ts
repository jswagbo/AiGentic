import NextAuth from "next-auth";
// import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
// import { prisma } from "./prisma";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  // adapter: PrismaAdapter(prisma), // Temporarily disabled due to version compatibility
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (user?.id) {
        token.id = user.id;
      }
      // For Google OAuth, use the Google ID as user ID if no database user
      if (account?.provider === "google" && profile?.sub) {
        token.id = profile.sub;
      }
      // Ensure token always has an id
      if (!token.id && profile?.sub) {
        token.id = profile.sub;
      }
      return token;
    },
    async signIn() {
      // Always allow sign in for now (single-user mode)
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
}); 