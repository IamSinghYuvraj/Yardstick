'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, LogOut, Settings, User as UserIcon } from 'lucide-react';

// Define types based on the session user object structure
interface User {
  id: string;
  email: string;
  name?: string;
  role: 'Admin' | 'Member';
  tenant: Tenant; // Tenant object is nested within the user object
}

interface Tenant {
  _id: string;
  name: string;
  slug: string;
  plan: 'Free' | 'Pro';
  // Add other tenant properties if they are part of the session user object
  // color?: string; // If tenant color is part of the session, uncomment this
}

interface HeaderProps {
  user: User;
  tenant: Tenant;
  onLogout: () => void;
}

export function Header({ user, tenant, onLogout }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-lg"
              style={{ backgroundColor: '#3B82F6' }} // Placeholder color, ideally from tenant object
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{tenant.name}</h1>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={tenant.plan === 'Pro' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {tenant.plan}
                </Badge>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto p-2">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                      {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium">{user.name || user.email}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-gray-500 font-normal">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
