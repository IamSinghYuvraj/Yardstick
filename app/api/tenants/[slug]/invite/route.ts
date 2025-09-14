
import { NextRequest, NextResponse } from 'next/server';
import { User, Tenant } from '@/models';
import { getAuth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await dbConnect();
    const { user } = await getAuth(request);

    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await Tenant.findOne({ slug: params.slug });

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    if (tenant._id.toString() !== user.tenant._id.toString()) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 409 });
    }

    // For simplicity, we'll generate a random password.
    // In a real application, you would send an invitation email with a link to set the password.
    const password = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);

    const newUser = await User.create({
      email,
      password,
      role: 'Member',
      tenant: tenant._id,
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
