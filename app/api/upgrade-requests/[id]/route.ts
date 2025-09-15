// app/api/upgrade-requests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UpgradeRequest } from '@/models';
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    
    const authResult = requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { status } = await request.json();

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status specified.' }, { status: 400 });
    }

    const updatedRequest = await UpgradeRequest.findByIdAndUpdate(
      params.id,
      { $set: { status: status } },
      { new: true }
    );

    if (!updatedRequest) {
      return NextResponse.json({ success: false, error: 'Upgrade request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: updatedRequest });

  } catch (error) {
    console.error('Update upgrade request error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
