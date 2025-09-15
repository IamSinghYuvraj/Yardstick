// app/api/tenants/[slug]/upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Tenant, User } from '@/models';
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await dbConnect();
    
    // Role-Based Access Control (RBAC): Only Admins can upgrade tenant plans
    const authResult = requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    // Verify the admin is managing their own tenant
    if (user.tenantSlug !== params.slug) {
      return NextResponse.json({ success: false, error: 'You can only upgrade your own tenant' }, { status: 403 });
    }

    // Update tenant plan to "Pro"
    const tenant = await Tenant.findOne({ slug: params.slug });
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    // Update all users in the tenant to Pro plan
    await User.updateMany(
      { tenant: user.tenantId },
      { $set: { plan: 'Pro' } }
    );

    const updatedTenant = await Tenant.findOneAndUpdate(
      { slug: params.slug },
      { 
        plan: 'Pro',
      },
      { new: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: `Tenant plan successfully upgraded to Pro`,
      tenant: {
        _id: updatedTenant._id.toString(),
        name: updatedTenant.name,
        slug: updatedTenant.slug,
        plan: updatedTenant.plan,
      }
    });
  } catch (error) {
    console.error('Upgrade tenant plan error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
