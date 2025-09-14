
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { User } from '../models';

export async function getAuth(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return { user: null };
  }

  const user = await User.findById(token.id).populate('tenant');

  return { user };
}
