// app/dashboard/settings/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, User as UserIcon, Trash2, Shield, Bell } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { InviteUserForm } from '@/components/dashboard/InviteUserForm';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { UserPlanForm } from '@/components/dashboard/UserPlanForm';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'Admin' | 'Member';
  plan: 'Free' | 'Pro';
  tenant: {
    _id: string;
    name: string;
    slug: string;
  };
}

interface TenantUser {
  id: string;
  email: string;
  role: 'Admin' | 'Member';
  plan: 'Free' | 'Pro';
  createdAt: string;
  updatedAt: string;
}

interface UpgradeRequest {
  _id: string;
  user: {
    _id: string;
    email: string;
    name?: string;
  };
  tenant: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notesCount, setNotesCount] = useState<number | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, []);

  const fetchNotesCount = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/notes-count`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setNotesCount(data.notesCount);
      } else {
        toast({
          title: "Error fetching notes count",
          description: data.message || "Failed to load notes count.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching notes count:", error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the server to fetch notes count.",
        variant: "destructive",
      });
    }
  }, [getAuthHeaders, toast]);

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

  const fetchUpgradeRequests = useCallback(async (tenantSlug: string) => {
    try {
      const response = await fetch(`/api/tenants/${tenantSlug}/upgrade-requests`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUpgradeRequests(data.requests);
      } else {
        toast({
          title: "Error fetching upgrade requests",
          description: data.error || "Failed to load upgrade requests.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching upgrade requests:", error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the server to fetch upgrade requests.",
        variant: "destructive",
      });
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
        if (parsedUser.role === 'Admin') {
          fetchTenantUsers(parsedUser.tenant.slug);
          fetchUpgradeRequests(parsedUser.tenant.slug);
        }
        fetchNotesCount(parsedUser.id);
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
      router.push('/login');
    }
  }, [router, fetchTenantUsers, fetchUpgradeRequests, fetchNotesCount]);

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

  const handlePlanChangeSuccess = (userId: string, newPlan: 'Free' | 'Pro') => {
    setTenantUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, plan: newPlan } : user
      )
    );
    if (userId === currentUser?.id) {
      const updatedUser = { ...currentUser, plan: newPlan };
      setCurrentUser(updatedUser as User);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const handleApproveRequest = async (request: UpgradeRequest) => {
    if (!currentUser || !currentUser.tenant?.slug) return;

    setSubmitting(true);
    try {
      // 1. Update user's plan
      const planResponse = await fetch(`/api/tenants/${currentUser.tenant.slug}/users/${request.user._id}/plan`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan: 'Pro' }),
      });
      const planData = await planResponse.json();

      if (!planResponse.ok) {
        throw new Error(planData.error || 'Failed to update user plan.');
      }

      // 2. Update request status
      const requestResponse = await fetch(`/api/upgrade-requests/${request._id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'approved' }),
      });
      const requestData = await requestResponse.json();

      if (!requestResponse.ok) {
        throw new Error(requestData.error || 'Failed to update request status.');
      }

      toast({
        title: "Upgrade Approved",
        description: `${request.user.email}'s plan has been upgraded to Pro.`,
      });

      // 3. Refresh data
      fetchUpgradeRequests(currentUser.tenant.slug);
      fetchTenantUsers(currentUser.tenant.slug);

    } catch (error: any) {
      console.error("Error approving request:", error);
      toast({
        title: "Failed to approve request",
        description: error.message || "An unexpected error occurred.",
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

        {currentUser.role === 'Admin' && currentUser.tenant?.slug && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Upgrade Requests</span>
                </CardTitle>
                <CardDescription>Approve or reject upgrade requests from your team members.</CardDescription>
              </CardHeader>
              <CardContent>
                {upgradeRequests.length === 0 ? (
                  <p className="text-gray-500">No pending upgrade requests.</p>
                ) : (
                  <div className="space-y-4">
                    {upgradeRequests.map((request) => (
                      <div key={request._id} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex flex-col">
                          <span className="font-medium">{request.user.email}</span>
                          <span className="text-sm text-gray-500">Requested on {new Date(request.createdAt).toLocaleDateString()}</span>
                        </div>
                        <Button onClick={() => handleApproveRequest(request)} disabled={submitting}>
                          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Approve'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            <InviteUserForm tenantSlug={currentUser.tenant.slug} getAuthHeaders={getAuthHeaders} onInviteSuccess={() => fetchTenantUsers(currentUser.tenant.slug)} />

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserIcon className="h-5 w-5" />
                  <span>Team Members</span>
                </CardTitle>
                <CardDescription>Manage plans for members in your organization.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : tenantUsers.length === 0 ? (
                  <p className="text-gray-500">No members found in your organization.</p>
                ) : (
                  <div className="space-y-4">
                    {tenantUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex flex-col">
                          <span className="font-medium">{user.email}</span>
                          <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'} className="w-fit mt-1">
                            {user.role}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <UserPlanForm
                            userId={user.id}
                            currentPlan={user.plan}
                            tenantSlug={currentUser.tenant.slug}
                            onPlanChange={handlePlanChangeSuccess}
                          />
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
                                  This action cannot be undone. This will permanently remove
                                  <span className="font-bold"> {user.email} </span>
                                  from your organization.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.email)}>
                                  Continue
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
                <Label className="text-sm font-medium text-gray-700">Notes Created</Label>
                <p className="text-gray-900">{notesCount !== null ? notesCount : 'Loading...'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Account Plan</Label>
                <Badge variant={currentUser.plan === 'Pro' ? 'default' : 'secondary'}>
                  {currentUser.plan}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>Perform actions related to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

const handleSignOut = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};