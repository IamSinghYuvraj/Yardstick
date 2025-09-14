'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, FileText, LogOut, Settings, User as UserIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Define types for User and Tenant based on your session structure
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
    // Add other tenant properties if they are part of the session user object
  };
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  const user = session.user as SessionUser; // Cast session.user to our defined SessionUser type
  const tenant = user.tenant; // Tenant info is directly on the user object from session

  const navigation = [
    { name: 'Notes', href: '/notes', icon: FileText, current: pathname === '/notes' },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, current: pathname === '/dashboard/settings' },
  ];

  if (user.role === 'Admin') {
    navigation.push({ name: 'Invite User', href: '/dashboard/settings', icon: UserIcon, current: pathname === '/dashboard/settings' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r">
        <div className="flex flex-col h-full">
          {/* Tenant Header */}
          <div className="p-6 border-b" style={{ backgroundColor: `#${Math.floor(Math.random()*16777215).toString(16)}10` }}> {/* Placeholder color */} 
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: `#${Math.floor(Math.random()*16777215).toString(16)}` }} // Placeholder color
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{tenant.name}</h2>
                <p className="text-sm text-gray-500">{tenant.slug}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.current
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start h-auto p-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{user.name || user.email}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <Badge 
                          variant={user.role === 'Admin' ? 'default' : 'secondary'}
                          className="text-xs px-1.5 py-0"
                        >
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <main className="py-8 px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
