// app/api/tenants/[slug]/invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { User, Tenant, Invite } from '@/models';
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';
import crypto from 'crypto';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  console.log('🚀 Invite API called with slug:', params.slug);
  
  try {
    // Connect to database first
    console.log('📡 Connecting to database...');
    await dbConnect();
    console.log('✅ Database connected');

    // Check authentication
    console.log('🔐 Checking authentication...');
    const authResult = requireAdmin(request);
    if ('error' in authResult) {
      console.log('❌ Auth failed:', authResult.error);
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    console.log('✅ User authenticated:', user.email, 'Role:', user.role);
    
    // Verify admin is inviting to their own tenant
    if (user.tenantSlug !== params.slug) {
      console.log('❌ Tenant slug mismatch:', user.tenantSlug, 'vs', params.slug);
      return NextResponse.json({ success: false, error: 'You can only invite users to your own organization' }, { status: 403 });
    }

    // Parse request body
    console.log('📝 Parsing request body...');
    const body = await request.json();
    const { email } = body;
    console.log('📧 Email from request:', email);

    if (!email) {
      console.log('❌ No email provided');
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return NextResponse.json({ success: false, error: 'Please provide a valid email address' }, { status: 400 });
    }

    // Find the tenant
    console.log('🏢 Finding tenant with slug:', params.slug);
    const tenant = await Tenant.findOne({ slug: params.slug });
    if (!tenant) {
      console.log('❌ Tenant not found:', params.slug);
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }
    console.log('✅ Tenant found:', tenant.name);

    // Check if user already exists with this email in ANY tenant
    console.log('👤 Checking if user exists with email:', email.toLowerCase());
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('❌ User already exists:', existingUser.email);
      return NextResponse.json({ 
        success: false, 
        error: 'A user with this email address already exists in the system' 
      }, { status: 409 });
    }

    // Check if an active invite already exists for this email and tenant
    console.log('📬 Checking for existing invitations...');
    const existingInvite = await Invite.findOne({ 
      email: email.toLowerCase(), 
      tenant: tenant._id, 
      status: 'Pending',
      expires: { $gt: new Date() } 
    });

    if (existingInvite) {
      console.log('❌ Active invitation already exists');
      return NextResponse.json({ 
        success: false, 
        error: 'An active invitation already exists for this email address' 
      }, { status: 409 });
    }

    // Clean up expired invites for this email/tenant combination
    console.log('🧹 Cleaning up expired invitations...');
    const cleanupResult = await Invite.deleteMany({
      email: email.toLowerCase(),
      tenant: tenant._id,
      $or: [
        { status: 'Expired' },
        { expires: { $lt: new Date() } }
      ]
    });
    console.log('🗑️ Cleaned up', cleanupResult.deletedCount, 'expired invitations');

    // Generate a unique invitation token
    console.log('🎲 Generating invitation token...');
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Save the invitation to the database
    console.log('💾 Saving invitation to database...');
    const newInvite = await Invite.create({
      email: email.toLowerCase(),
      tenant: tenant._id,
      token: invitationToken,
      expires,
      status: 'Pending',
    });
    console.log('✅ Invitation saved:', newInvite._id);

    // Create invitation link
    // Use NEXT_PUBLIC_APP_BASE_URL from .env.local for the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/signup?inviteToken=${invitationToken}`;
    console.log('🔗 Generated invitation link:', invitationLink);

    return NextResponse.json({ 
      success: true, 
      message: `Invitation link created successfully for ${email}`,
      inviteLink: invitationLink,
      expiresAt: expires.toISOString(),
      tenantName: tenant.name
    });

  } catch (error) {
    console.error('💥 Create invite error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'An unexpected error occurred while creating the invitation. Please try again.' 
    }, { status: 500 });
  }
}

// GET endpoint to retrieve pending invitations
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  console.log('📋 GET invites called for slug:', params.slug);
  
  try {
    await dbConnect();
    
    const authResult = requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    
    if (user.tenantSlug !== params.slug) {
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

    console.log('📨 Found', invites.length, 'pending invitations');

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