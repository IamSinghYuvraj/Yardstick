// app/api/tenants/[slug]/upgrade-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UpgradeRequest } from '@/models';
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

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

    const requests = await UpgradeRequest.find({ tenant: adminUser.tenantId, status: 'pending' })
      .populate('user', 'email name');

    return NextResponse.json({ success: true, requests });

  } catch (error) {
    console.error('Get upgrade requests error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
