// app/api/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Note } from '@/models';
import { requireAuth } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // JWT Middleware: Verify token and get user info
    const authResult = requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    // Tenant Isolation: Only get notes for this tenant
    let query: any = { tenant: user.tenantId };

    // If the user is an Admin, they can only see notes from other users in their tenant
    if (user.role === 'Admin') {
      query.author = { $ne: user.id }; // Exclude notes authored by the admin themselves
    }

    const notes = await Note.find(query)
      .populate('author', 'email')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // JWT Middleware: Verify token and get user info
    const authResult = requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    // Admins cannot create notes
    if (user.role === 'Admin') {
      return NextResponse.json({ success: false, error: 'Admins are not allowed to create notes.' }, { status: 403 });
    }

    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 });
    }

    // Role and Gating Enforcement: Check tenant plan and note limits
    if (user.tenantPlan === 'Free') {
      const noteCount = await Note.countDocuments({ tenant: user.tenantId });
      if (noteCount >= 3) {
        return NextResponse.json(
          { success: false, error: 'Note limit reached. Upgrade to Pro for unlimited notes.' },
          { status: 403 }
        );
      }
    }

    // Create note with tenant association
    const newNote = await Note.create({
      title,
      content,
      tenant: user.tenantId,
      author: user.id,
    });

    // Populate author info for response
    await newNote.populate('author', 'name email');

    return NextResponse.json({ success: true, note: newNote });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}