
import { NextRequest, NextResponse } from 'next/server';
import { Note, Tenant } from '@/models';
import { getAuth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { user } = await getAuth(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const notes = await Note.find({ tenant: user.tenant });

    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { user } = await getAuth(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await Tenant.findById(user.tenant);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    if (tenant.plan === 'Free') {
      const noteCount = await Note.countDocuments({ tenant: user.tenant });
      if (noteCount >= 3) {
        return NextResponse.json(
          { success: false, error: 'Note limit reached. Upgrade to Pro for unlimited notes.' },
          { status: 403 }
        );
      }
    }

    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 });
    }

    const newNote = await Note.create({
      title,
      content,
      tenant: user.tenant,
      author: user._id,
    });

    return NextResponse.json({ success: true, note: newNote });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
