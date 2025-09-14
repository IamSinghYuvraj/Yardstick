
import { NextRequest, NextResponse } from 'next/server';
import { Note } from '@/models';
import { getAuth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { user } = await getAuth(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const note = await Note.findOne({ _id: params.id, tenant: user.tenant });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    if (note.author.toString() !== user._id.toString() && user.role !== 'Admin') {
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
    const { user } = await getAuth(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 });
    }

    const note = await Note.findOne({ _id: params.id, tenant: user.tenant });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    if (note.author.toString() !== user._id.toString() && user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const updatedNote = await Note.findByIdAndUpdate(params.id, { title, content }, { new: true });

    return NextResponse.json({ success: true, note: updatedNote });
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { user } = await getAuth(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const note = await Note.findOne({ _id: params.id, tenant: user.tenant });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    if (note.author.toString() !== user._id.toString() && user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    await Note.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
