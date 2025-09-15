// app/api/tenants/[slug]/users/[userId]/role/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models';
import { requireAdmin } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

// Update user role (Admin only)
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

    const { role } = await request.json();

    if (!role || !['Admin', 'Member'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role specified. Must be "Admin" or "Member".' }, { status: 400 });
    }

    // Find the user to update
    const userToUpdate = await User.findOne({ 
      _id: params.userId, 
      tenant: adminUser.tenantId 
    });

    if (!userToUpdate) {
      return NextResponse.json({ success: false, error: 'User not found in this tenant' }, { status: 404 });
    }

    // Prevent admin from changing their own role
    if (userToUpdate._id.toString() === adminUser.id) {
      return NextResponse.json({ success: false, error: 'Cannot change your own role.' }, { status: 403 });
    }

    // If demoting an Admin to Member, ensure it's not the last admin
    if (userToUpdate.role === 'Admin' && role === 'Member') {
      const adminCount = await User.countDocuments({ 
        tenant: adminUser.tenantId, 
        role: 'Admin' 
      });
      
      if (adminCount <= 1) {
        return NextResponse.json({ 
          success: false, 
          error: 'Cannot demote the last admin. Promote another user to admin first.' 
        }, { status: 400 });
      }
    }

    // Update the user's role
    userToUpdate.role = role;
    await userToUpdate.save();

    return NextResponse.json({ 
      success: true, 
      user: {
        id: userToUpdate._id.toString(),
        email: userToUpdate.email,
        role: userToUpdate.role,
        updatedAt: userToUpdate.updatedAt
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// Delete user from tenant (Admin only)
export async function DELETE(request: NextRequest, { params }: { params: { slug: string; userId: string } }) {
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

    // Find the user to delete
    const userToDelete = await User.findOne({ 
      _id: params.userId, 
      tenant: adminUser.tenantId 
    });

    if (!userToDelete) {
      return NextResponse.json({ success: false, error: 'User not found in this tenant' }, { status: 404 });
    }

    // Prevent admin from deleting themselves if they're the only admin
    if (userToDelete._id.toString() === adminUser.id) {
      const adminCount = await User.countDocuments({ 
        tenant: adminUser.tenantId, 
        role: 'Admin' 
      });
      
      if (adminCount <= 1) {
        return NextResponse.json({ 
          success: false, 
          error: 'Cannot delete the last admin. Promote another user to admin first.' 
        }, { status: 400 });
      }
    }

    // Delete the user
    await User.findByIdAndDelete(params.userId);

    return NextResponse.json({ success: true, message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}