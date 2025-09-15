// app/api/users/request-upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UpgradeRequest } from '@/models';
import { requireAuth } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const authResult = requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    // Check if user already has a pending request
    const existingRequest = await UpgradeRequest.findOne({ user: user.id, status: 'pending' });
    if (existingRequest) {
      return NextResponse.json({ success: false, error: 'You already have a pending upgrade request.' }, { status: 400 });
    }

    // Create a new upgrade request
    await UpgradeRequest.create({
      user: user.id,
      tenant: user.tenantId,
    });

    return NextResponse.json({ success: true, message: 'Upgrade request sent successfully.' });

  } catch (error) {
    console.error('Request upgrade error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
