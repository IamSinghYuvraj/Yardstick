// app/api/invites/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Invite } from '@/models';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { inviteToken } = await request.json();

    if (!inviteToken) {
      return NextResponse.json(
        { success: false, error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await Invite.findOne({ 
      token: inviteToken, 
      status: 'Pending' 
    }).populate('tenant', 'name slug plan');

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation link' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (invitation.expires < new Date()) {
      invitation.status = 'Expired';
      await invitation.save();
      return NextResponse.json(
        { success: false, error: 'This invitation link has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      invite: {
        email: invitation.email,
        tenantName: invitation.tenant.name,
        expiresAt: invitation.expires.toISOString()
      }
    });

  } catch (error) {
    console.error('Validate invite error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}