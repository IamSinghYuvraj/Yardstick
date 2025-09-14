// app/api/test-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'No auth header',
        details: { authHeader } 
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('Token length:', token.length);

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    console.log('Decoded token:', decoded);

    return NextResponse.json({ 
      success: true, 
      user: decoded,
      message: 'Authentication working correctly' 
    });

  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}