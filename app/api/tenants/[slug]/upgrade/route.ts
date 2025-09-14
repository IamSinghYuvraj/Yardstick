import { NextRequest, NextResponse } from 'next/server';
import { Tenant } from '@/models';
import { getAuth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await dbConnect();
    const { user } = await getAuth(request);

    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await Tenant.findOne({ slug: params.slug });

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    if (tenant._id.toString() !== user.tenant._id.toString()) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    tenant.plan = 'Pro';
    tenant.maxNotes = 1000000; // A large number to simulate unlimited notes
    await tenant.save();

    return NextResponse.json({ success: true, tenant });
  } catch (error) {
    console.error('Upgrade tenant error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}