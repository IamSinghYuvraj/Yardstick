// app/api/notes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Note } from '@/models';
import { requireAuth } from '@/lib/middleware/jwt';
import dbConnect from '@/lib/mongodb';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    
    const authResult = requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    // Tenant isolation: Only find notes within the user's tenant
    const note = await Note.findOne({ _id: params.id, tenant: user.tenantId })
      .populate('author', 'email');

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Additional permission check: Only author or Admin can view
    if (note.author._id.toString() !== user.id && user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error('Get note error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Tenant isolation: Only find notes within the user's tenant
    const note = await Note.findOne({ _id: params.id, tenant: user.tenantId });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Permission check: Only author or Admin can edit
    if (note.author.toString() !== user.id && user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const updatedNote = await Note.findByIdAndUpdate(
      params.id, 
      { title, content }, 
      { new: true }
    ).populate('author', 'email');

    return NextResponse.json({ success: true, note: updatedNote });
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    
    const authResult = requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;

    // Tenant isolation: Only find notes within the user's tenant
    const note = await Note.findOne({ _id: params.id, tenant: user.tenantId });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    // Permission check: Only author or Admin can delete
    if (note.author.toString() !== user.id && user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    await Note.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}