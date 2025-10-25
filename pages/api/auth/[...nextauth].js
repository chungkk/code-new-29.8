import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { User } from '../../../lib/models/User';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log('🔍 Attempting login for:', credentials.email);
          const user = await User.findByEmail(credentials.email);
          
          if (!user) {
            console.log('❌ User not found:', credentials.email);
            throw new Error('Email hoặc mật khẩu không đúng');
          }

          console.log('✅ User found:', user.email);
          const isValid = await User.verifyPassword(credentials.password, user.password);
          
          if (!isValid) {
            console.log('❌ Invalid password for:', credentials.email);
            throw new Error('Email hoặc mật khẩu không đúng');
          }

          console.log('✅ Login successful for:', user.email, 'Role:', user.role);
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role
          };
        } catch (error) {
          console.error('❌ Login error:', error.message);
          throw new Error(error.message);
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
