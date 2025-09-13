import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Shield, Database } from 'lucide-react';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account and tenant settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Tenant Information</span>
              </CardTitle>
              <CardDescription>Your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-500">Organization</div>
                <div className="text-lg">Multi-tenant enabled</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Data Isolation</div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Shield className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Role Management</span>
              </CardTitle>
              <CardDescription>Access control and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-500">Available Roles</div>
                <div className="flex space-x-2 mt-1">
                  <Badge>Admin</Badge>
                  <Badge variant="secondary">Member</Badge>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Permissions</div>
                <div className="text-sm text-gray-600">Role-based access control enabled</div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Data Storage</span>
              </CardTitle>
              <CardDescription>Information about your data storage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Production Ready Setup</h4>
                <p className="text-blue-800 text-sm mb-3">
                  This demo uses localStorage for data persistence. For production deployment, 
                  the application is designed to work seamlessly with Supabase for:
                </p>
                <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
                  <li>PostgreSQL database with multi-tenant architecture</li>
                  <li>Row-level security (RLS) for data isolation</li>
                  <li>Built-in authentication and user management</li>
                  <li>Real-time subscriptions and scalable infrastructure</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}