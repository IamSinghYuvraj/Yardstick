"use client";

"use client";

import { useState, useEffect } from "react"; // Import useEffect
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy } from "lucide-react"; // Import Copy icon

interface InviteUserFormProps {
  tenantSlug: string;
  getAuthHeaders: () => { 'Content-Type': string; 'Authorization': string };
}

export function InviteUserForm({ tenantSlug, getAuthHeaders }: InviteUserFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null); // State for invite link
  const [tenantName, setTenantName] = useState<string>(""); // State for tenant name
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchTenantName = async () => {
      if (!tenantSlug) return;
      try {
        const response = await fetch(`/api/tenants/${tenantSlug}`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setTenantName(data.tenant.name);
        } else {
          console.error("Failed to fetch tenant name:", data.error);
        }
      } catch (error) {
        console.error("Error fetching tenant name:", error);
      }
    };
    fetchTenantName();
  }, [tenantSlug, getAuthHeaders]);

  const handleCopyLink = () => {
    if (inviteLink && tenantName) {
      const fullLink = `You've been invited to join ${tenantName}! Click here to sign up: ${inviteLink}`;
      navigator.clipboard.writeText(fullLink);
      toast({
        title: "Link copied!",
        description: "The invitation link has been copied to your clipboard.",
      });
    } else {
      toast({
        title: "Error",
        description: "No invitation link to copy.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setInviteLink(null); // Clear previous link

    try {
      const response = await fetch(`/api/tenants/${tenantSlug}/invite`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteLink(data.inviteLink); // Store the invite link
        toast({
          title: "Invitation link created!",
          description: `A new invitation link has been generated for ${email}.`,
        });
        setEmail("");
        router.refresh();
      } else if (response.status === 409) {
        toast({
          title: "Invitation Failed",
          description: data.error || "A user with this email already exists or has a pending invitation.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to create invitation link.",
          description: data.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating invitation link:", error);
      toast({
        title: "Error",
        description: "Could not connect to the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a User</CardTitle>
        <CardDescription>
          Generate an invitation link for a new user to join your tenant.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Generating Link..." : "Generate Invitation Link"}
          </Button>
        </form>

        {inviteLink && (
          <div className="mt-4 space-y-2">
            <Label htmlFor="invite-link">Invitation Link</Label>
            <div className="flex space-x-2">
              <Input id="invite-link" type="text" value={inviteLink} readOnly className="flex-grow" />
              <Button onClick={handleCopyLink} type="button" variant="secondary" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-500">Share this link with the user to invite them to your tenant.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}