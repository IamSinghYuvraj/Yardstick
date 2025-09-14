import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User, Tenant } from '@/models';
import { verifyAuthToken } from '@/lib/token'; // Assuming verifyAuthToken is for general JWT verification
import { sendUpgradeRequestEmail } from '@/lib/mailer'; // New mailer function

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await dbConnect();

    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAuthToken(token) as { id: string; email: string; role: string; tenantId: string; tenantSlug: string; tenantPlan: string; };

    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    const { tenantId, tenantSlug, email: requestingUserEmail } = decoded;

    if (tenantSlug !== params.slug) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    if (tenant.plan === 'Pro') {
      return NextResponse.json({ success: false, error: 'Tenant is already on Pro plan' }, { status: 400 });
    }

    // Find all Admins for this tenant
    const admins = await User.find({ tenant: tenantId, role: 'Admin' });

    if (admins.length === 0) {
      console.warn(`No admins found for tenant ${tenant.name} to send upgrade request.`);
      return NextResponse.json({ success: true, message: 'Upgrade request received, but no admins found to notify.' });
    }

    const adminEmails = admins.map(admin => admin.email);

    // Send email to admins
    try {
      await sendUpgradeRequestEmail(adminEmails, tenant.name, requestingUserEmail);
      return NextResponse.json({ success: true, message: 'Upgrade request sent to admins.' });
    } catch (emailError) {
      console.error('Error sending upgrade request email:', emailError);
      return NextResponse.json({ success: false, error: 'Failed to send upgrade request email.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Request upgrade error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
