import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, action } = await request.json();

    if (action === 'login') {
      const user = AuthService.login(email, password);
      if (user) {
        return NextResponse.json({ success: true, user });
      } else {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
      }
    }

    if (action === 'logout') {
      AuthService.logout();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}