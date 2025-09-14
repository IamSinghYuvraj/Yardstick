
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import clientPromise from '@/lib/mongodb';
import { User } from '@/lib/models';
import mongoose from 'mongoose';

async function connectToDatabase() {
    const client = await clientPromise;
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI!)
    }
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        await connectToDatabase();

        const user = await User.findOne({ email: credentials.email }).select('+password').populate('tenant');

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          tenant: user.tenant,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenant = user.tenant;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.tenant = token.tenant;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
