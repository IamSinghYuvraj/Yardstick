import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Note } from '@/models';
import { verifyAuthToken } from '@/lib/token';
import { JwtPayload } from 'jsonwebtoken';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();

  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAuthToken(token);
    if (!decoded || typeof decoded === 'string') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }
    if (decoded.id !== params.id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const notesCount = await Note.countDocuments({ author: params.id });

    return NextResponse.json({ success: true, notesCount });
  } catch (error) {
    console.error('Error fetching notes count:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
