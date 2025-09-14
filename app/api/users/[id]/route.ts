
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';
import { getAuth } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { user: adminUser } = await getAuth(request);

    // 1. Ensure the user is an Admin
    if (!adminUser || adminUser.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userIdToUpdate } = params;
    const { role: newRole } = await request.json();

    if (!newRole || !['Admin', 'Member'].includes(newRole)) {
      return NextResponse.json({ success: false, error: 'Invalid role specified' }, { status: 400 });
    }

    // Find the user to update
    const userToUpdate = await User.findById(userIdToUpdate);

    if (!userToUpdate) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // 2. Ensure the admin is updating a user within their own tenant
    if (userToUpdate.tenant.toString() !== adminUser.tenant._id.toString()) {
      return NextResponse.json({ success: false, error: 'Permission denied. User is not in your tenant.' }, { status: 403 });
    }

    // Update the role
    userToUpdate.role = newRole;
    await userToUpdate.save();

    return NextResponse.json({ success: true, user: userToUpdate });

  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
