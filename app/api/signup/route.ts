import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { User, Invite, Tenant } from '@/models'; // Import Invite and Tenant models

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { inviteToken, email, password } = await request.json(); // Expect inviteToken, email, password

    if (!inviteToken || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Invitation token, email, and password are required' },
        { status: 400 }
      );
    }

    // Find and validate the invitation
    const invitation = await Invite.findOne({ token: inviteToken, email, status: 'Pending' });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid, expired, or already used invitation token' },
        { status: 400 }
      );
    }

    if (invitation.expires < new Date()) {
      invitation.status = 'Expired'; // Mark as expired
      await invitation.save();
      return NextResponse.json(
        { success: false, error: 'Invitation token has expired' },
        { status: 400 }
      );
    }

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user using details from the invitation
    const newUser = await User.create({
      email,
      password: hashedPassword,
      role: invitation.role, // Use role from invitation
      tenant: invitation.tenant, // Use tenant from invitation
    });

    // Mark the invitation as accepted
    invitation.status = 'Accepted';
    await invitation.save();

    // Fetch tenant details for the login payload
    const tenant = await Tenant.findById(invitation.tenant);
    if (!tenant) {
      // This should ideally not happen if invitation.tenant is valid
      return NextResponse.json(
        { success: false, error: 'Tenant not found for invitation' },
        { status: 500 }
      );
    }

    // Generate a login token for the new user
    const loginPayload = {
      id: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
      tenantId: newUser.tenant.toString(),
      tenantSlug: tenant.slug,
      tenantPlan: tenant.plan
    };

    const loginToken = jwt.sign(loginPayload, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: '7d'
    });

    return NextResponse.json({ success: true, message: 'User created successfully', token: loginToken });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}