# Multi-Tenant SaaS Notes Application

A professional multi-tenant SaaS application for managing notes with role-based access control and subscription management.

## Architecture

### Multi-Tenancy Approach
This application uses a **shared schema with tenant ID column** approach for multi-tenancy:

- **Single Database**: All tenants share the same database instance
- **Tenant Isolation**: Each record includes a `tenantId` field to ensure data isolation
- **Row-Level Security**: Database-level security policies prevent cross-tenant data access
- **Benefits**: Cost-effective, easier maintenance, and simpler deployment
- **Trade-offs**: Requires careful implementation to ensure data isolation

## Architecture

### Multi-Tenancy Approach
This application uses a **shared schema with a tenant ID column** approach for multi-tenancy. Each record in the database has a `tenantId` field to ensure data isolation.

### Technology Stack
- **Frontend**: Next.js 13+ with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes with JWT authentication
- **Database**: MongoDB
- **Deployment**: Vercel
- **Authentication**: JWT-based with role-based access control


## Features

### 🏢 Multi-Tenant Architecture
- Strict tenant data isolation
- Support for multiple organizations (Acme, Globex)
- Tenant-specific branding and configuration

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Member)
- Secure session management

### 📝 Notes Management
- Full CRUD operations for notes
- Tenant-isolated note storage
- Real-time note updates
- Search and filtering capabilities

### 💳 Subscription Management
- Free Plan: Limited to 3 notes
- Pro Plan: Unlimited notes
- Admin-only upgrade functionality
- Real-time limit enforcement

### 🎨 Professional UI/UX
- Modern, responsive design
- Intuitive user interface
- Professional SaaS application feel
- Mobile-friendly layout

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `GET /api/health` - Health check

### Notes Management
- `POST /api/notes` - Create a note
- `GET /api/notes` - List all notes for current tenant
- `GET /api/notes/:id` - Retrieve specific note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note

### Tenant Management
- `POST /api/tenants/:slug/upgrade` - Upgrade tenant subscription (Admin only)
- `POST /api/tenants/:slug/invite` - Invite a new user to the tenant (Admin only)

## Test Accounts

All test accounts use the password: `password`

### Acme Corporation (Free Plan)
- **Admin**: `admin@acme.test`
- **Member**: `user@acme.test`

### Globex Corporation (Pro Plan)
- **Admin**: `admin@globex.test`
- **Member**: `user@globex.test`

## Role Permissions

### Admin
- ✅ Create, view, edit, delete notes
- ✅ Invite users (future feature)
- ✅ Upgrade subscriptions
- ✅ View all tenant notes

### Member
- ✅ Create, view, edit, delete notes
- ❌ Cannot invite users
- ❌ Cannot upgrade subscriptions
- ❌ Can only view own notes

## Subscription Plans

### Free Plan
- Maximum 3 notes per tenant
- Basic note management features
- Upgrade prompt when limit reached

### Pro Plan
- Unlimited notes
- All premium features
- Priority support

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env.local` file:
```env
JWT_SECRET=your-jwt-secret-key
NEXTAUTH_SECRET=your-nextauth-secret
MONGODB_URI=your-mongodb-connection-string
```

### Running Locally
```bash
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```

## Deployment

This application is deployed on Vercel with the following configuration:

1. **Frontend**: Automatically deployed from the main branch
2. **API Routes**: Serverless functions on Vercel
3. **Database**: Supabase PostgreSQL (production)
4. **CORS**: Enabled for automated testing

### Deployment Steps
1. Connect repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

## Security Features

- JWT token-based authentication
- Role-based access control
- Tenant data isolation
- Input validation and sanitization
- CORS configuration for API access
- Secure password handling

## Testing

The application includes comprehensive test coverage for:
- Authentication flows
- Tenant isolation
- Role-based permissions
- Subscription limits
- CRUD operations
- API endpoints

## Future Enhancements

- User invitation system
- Advanced analytics dashboard
- Real-time collaboration
- File attachments
- Advanced search and filtering
- Audit logging
- Multi-language support

## License

MIT License - see LICENSE file for details.