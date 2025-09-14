// app/dashboard/settings/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, User as UserIcon, Trash2, Crown, Shield } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { InviteUserForm } from '@/components/dashboard/InviteUserForm';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

interface User {
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

interface TenantUser {
  id: string;
  email: string;
  role: 'Admin' | 'Member';
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  const fetchTenantUsers = useCallback(async (tenantSlug: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tenants/${tenantSlug}/users`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTenantUsers(data.users);
      } else {
        toast({
          title: "Error fetching users",
          description: data.error || "Failed to load tenant users.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching tenant users:", error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the server to fetch users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, toast]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData) as User;
      setCurrentUser(parsedUser);
      if (parsedUser.tenant?.slug) {
        fetchTenantUsers(parsedUser.tenant.slug);
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
      router.push('/login');
    }
  }, [router, fetchTenantUsers]);

  const handleRoleChange = async (userId: string, newRole: 'Admin' | 'Member') => {
    if (!currentUser || currentUser.role !== 'Admin' || !currentUser.tenant?.slug) return;

    // Prevent admin from changing their own role
    if (currentUser.id === userId) {
      toast({
        title: "Permission Denied",
        description: "You cannot change your own role.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/tenants/${currentUser.tenant.slug}/users/${userId}/role`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "Role updated successfully",
          description: `${data.user.email}'s role has been changed to ${newRole}.`,
        });
        fetchTenantUsers(currentUser.tenant.slug);
      } else {
        toast({
          title: "Failed to update role",
          description: data.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the server to update role.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!currentUser || currentUser.role !== 'Admin' || !currentUser.tenant?.slug) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/tenants/${currentUser.tenant.slug}/users/${userId}/role`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: "User removed successfully",
          description: `${userEmail} has been removed from your organization.`,
        });
        fetchTenantUsers(currentUser.tenant.slug);
      } else {
        toast({
          title: "Failed to remove user",
          description: data.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the server to remove user.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTenantPlanChange = async (newPlan: 'Free' | 'Pro') => {
    if (!currentUser || currentUser.role !== 'Admin' || !currentUser.tenant?.slug) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/tenants/${currentUser.tenant.slug}/upgrade`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan: newPlan }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const updatedUser = {
          ...currentUser,
          tenant: { ...currentUser.tenant, plan: newPlan }
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast({
          title: "Plan updated successfully!",
          description: `Your organization has been successfully changed to the ${newPlan} plan.`,
        });
      } else {
        toast({
          title: "Plan change failed",
          description: data.error || `Failed to change plan to ${newPlan}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error changing tenant plan:', error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the server to change plan.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your organization and user settings</p>
        </div>

        {/* Organization Plan */}
        {currentUser.role === 'Admin' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5" />
                  <span>Organization Plan</span>
                </CardTitle>
                <CardDescription>Manage your organization's subscription plan and features.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base">Current Plan</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant={currentUser.role === 'Admin' ? 'default' : 'secondary'}>
                    {currentUser.role === 'Admin' ? (
                      <><Shield className="w-3 h-3 mr-1" /> Admin</>
                    ) : (
                      <><UserIcon className="w-3 h-3 mr-1" /> Member</>
                    )}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Organization</Label>
                <p className="text-gray-900">{currentUser.tenant.name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Plan</Label>
                <Badge variant={currentUser.tenant.plan === 'Pro' ? 'default' : 'secondary'}>
                  {currentUser.tenant.plan}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}={currentUser.tenant.plan === 'Pro' ? 'default' : 'secondary'}>
                        {currentUser.tenant.plan}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {currentUser.tenant.plan === 'Pro' 
                          ? 'Unlimited notes and features' 
                          : 'Limited to 3 notes'
                        }
                      </span>
                    </div>
                  </div>
                  <Select
                    value={currentUser.tenant.plan}
                    onValueChange={(newPlan: 'Free' | 'Pro') => handleTenantPlanChange(newPlan)}
                    disabled={submitting}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Free">Free Plan</SelectItem>
                      <SelectItem value="Pro">Pro Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Invite Users */}
            <InviteUserForm tenantSlug={currentUser.tenant.slug} getAuthHeaders={getAuthHeaders} />

            <Separator />

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserIcon className="h-5 w-5" />
                  <span>Team Members</span>
                </CardTitle>
                <CardDescription>Manage users and permissions within your organization.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-gray-500">Loading team members...</span>
                  </div>
                ) : tenantUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <UserIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No team members found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tenantUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.email[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.email}</p>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={user.role === 'Admin' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {user.role === 'Admin' ? (
                                  <><Shield className="w-3 h-3 mr-1" /> Admin</>
                                ) : (
                                  <><UserIcon className="w-3 h-3 mr-1" /> Member</>
                                )}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {user.id === currentUser.id && '(You)'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {currentUser.id !== user.id && (
                          <div className="flex items-center space-x-2">
                            <Select
                              value={user.role}
                              onValueChange={(newRole: 'Admin' | 'Member') => handleRoleChange(user.id, newRole)}
                              disabled={submitting}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Member">Member</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon" disabled={submitting}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove <strong>{user.email}</strong> from your organization? 
                                    This action cannot be undone and they will lose access to all shared data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteUser(user.id, user.email)} 
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Remove User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />
          </>
        )}

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your personal account details and organization information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Email Address</Label>
                <p className="text-gray-900">{currentUser.email}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Role</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant