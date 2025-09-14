"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Removed Select import

export function InviteUserForm() {
  const [email, setEmail] = useState("");
  // const [role, setRole] = useState<"Member" | "Admin">("Member"); // State for role removed
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/tenants/${slug}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }), // Removed role from the body
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Invitation sent successfully!",
          description: `An invitation has been sent to ${email}.`,
        });
        setEmail("");
        // setRole("Member"); // Reset role after sending removed
        router.refresh();
      } else {
        toast({
          title: "Failed to send invitation.",
          description: data.error || "An unexpected error occurred.", // Use data.error for consistency
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
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
          Invite a new user to your tenant.
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
          {/* Role selection removed */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Inviting..." : "Invite User"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}