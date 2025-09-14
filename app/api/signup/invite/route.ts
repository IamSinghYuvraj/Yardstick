import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyInvitationToken } from '@/lib/token';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ message: 'Token and password are required' }, { status: 400 });
  }

  const decodedToken = verifyInvitationToken(token) as { email: string; tenantId: string; role: string };

  if (!decodedToken) {
    return NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 });
  }

  const { email, tenantId, role } = decodedToken;

  try {
    const existingUser = await db.user.findFirst({
      where: {
        email,
        tenantId,
      },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'User already exists in this tenant' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        email,
        password: hashedPassword,
        tenantId,
        role,
      },
    });

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
