// components/dashboard/InviteUserForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Copy, Mail, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface InviteUserFormProps {
  tenantSlug: string;
  getAuthHeaders: () => { 'Content-Type': string; 'Authorization': string };
}

interface PendingInvite {
  id: string;
  email: string;
  token: string;
  expires: string;
  createdAt: string;
  status: string;
}

export function InviteUserForm({ tenantSlug, getAuthHeaders }: InviteUserFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string>("");
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadPendingInvites();
  }, [tenantSlug]);

  const loadPendingInvites = async () => {
    if (!tenantSlug) return;
    
    setLoadingInvites(true);
    try {
      const response = await fetch(`/api/tenants/${tenantSlug}/invite`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setPendingInvites(data.invites || []);
        if (data.invites?.length > 0) {
          // Assuming we can get tenant name from the first invite or make a separate call
          setTenantName(data.tenantName || tenantSlug);
        }
      } else {
        console.error("Failed to load pending invites:", data.error);
      }
    } catch (error) {
      console.error("Error loading pending invites:", error);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleCopyLink = (link: string) => {
    if (link && tenantName) {
      const message = `You've been invited to join ${tenantName}! Click here to create your account: ${link}`;
      navigator.clipboard.writeText(message);
      toast({
        title: "Invitation link copied!",
        description: "The invitation message has been copied to your clipboard.",
      });
    }
  };

  const handleRevokeInvite = async (inviteId: string, inviteEmail: string) => {
    try {
      const response = await fetch(`/api/tenants/${tenantSlug}/invites/${inviteId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Invitation revoked",
          description: data.message,
        });
        loadPendingInvites(); // Refresh the list
      } else {
        toast({
          title: "Failed to revoke invitation",
          description: data.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error revoking invite:", error);
      toast({
        title: "Error",
        description: "Could not connect to the server.",
        variant: "destructive",
      });
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setInviteLink(null);
    setError("");

    if (!email) {
      setError("Email address is required");
      setIsLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/tenants/${tenantSlug}/invite`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInviteLink(data.inviteLink);
        setTenantName(data.tenantName);
        toast({
          title: "Invitation link created!",
          description: `A new invitation link has been generated for ${email}.`,
        });
        setEmail("");
        loadPendingInvites(); // Refresh pending invites
      } else {
        const errorMessage = data.error || "An unexpected error occurred.";
        setError(errorMessage);
        toast({
          title: "Failed to create invitation",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating invitation link:", error);
      const errorMessage = "Could not connect to the server.";
      setError(errorMessage);
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite a User</CardTitle>
          <CardDescription>
            Generate an invitation link for a new user to join your tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Generating Link..." : "Generate Invitation Link"}
            </Button>
          </form>

          {inviteLink && (
            <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <Label className="text-green-800 font-medium">Invitation Link Created</Label>
              </div>
              <div className="flex space-x-2">
                <Input 
                  type="text" 
                  value={inviteLink} 
                  readOnly 
                  className="flex-grow bg-white" 
                />
                <Button 
                  onClick={() => handleCopyLink(inviteLink)} 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  className="border-green-300 hover:bg-green-100"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-green-700">
                Share this link with the user to invite them to your organization. The link will expire in 7 days.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            Manage pending user invitations to your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvites ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Loading pending invitations...</div>
            </div>
          ) : pendingInvites.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div 
                  key={invite.id} 
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{invite.email}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          Expires {formatDistanceToNow(new Date(invite.expires), { addSuffix: true })}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {invite.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => {
                        const baseUrl = window.location.origin;
                        const link = `${baseUrl}/signup?inviteToken=${invite.token}`;
                        handleCopyLink(link);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Link
                    </Button>
                    <Button
                      onClick={() => handleRevokeInvite(invite.id, invite.email)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}