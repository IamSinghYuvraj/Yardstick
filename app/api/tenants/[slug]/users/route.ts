// app/api/tenants/[slug]/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models';
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

// Get all users in the tenant (Admin only)
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

    // Get all users in the tenant
    const users = await User.find({ tenant: adminUser.tenantId })
      .select('-password') // Exclude password field
      .populate('tenant', 'name slug plan')
      .sort({ createdAt: -1 });

    return NextResponse.json({ 
      success: true, 
      users: users.map(user => ({
        id: user._id.toString(),
        email: user.email,
        
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        tenant: user.tenant
      }))
    });

  } catch (error) {
    console.error('Get tenant users error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}