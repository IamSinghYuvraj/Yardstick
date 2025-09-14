'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InviteUserForm } from '@/components/dashboard/InviteUserForm';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'; // Import DashboardLayout

interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: 'Admin' | 'Member';
  tenant: {
    _id: string;
    name: string;
    slug: string;
    plan: 'Free' | 'Pro';
  };
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as SessionUser | undefined;

  if (status === 'loading' || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout> {/* Wrap content with DashboardLayout */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-500">Manage your tenant and user settings.</p>
        </div>

        {user.role === 'Admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Invite User</CardTitle>
              <CardDescription>Invite a new user to your tenant.</CardDescription>
            </CardHeader>
            <CardContent>
              <InviteUserForm />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
