// app/api/tenants/[slug]/upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Tenant, Note } from '@/models';
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await dbConnect();
    
    // Role-Based Access Control (RBAC): Only Admins can change tenant plans
    const authResult = requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    // Verify the admin is managing their own tenant
    if (user.tenantSlug !== params.slug) {
      return NextResponse.json({ success: false, error: 'You can only manage your own tenant plan' }, { status: 403 });
    }

    const { plan } = await request.json();

    if (!plan || !['Free', 'Pro'].includes(plan)) {
      return NextResponse.json({ success: false, error: 'Invalid plan specified. Must be "Free" or "Pro".' }, { status: 400 });
    }

    // Find the current tenant
    const tenant = await Tenant.findOne({ slug: params.slug });
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    // If downgrading to Free, check if tenant has more than 3 notes
    if (plan === 'Free' && tenant.plan === 'Pro') {
      const noteCount = await Note.countDocuments({ tenant: tenant._id });
      if (noteCount > 3) {
        return NextResponse.json({ 
          success: false, 
          error: `Cannot downgrade to Free plan. You currently have ${noteCount} notes. Please delete notes to have 3 or fewer before downgrading.` 
        }, { status: 400 });
      }
    }

    // Set note limits based on plan
    let newMaxNotes = 3; // Default for Free plan
    if (plan === 'Pro') {
      newMaxNotes = 1000000; // Simulate unlimited notes for Pro plan
    }

    // Update tenant plan
    const updatedTenant = await Tenant.findOneAndUpdate(
      { slug: params.slug },
      { 
        plan: plan,
        maxNotes: newMaxNotes
      },
      { new: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: `Tenant plan successfully changed to ${plan}`,
      tenant: {
        _id: updatedTenant._id,
        name: updatedTenant.name,
        slug: updatedTenant.slug,
        plan: updatedTenant.plan,
        maxNotes: updatedTenant.maxNotes
      }
    });
  } catch (error) {
    console.error('Change tenant plan error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}