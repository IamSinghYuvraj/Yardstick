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
    title: 'Welcome to Acme Corporation',
    content: 'This is your first note in the Acme Corporation tenant. You can create, edit, and delete notes here. As a Free plan user, you can create up to 3 notes.',
    userId: '1',
    tenantId: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Q1 Planning Meeting',
    content: 'Discussed quarterly goals and upcoming projects. Key action items: 1) Finalize budget allocation, 2) Review team capacity, 3) Set milestone dates.',
    userId: '2',
    tenantId: '1',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    title: 'Product Innovation Ideas',
    content: 'Brainstorming session results: 1. AI-powered analytics dashboard, 2. Mobile app development, 3. API marketplace integration, 4. Advanced reporting features.',
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

export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Filter notes by tenant
    const tenantNotes = notes.filter(note => note.tenantId === user.tenantId);
    
    return NextResponse.json({
      success: true,
      notes: tenantNotes
    });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' }, 
        { status: 400 }
      );
    }

    // Check note limit for Free plan
    const tenantNotes = notes.filter(note => note.tenantId === user.tenantId);
    const tenant = user.tenantId === '1' ? { plan: 'Free', maxNotes: 3 } : { plan: 'Pro', maxNotes: -1 };
    
    if (tenant.plan === 'Free' && tenantNotes.length >= tenant.maxNotes) {
      return NextResponse.json(
        { success: false, error: 'Note limit reached. Upgrade to Pro for unlimited notes.' }, 
        { status: 403 }
      );
    }

    const newNote: Note = {
      id: Date.now().toString(),
      title,
      content,
      userId: user.userId,
      tenantId: user.tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notes.push(newNote);

    return NextResponse.json({
      success: true,
      note: newNote
    });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' }, 
      { status: 500 }
    );
  }
}