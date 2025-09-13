import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JWTPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
}

function verifyToken(request: NextRequest): JWTPayload | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const tenantSlug = params.slug;

    // Check if user has permission to upgrade (Admin only)
    if (user.role !== 'Admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can upgrade tenant plans' }, 
        { status: 403 }
      );
    }

    // Validate tenant slug
    if (!['acme', 'globex'].includes(tenantSlug)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tenant' }, 
        { status: 404 }
      );
    }

    // Check if tenant belongs to user
    const userTenantSlug = user.tenantId === '1' ? 'acme' : 'globex';
    if (tenantSlug !== userTenantSlug) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' }, 
        { status: 403 }
      );
    }

    // Simulate upgrade process
    // In a real application, this would:
    // 1. Process payment
    // 2. Update database
    // 3. Send confirmation email
    // 4. Update user session/token

    console.log(`Upgrading tenant ${tenantSlug} to Pro plan`);

    return NextResponse.json({
      success: true,
      message: 'Tenant upgraded to Pro plan successfully'
    });
  } catch (error) {
    console.error('Upgrade tenant error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' }, 
      { status: 500 }
    );
  }
}