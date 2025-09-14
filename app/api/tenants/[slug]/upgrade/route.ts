// app/api/tenants/[slug]/upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Tenant } from '@/models';
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await dbConnect();
    
    // Role-Based Access Control (RBAC): Only Admins can upgrade
    const authResult = requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    // Verify the admin is upgrading their own tenant
    if (user.tenantSlug !== params.slug) {
      return NextResponse.json({ success: false, error: 'You can only upgrade your own tenant' }, { status: 403 });
    }

    const { plan } = await request.json();

    if (!plan || !['Free', 'Pro'].includes(plan)) {
      return NextResponse.json({ success: false, error: 'Invalid plan specified. Must be "Free" or "Pro".' }, { status: 400 });
    }

    let newMaxNotes = 3; // Default for Free plan
    if (plan === 'Pro') {
      newMaxNotes = 1000000; // Simulate unlimited notes for Pro plan
    }

    // Database Update: Change tenant plan
    const tenant = await Tenant.findOneAndUpdate(
      { slug: params.slug },
      { 
        plan: plan,
        maxNotes: newMaxNotes
      },
      { new: true }
    );

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      tenant: {
        _id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        maxNotes: tenant.maxNotes
      }
    });
  } catch (error) {
    console.error('Upgrade tenant error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}