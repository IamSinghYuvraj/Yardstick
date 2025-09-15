// app/api/tenants/[slug]/users/[userId]/plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models';
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

export async function PATCH(request: NextRequest, { params }: { params: { slug: string; userId: string } }) {
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

    const { plan } = await request.json();

    if (!plan || !['Free', 'Pro'].includes(plan)) {
      return NextResponse.json({ success: false, error: 'Invalid plan specified. Must be "Free" or "Pro".' }, { status: 400 });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: params.userId, tenant: adminUser.tenantId },
      { $set: { plan: plan } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: 'User not found in this tenant' }, { status: 404 });
    }

    // If the user being updated is the current admin, update their token
    let updatedToken = null;
    if (updatedUser._id.toString() === adminUser.id) {
      const jwt = require('jsonwebtoken');
      const newPayload = {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        tenantId: adminUser.tenantId,
        tenantSlug: adminUser.tenantSlug,
        plan: plan
      };
      updatedToken = jwt.sign(newPayload, process.env.JWT_SECRET || 'fallback-secret', {
        expiresIn: '7d'
      });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        role: updatedUser.role,
        plan: updatedUser.plan,
        updatedAt: updatedUser.updatedAt
      },
      ...(updatedToken && { token: updatedToken })
    });

  } catch (error) {
    console.error('Update user plan error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}