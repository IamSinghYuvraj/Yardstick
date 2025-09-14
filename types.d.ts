// types.d.ts
// Remove NextAuth type extensions - no longer needed

export interface UserDocument {
  _id: string;
  email: string;
  password?: string;
  name?: string;
  role: 'Admin' | 'Member';
  tenant: {
    _id: string;
    name: string;
    slug: string;
    plan: 'Free' | 'Pro';
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: 'Admin' | 'Member';
  tenantId: string;
  tenantSlug: string;
  tenantPlan: 'Free' | 'Pro';
}