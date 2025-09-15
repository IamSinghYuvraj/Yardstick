// components/dashboard/UserPlanForm.tsx
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface UserPlanFormProps {
  userId: string;
  currentPlan: 'Free' | 'Pro';
  tenantSlug: string;
  onPlanChange: (userId: string, newPlan: 'Free' | 'Pro') => void;
}

export function UserPlanForm({ userId, currentPlan, tenantSlug, onPlanChange }: UserPlanFormProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlanChange = async () => {
    if (selectedPlan === currentPlan) {
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tenants/${tenantSlug}/users/${userId}/plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Plan updated successfully',
          description: `User's plan has been changed to ${selectedPlan}.`,
        });
        onPlanChange(userId, selectedPlan);
      } else {
        toast({
          title: 'Failed to update plan',
          description: data.error || 'An unexpected error occurred.',
          variant: 'destructive',
        });
        // Revert selection on failure
        setSelectedPlan(currentPlan);
      }
    } catch (error) {
      console.error('Error updating user plan:', error);
      toast({
        title: 'Connection Error',
        description: 'Could not connect to the server to update plan.',
        variant: 'destructive',
      });
      setSelectedPlan(currentPlan);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Badge variant={selectedPlan === 'Pro' ? 'default' : 'secondary'} className="min-w-[60px] justify-center">
        {selectedPlan}
      </Badge>
      <Select
        value={selectedPlan}
        onValueChange={(newPlan: 'Free' | 'Pro') => setSelectedPlan(newPlan)}
        disabled={isSubmitting}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Select plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Free">Free</SelectItem>
          <SelectItem value="Pro">Pro</SelectItem>
        </SelectContent>
      </Select>
      <Button 
        onClick={handlePlanChange} 
        disabled={isSubmitting || selectedPlan === currentPlan}
        size="sm"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
      </Button>
    </div>
  );
}