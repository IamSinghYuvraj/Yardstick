// app/dashboard/settings/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, User as UserIcon, Trash2, Crown, Zap } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { InviteUserForm } from '@/components/dashboard/InviteUserForm'; // Import the InviteUserForm
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  const [upgradingTenant, setUpgradingTenant] = useState(false);

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
          title: "Error fetching users.",
          description: data.error || "Failed to load tenant users.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching tenant users:", error);
      toast({
        title: "Error",
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

    // Prevent changing a 'User' role to 'Admin' (enforced by backend, but good to have frontend check)
    const userToUpdate = tenantUsers.find(u => u.id === userId);
    if (userToUpdate?.role === 'Member' && newRole === 'Admin') {
      toast({
        title: "Permission Denied",
        description: "Cannot promote a user to Admin through this interface.",
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
          title: "User role updated.",
          description: `${data.user.email}'s role changed to ${newRole}.`, // Updated toast message
        });
        fetchTenantUsers(currentUser.tenant.slug); // Refresh the list

        // This block is technically unreachable due to the 'cannot change own role' check above,
        // but kept for completeness if logic changes.
        if (currentUser.id === userId) {
          const updatedCurrentUser = {
            ...currentUser,
            role: newRole,
          };
          setCurrentUser(updatedCurrentUser);
          localStorage.setItem('user', JSON.stringify(updatedCurrentUser));
        }

      } else {
        toast({
          title: "Failed to update role.",
          description: data.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "Error",
        description: "Could not connect to the server to update role.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
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
          title: "User deleted.",
          description: data.message,
        });
        fetchTenantUsers(currentUser.tenant.slug); // Refresh the list
      } else {
        toast({
          title: "Failed to delete user.",
          description: data.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Could not connect to the server to delete user.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTenantPlanChange = async (newPlan: 'Free' | 'Pro') => {
    if (!currentUser || currentUser.role !== 'Admin' || !currentUser.tenant?.slug) return;
    setSubmitting(true); // Use submitting for general plan changes
    try {
      const response = await fetch(`/api/tenants/${currentUser.tenant.slug}/upgrade`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan: newPlan }), // Send the new plan
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update user data in localStorage and state
        const updatedUser = {
          ...currentUser,
          tenant: { ...currentUser.tenant, plan: newPlan }
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast({
          title: "Tenant Plan Updated!",
          description: `Your tenant has been successfully changed to the ${newPlan} plan.`,
        });
      } else {
        toast({
          title: "Plan Change Failed",
          description: data.error || `Failed to change tenant plan to ${newPlan}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error changing tenant plan:', error);
      toast({
        title: "Error",
        description: "Could not connect to the server to change tenant plan.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Refactor handleTenantUpgrade to use handleTenantPlanChange
  const handleTenantUpgrade = () => handleTenantPlanChange('Pro');

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
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-500">Manage your tenant and user settings.</p>
        </div>

        {currentUser.role === 'Admin' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Tenant Plan</CardTitle>
                <CardDescription>Manage your tenant's subscription plan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Current Plan</Label>
                    <p className="text-sm text-gray-600">{currentUser.tenant.plan}</p>
                  </div>
                  <Select
                    value={currentUser.tenant.plan}
                    onValueChange={(newPlan: 'Free' | 'Pro') => handleTenantPlanChange(newPlan)}
                    disabled={submitting} // Use submitting state
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Free">Free</SelectItem>
                      <SelectItem value="Pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Separator />

            <InviteUserForm tenantSlug={currentUser.tenant.slug} getAuthHeaders={getAuthHeaders} /> {/* Use the dedicated InviteUserForm component */}

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle>Tenant Users</CardTitle>
                <CardDescription>Manage users within your tenant.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="ml-2">Loading users...</span>
                  </div>
                ) : tenantUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No users found in this tenant.</p>
                ) : (
                  <div className="space-y-4">
                    {tenantUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center space-x-3">
                          <UserIcon className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{user.email}</p>
                            <p className="text-sm text-gray-500">{user.role}</p> {/* Display actual role */}
                          </div>
                        </div>
                        {currentUser.id !== user.id && ( // Cannot change own role or delete self
                          <div className="flex items-center space-x-2">
                            <Select
                              value={user.role}
                              onValueChange={(newRole: 'Admin' | 'Member') => handleRoleChange(user.id, newRole)}
                              disabled={submitting}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Member">Member</SelectItem> {/* Display Member, send Member */}
                                <SelectItem value="Admin">Admin</SelectItem> {/* Display Admin, send Admin */}
                              </SelectContent>
                            </Select>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" disabled={submitting}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete {user.email} and remove their data from our servers.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-500 hover:bg-red-600">
                                    Delete
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

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and tenant information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <p className="text-sm text-gray-600">{currentUser.email}</p>
              </div>
              <div>
                <Label>Role</Label> {/* Changed label to Role */}
                <p className="text-sm text-gray-600">{currentUser.role}</p> {/* Display actual role */}
              </div>
              <div>
                <Label>Tenant</Label>
                <p className="text-sm text-gray-600">{currentUser.tenant.name}</p>
              </div>
              <div>
                <Label>Plan</Label>
                <p className="text-sm text-gray-600">{currentUser.tenant.plan}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}