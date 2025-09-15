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
  onInviteSuccess?: () => void;
}



export function InviteUserForm({ tenantSlug, getAuthHeaders, onInviteSuccess }: InviteUserFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  

  

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
        if (onInviteSuccess) {
          onInviteSuccess();
        }
        
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

      
  </div>
  );
}