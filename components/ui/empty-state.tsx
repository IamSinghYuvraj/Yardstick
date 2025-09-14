import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react'; // Import LucideIcon type
import React from 'react'; // Import React for React.ElementType

interface EmptyStateProps {
  icon: React.ElementType; // Use React.ElementType for a generic component type
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed border-2 border-gray-200', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-4 max-w-sm">{description}</p>
        {action && (
          <Button onClick={action.onClick} className="bg-blue-600 hover:bg-blue-700">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}