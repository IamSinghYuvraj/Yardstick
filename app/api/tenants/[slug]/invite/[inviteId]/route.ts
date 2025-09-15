// app/api/tenants/[slug]/invite/[inviteId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Invite, Tenant } from '@/models';
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

export async function DELETE(request: NextRequest, { params }: { params: { slug: string; inviteId: string } }) {
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

    // Find and delete the invitation
    const invitation = await Invite.findOneAndDelete({
      _id: params.inviteId,
      tenant: tenant._id
    });

    if (!invitation) {
      return NextResponse.json({ success: false, error: 'Invitation not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Invitation for ${invitation.email} has been revoked successfully` 
    });

  } catch (error) {
    console.error('Revoke invite error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}