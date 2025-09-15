// lib/middleware/jwt.ts
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  id: string;
  email: string;
  role: 'Admin' | 'Member';
  tenantId: string;
  tenantSlug: string;
  plan: 'Free' | 'Pro';
}

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export function verifyJWT(request: NextRequest): JWTPayload | null {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as JWTPayload;
    
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

export function requireAuth(request: NextRequest) {
  const user = verifyJWT(request);
  
  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }
  
  return { user };
}

export function requireAdmin(request: NextRequest) {
  const authResult = requireAuth(request);
  
  if ('error' in authResult) {
    return authResult;
  }
  
  if (authResult.user.role !== 'Admin') {
    return { error: 'Admin access required', status: 403 };
  }
  
  return { user: authResult.user };
}