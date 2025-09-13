import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JWTPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  userId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage for demo (use database in production)
let notes: Note[] = [
  {
    id: '1',
    title: 'Welcome to Acme Corp',
    content: 'This is your first note in the Acme Corp tenant. You can create, edit, and delete notes here.',
    userId: '1',
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Meeting Notes',
    content: 'Discussed quarterly goals and upcoming projects. Need to follow up on budget allocation.',
    userId: '2',
    tenantId: '1',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    title: 'Globex Project Ideas',
    content: 'Brainstorming session results: 1. New product line, 2. Market expansion, 3. Technology upgrades.',
    userId: '3',
    tenantId: '2',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString()
  }
];

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const noteId = params.id;
    const noteIndex = notes.findIndex(note => 
      note.id === noteId && note.tenantId === user.tenantId
    );

    if (noteIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Note not found' }, 
        { status: 404 }
      );
    }

    // Check if user can delete this note (own note or admin)
    const note = notes[noteIndex];
    if (note.userId !== user.userId && user.role !== 'Admin') {
      return NextResponse.json(
        { success: false, error: 'Permission denied' }, 
        { status: 403 }
      );
    }

    notes.splice(noteIndex, 1);

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' }, 
      { status: 500 }
    );
  }
}