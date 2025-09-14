# Backend Implementation Templates

This file provides templates and guidelines for implementing the backend API endpoints required by the assignment.

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Member')),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tenants Table
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'Free' CHECK (plan IN ('Free', 'Pro')),
  max_notes INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Notes Table
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Users can only see users from their tenant
CREATE POLICY tenant_isolation_users ON users
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Notes are isolated by tenant
CREATE POLICY tenant_isolation_notes ON notes
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Tenants can only see their own data
CREATE POLICY tenant_isolation_tenants ON tenants
  FOR ALL USING (id = current_setting('app.current_tenant_id')::UUID);
```

## API Endpoint Templates

### Authentication Middleware
```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user.role !== role) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}
```

### Notes API Implementation
```typescript
// api/notes/route.ts
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Set tenant context for RLS
    await db.query('SET app.current_tenant_id = $1', [user.tenantId]);
    
    const notes = await db.query(`
      SELECT id, title, content, user_id, tenant_id, created_at, updated_at
      FROM notes
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `, [user.tenantId]);

    return NextResponse.json({
      success: true,
      data: notes.rows
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { title, content } = await request.json();

    // Check subscription limits
    const tenant = await db.query('SELECT plan, max_notes FROM tenants WHERE id = $1', [user.tenantId]);
    if (tenant.rows[0].plan === 'Free') {
      const noteCount = await db.query('SELECT COUNT(*) FROM notes WHERE tenant_id = $1', [user.tenantId]);
      if (parseInt(noteCount.rows[0].count) >= tenant.rows[0].max_notes) {
        return NextResponse.json({ 
          success: false, 
          error: 'Note limit reached. Upgrade to Pro for unlimited notes.' 
        }, { status: 403 });
      }
    }

    const result = await db.query(`
      INSERT INTO notes (title, content, user_id, tenant_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [title, content, user.id, user.tenantId]);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
```

### Tenant Upgrade Implementation
```typescript
// api/tenants/[slug]/upgrade/route.ts
export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const user = verifyToken(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { slug } = params;
    
    // Verify tenant ownership
    const tenant = await db.query('SELECT * FROM tenants WHERE slug = $1 AND id = $2', [slug, user.tenantId]);
    if (tenant.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    // Upgrade tenant
    await db.query(`
      UPDATE tenants 
      SET plan = 'Pro', max_notes = -1, updated_at = NOW()
      WHERE id = $1
    `, [user.tenantId]);

    return NextResponse.json({
      success: true,
      message: 'Tenant upgraded to Pro plan successfully'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
```

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/saas_notes
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=saas_notes
POSTGRES_USER=username
POSTGRES_PASSWORD=password

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h

# Application
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*

# Optional: Email service for user invitations
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Seed Data Script

```sql
-- Insert test tenants
INSERT INTO tenants (id, name, slug, plan, max_notes) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Acme Corporation', 'acme', 'Free', 3),
  ('550e8400-e29b-41d4-a716-446655440002', 'Globex Corporation', 'globex', 'Pro', -1);

-- Insert test users (password hash for 'password')
INSERT INTO users (id, email, password_hash, name, role, tenant_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', 'admin@acme.test', '$2b$10$hash_for_password', 'John Admin', 'Admin', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440012', 'user@acme.test', '$2b$10$hash_for_password', 'Jane Member', 'Member', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440021', 'admin@globex.test', '$2b$10$hash_for_password', 'Bob Admin', 'Admin', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440022', 'user@globex.test', '$2b$10$hash_for_password', 'Alice Member', 'Member', '550e8400-e29b-41d4-a716-446655440002');
```

## Testing Checklist

- [ ] Health endpoint returns 200 OK
- [ ] All test accounts can login successfully
- [ ] Tenant data isolation is enforced
- [ ] Role-based permissions work correctly
- [ ] Free plan note limit is enforced
- [ ] Upgrade removes note limit immediately
- [ ] All CRUD operations work with proper authorization
- [ ] CORS is enabled for API access
- [ ] JWT tokens expire appropriately
- [ ] Error responses are consistent and informative

## Deployment Notes

1. Set up PostgreSQL database with RLS enabled
2. Run migration scripts to create tables and policies
3. Seed database with test data
4. Configure environment variables
5. Deploy to Vercel with proper CORS settings
6. Test all endpoints with automated scripts