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

    // Find the user to update
    const userToUpdate = await User.findOne({ 
      _id: params.userId, 
      tenant: adminUser.tenantId 
    });

    if (!userToUpdate) {
      return NextResponse.json({ success: false, error: 'User not found in this tenant' }, { status: 404 });
    }

    // Update the user's plan
    userToUpdate.tenant.plan = plan;
    await userToUpdate.save();

    return NextResponse.json({ 
      success: true, 
      user: {
        id: userToUpdate._id.toString(),
        email: userToUpdate.email,
        role: userToUpdate.role,
        plan: userToUpdate.tenant.plan,
        updatedAt: userToUpdate.updatedAt
      }
    });

  } catch (error) {
    console.error('Update user plan error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
