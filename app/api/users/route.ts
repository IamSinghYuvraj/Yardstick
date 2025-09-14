
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { getAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { user } = await getAuth(request);

    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const users = await User.find({ tenant: user.tenant._id });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { user } = await getAuth(request);

    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { email, password, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ success: false, error: 'Email, password, and role are required' }, { status: 400 });
    }

    if (!['Admin', 'Member'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role specified' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      role,
      tenant: user.tenant, // Assign to the inviting admin's tenant
    });

    return NextResponse.json({ success: true, user: { id: newUser._id, email: newUser.email, role: newUser.role, tenant: newUser.tenant } }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
