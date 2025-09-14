// app/api/tenants/[slug]/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { User, Tenant, Invite } from '@/models';
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';
import crypto from 'crypto';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await dbConnect();
    
    // Role-Based Access Control: Only Admins can invite users
    const authResult = requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user: adminUser } = authResult;
    
    // Verify admin is inviting to their own tenant
    if (adminUser.tenantSlug !== params.slug) {
      return NextResponse.json({ success: false, error: 'You can only invite users to your own tenant' }, { status: 403 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Please provide a valid email address' }, { status: 400 });
    }

    // Find the tenant
    const tenant = await Tenant.findOne({ slug: params.slug });
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    // Check if user already exists with this email in ANY tenant
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'A user with this email address already exists in the system' 
      }, { status: 409 });
    }

    // Check if an active invite already exists for this email and tenant
    const existingInvite = await Invite.findOne({ 
      email: email.toLowerCase(), 
      tenant: tenant._id, 
      status: 'Pending',
      expires: { $gt: new Date() } 
    });

    if (existingInvite) {
      return NextResponse.json({ 
        success: false, 
        error: 'An active invitation already exists for this email address' 
      }, { status: 409 });
    }

    // Clean up expired invites for this email/tenant combination
    await Invite.deleteMany({
      email: email.toLowerCase(),
      tenant: tenant._id,
      $or: [
        { status: 'Expired' },
        { expires: { $lt: new Date() } }
      ]
    });

    // Generate a unique invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Save the invitation to the database
    const newInvite = await Invite.create({
      email: email.toLowerCase(),
      tenant: tenant._id,
      token: invitationToken,
      expires,
      status: 'Pending',
    });

    // Create invitation link
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/signup?inviteToken=${invitationToken}`;

    return NextResponse.json({ 
      success: true, 
      message: `Invitation link created successfully for ${email}`,
      inviteLink: invitationLink,
      expiresAt: expires.toISOString(),
      tenantName: tenant.name
    });

  } catch (error) {
    console.error('Create invite error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'An unexpected error occurred while creating the invitation' 
    }, { status: 500 });
  }
}

// GET endpoint to retrieve pending invitations
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await dbConnect();
    
    const authResult = requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user: adminUser } = authResult;
    
    if (adminUser.tenantSlug !== params.slug) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const tenant = await Tenant.findOne({ slug: params.slug });
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    // Get all pending invites for this tenant
    const invites = await Invite.find({ 
      tenant: tenant._id, 
      status: 'Pending',
      expires: { $gt: new Date() } 
    }).sort({ createdAt: -1 });

    return NextResponse.json({ 
      success: true, 
      invites: invites.map(invite => ({
        id: invite._id,
        email: invite.email,
        token: invite.token,
        expires: invite.expires,
        createdAt: invite.createdAt,
        status: invite.status
      })),
      tenantName: tenant.name
    });

  } catch (error) {
    console.error('Get invites error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}