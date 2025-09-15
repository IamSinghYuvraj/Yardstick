// app/api/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Note } from '@/models';
import { requireAuth } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

// GET all notes for the authenticated user's tenant
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const authResult = requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    // Tenant isolation: Only retrieve notes from the user's tenant
    let query: any = { tenant: user.tenantId };

    // If the user is not an Admin, restrict notes to their own
    if (user.role !== 'Admin') {
      query.author = user.id;
    }

    const notes = await Note.find(query)
      .populate('author', 'email name')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// POST - Create a new note
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const authResult = requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 });
    }

    // Check note limits for Free plan
    if (user.plan === 'Free') {
      const noteCount = await Note.countDocuments({ author: user.id });
      if (noteCount >= 3) { // Assuming max 3 notes for free plan
        return NextResponse.json({ 
          success: false, 
          error: `You have reached the limit of 3 notes for the Free plan. Please upgrade to Pro for unlimited notes.` 
        }, { status: 403 });
      }
    }

    const note = await Note.create({
      title,
      content,
      tenant: user.tenantId,
      author: user.id,
    });

    // Populate the author field before returning
    const populatedNote = await Note.findById(note._id).populate('author', 'email name');

    return NextResponse.json({ success: true, note: populatedNote }, { status: 201 });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
