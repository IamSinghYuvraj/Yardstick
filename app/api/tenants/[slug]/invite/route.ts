// app/api/tenants/[slug]/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { User, Tenant, Invite } from '@/models'; // Import Invite model
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';
import { sendInvitationEmail } from '@/lib/mailer';
import crypto from 'crypto'; // Import crypto for token generation

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
    if (adminUser.tenantSlug !== params.slug) { // Access tenant slug directly from adminUser
      return NextResponse.json({ success: false, error: 'You can only invite users to your own tenant' }, { status: 403 });
    }

    const { email } = await request.json(); // Role is now fixed to 'Member'

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const role = 'Member'; // Force role to 'Member'

    // Find the tenant
    const tenant = await Tenant.findOne({ slug: params.slug });
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    // Check if user already exists with this email in ANY tenant
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 409 });
    }

    // Check if an active invite already exists for this email and tenant
    const existingInvite = await Invite.findOne({ email, tenant: tenant._id, status: 'Pending' });
    if (existingInvite) {
      return NextResponse.json({ success: false, error: 'An active invitation already exists for this user and tenant' }, { status: 409 });
    }

    // Generate a unique invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Save the invitation to the database
    const newInvite = await Invite.create({
      email,
      tenant: tenant._id,
      token: invitationToken,
      expires,
      status: 'Pending',
    });

    // Create invitation link
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/signup?inviteToken=${invitationToken}`; // Use inviteToken

    // Send invitation email
    try {
      await sendInvitationEmail(email, invitationLink, tenant.name, role);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return NextResponse.json({ success: false, error: 'Failed to send invitation email' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Invitation sent to ${email}`,
      inviteLink: process.env.NODE_ENV === 'development' ? invitationLink : undefined // For development/testing
    });

  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
