// app/api/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import { User, Invite, Tenant } from '@/models';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { inviteToken, email, password } = await request.json();

    if (!inviteToken || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Invitation token, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Find and validate the invitation
    const invitation = await Invite.findOne({ 
      token: inviteToken, 
      email: email.toLowerCase(), 
      status: 'Pending' 
    }).populate('tenant');

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation link. Please check your invitation or request a new one.' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (invitation.expires < new Date()) {
      invitation.status = 'Expired';
      await invitation.save();
      return NextResponse.json(
        { success: false, error: 'This invitation link has expired. Please request a new invitation.' },
        { status: 400 }
      );
    }

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email address already exists' },
        { status: 409 }
      );
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the new user
    const newUser = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'Member', // All invited users are members by default
      tenant: invitation.tenant._id,
    });

    // Mark the invitation as accepted
    invitation.status = 'Accepted';
    await invitation.save();

    // Populate the tenant information for the response
    const tenant = invitation.tenant as any;

    // Generate a login token for the new user
    const loginPayload = {
      id: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
      tenantId: newUser.tenant.toString(),
      tenantSlug: tenant.slug,
      plan: newUser.plan
    };

    const loginToken = jwt.sign(loginPayload, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: '7d'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Account created successfully! You are now logged in.',
      token: loginToken,
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        role: newUser.role,
        plan: newUser.plan,
        tenant: {
          _id: tenant._id.toString(),
          name: tenant.name,
          slug: tenant.slug,
        }
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while creating your account' },
      { status: 500 }
    );
  }
}